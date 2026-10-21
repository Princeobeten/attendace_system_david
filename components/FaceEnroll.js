"use client";

import { useEffect, useRef, useState } from "react";
import { useWebcam } from "@/lib/useWebcam";
import { loadModels, detectFaces, cropFace, euclidean, engineInfo } from "@/lib/faceapi";

const REQUIRED_SAMPLES = 3;
/** Pause between automatic samples so they differ slightly in pose. */
const SAMPLE_GAP_MS = 600;
/** Faces narrower than this share of the frame are too far away to enrol. */
const MIN_FACE_RATIO = 0.08;
/** Samples further apart than this cannot be the same person. */
const SAME_PERSON_DISTANCE = 0.6;

const POSE_HINTS = [
  "Look straight at the camera",
  "Turn your head slightly to the left",
  "Turn your head slightly to the right",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Automatic face enrolment: once the camera is on, three samples are taken
 * by themselves as soon as a face is in view — no button to press per sample.
 * Lighting is corrected frame by frame, and on-screen guidance explains what
 * the camera is waiting for.
 *
 * `locked` (a message) keeps the camera off until the admin has completed the
 * identity check.
 */
export default function FaceEnroll({ onChange, initialCount = 0, locked = "" }) {
  const { videoRef, ready, error, start, stop, devices, deviceId, setDeviceId } =
    useWebcam();
  const canvasRef = useRef(null);
  const samplesRef = useRef([]);
  const [status, setStatus] = useState("Loading face recognition models…");
  const [modelsReady, setModelsReady] = useState(false);
  const [engine, setEngine] = useState(null);
  const [running, setRunning] = useState(false);
  const [samples, setSamples] = useState([]); // { descriptor, thumb }
  const [hint, setHint] = useState("");
  const [lighting, setLighting] = useState("");
  const [elapsed, setElapsed] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadModels((s) => !cancelled && setStatus(s))
      .then(() => {
        if (cancelled) return;
        setModelsReady(true);
        setEngine(engineInfo());
        setStatus("Ready");
      })
      .catch((err) => !cancelled && setStatus(`Model load failed: ${err.message}`));
    return () => {
      cancelled = true;
    };
  }, []);

  // The automatic capture loop.
  useEffect(() => {
    if (!running || !ready || !modelsReady) return;
    let cancelled = false;

    (async () => {
      let lastSample = 0;
      let firstSeen = null;
      const searchStarted = performance.now();

      while (!cancelled) {
        const loopStart = performance.now();
        const video = videoRef.current;
        if (!video || video.readyState < 2) {
          await sleep(100);
          continue;
        }

        let result;
        try {
          result = await detectFaces(video, { thorough: true });
        } catch (err) {
          setHint(`Detection error: ${err.message}`);
          await sleep(500);
          continue;
        }
        if (cancelled) break;

        setLighting(
          !result.corrected
            ? ""
            : result.luminance < 95
              ? "Low light — the image is being brightened automatically."
              : "Very bright light — the image is being toned down automatically."
        );

        const faces = [...result.faces].sort((a, b) => b.box.width - a.box.width);
        const face = faces[0];
        draw(face?.box, face && face.box.width / video.videoWidth >= MIN_FACE_RATIO);

        if (!face) {
          setHint(
            performance.now() - searchStarted > 6000
              ? "Still no face found. Move closer and keep the whole face inside the frame."
              : "Looking for a face — look straight at the camera."
          );
        } else if (faces[1] && faces[1].box.width > face.box.width * 0.7) {
          setHint("More than one face in view — only the student should face the camera.");
        } else if (face.box.width / video.videoWidth < MIN_FACE_RATIO) {
          setHint("Face found — please move a little closer to the camera.");
        } else if (performance.now() - lastSample >= SAMPLE_GAP_MS) {
          firstSeen ??= performance.now();
          const current = samplesRef.current;

          // Guard against a different person stepping in mid-enrolment.
          if (current.length && euclidean(current[0].descriptor, face.descriptor) > SAME_PERSON_DISTANCE) {
            samplesRef.current = [];
            setSamples([]);
            setHint("A different face appeared — starting again.");
            lastSample = performance.now();
            continue;
          }

          const next = [...current, { descriptor: face.descriptor, thumb: cropFace(video, face.box) }];
          samplesRef.current = next;
          setSamples(next);
          lastSample = performance.now();

          if (next.length >= REQUIRED_SAMPLES) {
            setElapsed(((performance.now() - firstSeen) / 1000).toFixed(1));
            setHint("Done — face captured.");
            draw(null);
            onChange?.(next.map((s) => s.descriptor), next[0].thumb);
            setRunning(false);
            stop();
            break;
          }
          setHint(`Captured ${next.length} of ${REQUIRED_SAMPLES} — ${POSE_HINTS[next.length].toLowerCase()}.`);
        }

        // Aim for roughly 6–8 checks a second without starving slower PCs.
        await sleep(Math.max(0, 140 - (performance.now() - loopStart)));
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, ready, modelsReady]);

  function draw(box, good) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!box) return;
    ctx.strokeStyle = good ? "#22c55e" : "#f59e0b";
    ctx.lineWidth = Math.max(3, canvas.width / 200);
    ctx.strokeRect(box.x, box.y, box.width, box.height);
  }

  async function begin() {
    samplesRef.current = [];
    setSamples([]);
    setElapsed(null);
    setHint("Starting camera…");
    onChange?.([], "");
    await start();
    setRunning(true);
  }

  function halt() {
    setRunning(false);
    stop();
    setHint("");
    draw(null);
  }

  const done = samples.length >= REQUIRED_SAMPLES;
  const percent = Math.round((samples.length / REQUIRED_SAMPLES) * 100);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-semibold text-slate-900">Face capture</h2>
          <p className="text-xs text-slate-500">
            Automatic — {REQUIRED_SAMPLES} samples are taken as soon as a face is in view.
            {initialCount > 0 && ` ${initialCount} sample(s) already stored; capturing replaces them.`}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            done ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
          }`}
        >
          {samples.length}/{REQUIRED_SAMPLES}
        </span>
      </div>

      <div className="p-5">
        <div className="relative overflow-hidden rounded-xl bg-slate-900">
          <video
            ref={videoRef}
            playsInline
            muted
            className="mirror aspect-video w-full object-cover"
          />
          <canvas
            ref={canvasRef}
            className="mirror pointer-events-none absolute inset-0 h-full w-full"
          />

          {!running && !done && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/90 p-6 text-center">
              <p className="max-w-sm text-sm text-slate-300">
                {/* Show engine progress first, so the admin can open this page early and watch it get ready. */}
                {!modelsReady ? status : locked || error || "The camera is off."}
              </p>
              <button
                type="button"
                onClick={begin}
                disabled={!modelsReady || Boolean(locked)}
                className="btn-primary"
              >
                {modelsReady ? "Start face capture" : "Preparing…"}
              </button>
            </div>
          )}

          {done && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-emerald-900/85 p-6 text-center text-white">
              <span className="text-4xl">✓</span>
              <p className="font-semibold">Face captured{elapsed ? ` in ${elapsed} s` : ""}</p>
              <p className="text-sm text-emerald-100">Save to store the face template.</p>
            </div>
          )}

          {running && (
            <>
              <span className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                AUTO CAPTURE
              </span>
              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-900 to-transparent px-4 pb-3 pt-6">
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="text-center text-sm font-medium text-white">{hint}</p>
              </div>
            </>
          )}
        </div>

        {lighting && running && (
          <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">{lighting}</p>
        )}

        {devices.length > 1 && (
          <select
            className="input mt-3"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
          >
            <option value="">Default camera</option>
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || "Camera"}
              </option>
            ))}
          </select>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {running && (
            <button type="button" onClick={halt} className="btn-ghost">
              Stop
            </button>
          )}
          {done && (
            <button type="button" onClick={begin} className="btn-ghost">
              Retake
            </button>
          )}
          {samples.length > 0 && (
            <div className="flex gap-2">
              {samples.map((s, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={s.thumb}
                  alt={`Sample ${i + 1}`}
                  className="h-12 w-12 rounded-lg object-cover ring-2 ring-emerald-400"
                />
              ))}
            </div>
          )}
        </div>

        {engine && (
          <p className={`mt-3 text-xs ${engine.accelerated ? "text-slate-400" : "text-amber-700"}`}>
            {engine.accelerated
              ? "Face engine: GPU-accelerated."
              : "Face engine: CPU mode — capture will be slower. Turn on hardware acceleration in the browser settings for best speed."}
          </p>
        )}
      </div>
    </div>
  );
}
