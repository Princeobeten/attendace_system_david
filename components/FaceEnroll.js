"use client";

import { useEffect, useRef, useState } from "react";
import { useWebcam } from "@/lib/useWebcam";
import { loadModels, detectSingleFace, cropFace } from "@/lib/faceapi";

const REQUIRED_SAMPLES = 3;

const POSE_HINTS = [
  "Look straight at the camera",
  "Turn your head slightly to the left",
  "Turn your head slightly to the right",
];

/**
 * Face enrolment: capture several samples of one student's face and hand the
 * resulting descriptors back to the parent form.
 *
 * Multiple samples at slightly different angles make recognition far more
 * tolerant of head pose in the classroom, which the literature identifies as
 * a common failure mode of single-template systems.
 */
export default function FaceEnroll({ onChange, initialCount = 0 }) {
  const { videoRef, ready, error, start, stop, devices, deviceId, setDeviceId } =
    useWebcam();
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("Loading face recognition models…");
  const [modelsReady, setModelsReady] = useState(false);
  const [samples, setSamples] = useState([]); // { descriptor, thumb }
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadModels((s) => !cancelled && setStatus(s))
      .then(() => {
        if (cancelled) return;
        setModelsReady(true);
        setStatus("Models ready");
      })
      .catch((err) => !cancelled && setStatus(`Model load failed: ${err.message}`));
    return () => {
      cancelled = true;
    };
  }, []);

  async function capture() {
    if (!videoRef.current || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const face = await detectSingleFace(videoRef.current);
      if (!face) {
        setMessage("No face detected — move closer and make sure the room is lit.");
        return;
      }
      if (face.score < 0.6) {
        setMessage("Face is unclear. Improve the lighting and try again.");
        return;
      }
      const thumb = cropFace(videoRef.current, face.box);
      const next = [...samples, { descriptor: face.descriptor, thumb }];
      setSamples(next);
      // Hand the descriptors straight to the parent form.
      onChange?.(next.map((s) => s.descriptor), next[0].thumb);
      drawBox(face.box);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  function drawBox(box) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 4;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    setTimeout(() => ctx.clearRect(0, 0, canvas.width, canvas.height), 600);
  }

  const done = samples.length >= REQUIRED_SAMPLES;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-semibold text-slate-900">Face enrolment</h2>
          <p className="text-xs text-slate-500">
            Capture {REQUIRED_SAMPLES} samples. {initialCount > 0 &&
              `${initialCount} sample(s) already stored — capturing replaces them.`}
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

          {!ready && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/90 p-6 text-center">
              <p className="text-sm text-slate-300">
                {error || "The camera is off."}
              </p>
              <button
                type="button"
                onClick={start}
                disabled={!modelsReady}
                className="btn-primary"
              >
                {modelsReady ? "Turn on camera" : status}
              </button>
            </div>
          )}

          {ready && !done && (
            <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900 to-transparent px-4 py-3 text-center text-sm font-medium text-white">
              {POSE_HINTS[samples.length] || "Look at the camera"}
            </p>
          )}
        </div>

        {devices.length > 1 && ready && (
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

        {message && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {message}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={capture}
            disabled={!ready || !modelsReady || busy || done}
            className="btn-primary"
          >
            {busy ? "Analysing…" : done ? "All samples captured" : "Capture sample"}
          </button>
          {samples.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSamples([]);
                onChange?.([], "");
              }}
              className="btn-ghost"
            >
              Clear samples
            </button>
          )}
          {ready && (
            <button type="button" onClick={stop} className="btn-ghost">
              Turn off camera
            </button>
          )}
        </div>

        {samples.length > 0 && (
          <div className="mt-4 flex gap-3">
            {samples.map((s, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={s.thumb}
                alt={`Sample ${i + 1}`}
                className="h-16 w-16 rounded-lg object-cover ring-2 ring-emerald-400"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
