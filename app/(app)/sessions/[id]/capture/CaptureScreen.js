"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, formatTime } from "@/lib/client";
import { useWebcam } from "@/lib/useWebcam";
import { loadModels, detectAllFaces, engineInfo } from "@/lib/faceapi";
import { Avatar, Badge } from "@/components/ui";

/** How often a frame is analysed. Lower = more responsive, more CPU. */
const SCAN_INTERVAL_MS = 900;

export default function CaptureScreen({ sessionId }) {
  const router = useRouter();
  const { videoRef, ready, error: camError, start, stop, devices, deviceId, setDeviceId } =
    useWebcam();
  const overlayRef = useRef(null);
  const scanning = useRef(false);
  const loopRef = useRef(null);
  const emptyFrames = useRef(0);

  const [modelStatus, setModelStatus] = useState("Loading models…");
  const [modelsReady, setModelsReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [absent, setAbsent] = useState([]);
  const [lastResults, setLastResults] = useState([]);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ frames: 0, faces: 0 });

  // Bumping this nonce refetches the register. Keeping the fetch inside an
  // effect that only writes state after an await avoids cascading renders.
  const [registerNonce, setRegisterNonce] = useState(0);
  const loadSession = useCallback(() => setRegisterNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api(`/api/sessions/${sessionId}`);
        if (cancelled) return;
        setSession(data.session);
        setRecords(data.records);
        setAbsent(data.absent);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, registerNonce]);

  useEffect(() => {
    let cancelled = false;
    loadModels((s) => !cancelled && setModelStatus(s))
      .then(() => {
        if (cancelled) return;
        setModelsReady(true);
        setModelStatus("Models ready");
      })
      .catch((err) => !cancelled && setModelStatus(`Model load failed: ${err.message}`));
    return () => {
      cancelled = true;
    };
  }, []);

  /** Draw each detection box and its verdict over the video. */
  const draw = useCallback(
    (items) => {
      const canvas = overlayRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const { box, result } of items) {
        const known = result?.recognised;
        const colour = !known ? "#ef4444" : result.alreadyMarked ? "#3b82f6" : "#22c55e";
        const label = !known ? "Unknown face" : `${result.name} · ${result.matricNo}`;

        ctx.strokeStyle = colour;
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Labels are drawn un-mirrored so the text reads correctly on screen.
        ctx.save();
        ctx.scale(-1, 1);
        const x = -(box.x + box.width);
        ctx.font = "600 16px system-ui, sans-serif";
        const w = ctx.measureText(label).width + 16;
        ctx.fillStyle = colour;
        ctx.fillRect(x, box.y - 28, w, 26);
        ctx.fillStyle = "#fff";
        ctx.fillText(label, x + 8, box.y - 10);
        ctx.restore();
      }
    },
    [videoRef]
  );

  /** One scan pass: detect faces, send descriptors, draw the verdicts. */
  const scanOnce = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || scanning.current) return;
    scanning.current = true;

    try {
      // Every third empty frame, retry with the slower but more thorough detector.
      const faces = await detectAllFaces(video, { thorough: emptyFrames.current % 3 === 2 });
      setStats((s) => ({ frames: s.frames + 1, faces: s.faces + faces.length }));

      if (faces.length === 0) {
        emptyFrames.current += 1;
        draw([]);
        setLastResults([]);
        return;
      }

      const res = await api("/api/attendance/recognize", {
        method: "POST",
        body: { sessionId, descriptors: faces.map((f) => f.descriptor) },
      });

      draw(faces.map((f, i) => ({ box: f.box, result: res.results[i] })));
      setLastResults(res.results);

      // Only refetch the register when something actually changed.
      if (res.marked > 0) loadSession();
    } catch (err) {
      setError(err.message);
      if (err.status === 409) setRunning(false); // session was closed
    } finally {
      scanning.current = false;
    }
  }, [sessionId, videoRef, loadSession, draw]);

  // Scan loop
  useEffect(() => {
    if (!running || !ready || !modelsReady) return;
    scanOnce();
    loopRef.current = setInterval(scanOnce, SCAN_INTERVAL_MS);
    return () => clearInterval(loopRef.current);
  }, [running, ready, modelsReady, scanOnce]);

  async function toggle() {
    if (running) {
      setRunning(false);
      return;
    }
    setError("");
    if (!ready) await start();
    setRunning(true);
  }

  async function markManually(studentId) {
    try {
      await api("/api/attendance/manual", {
        method: "POST",
        body: { sessionId, studentId },
      });
      loadSession();
    } catch (err) {
      setError(err.message);
    }
  }

  async function closeSession() {
    if (!confirm("Close this session? No further attendance can be captured.")) return;
    setRunning(false);
    stop();
    try {
      await api(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        body: { status: "closed" },
      });
      router.push(`/sessions/${sessionId}`);
    } catch (err) {
      setError(err.message);
    }
  }

  const total = records.length + absent.length;
  const percent = total ? Math.round((records.length / total) * 100) : 0;
  const isClosed = session?.status === "closed";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {session?.course?.code || "Session"} — live capture
            </h1>
            {session && (
              <Badge tone={isClosed ? "slate" : "green"}>{session.status}</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {session?.course?.title}
            {session?.venue ? ` · ${session.venue}` : ""} · started{" "}
            {session && formatTime(session.startedAt)}
          </p>
        </div>

        <div className="flex gap-2">
          <Link href={`/sessions/${sessionId}`} className="btn-ghost">
            View register
          </Link>
          {!isClosed && (
            <button onClick={closeSession} className="btn-danger">
              Close session
            </button>
          )}
        </div>
      </div>

      {isClosed && (
        <p className="mb-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
          This session is closed. The register below is final.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ---------- Camera ---------- */}
        <div className="lg:col-span-3">
          <div className="card overflow-hidden">
            <div className="relative bg-slate-900">
              <video
                ref={videoRef}
                playsInline
                muted
                className="mirror aspect-video w-full object-cover"
              />
              <canvas
                ref={overlayRef}
                className="mirror pointer-events-none absolute inset-0 h-full w-full"
              />

              {!ready && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <p className="text-sm text-slate-300">
                    {camError || "Camera is off. Turn it on to start recognising faces."}
                  </p>
                  <button
                    onClick={toggle}
                    disabled={!modelsReady || isClosed}
                    className="btn-primary"
                  >
                    {modelsReady ? "Start capture" : modelStatus}
                  </button>
                </div>
              )}

              {running && (
                <span className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  SCANNING
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 p-4">
              <button
                onClick={toggle}
                disabled={!modelsReady || isClosed}
                className={running ? "btn-ghost" : "btn-primary"}
              >
                {running ? "Pause capture" : "Start capture"}
              </button>

              {devices.length > 1 && (
                <select
                  className="input max-w-[220px]"
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

              <span className="ml-auto text-xs text-slate-500">
                {stats.frames} frames scanned · {stats.faces} faces seen
                {modelsReady && (engineInfo().accelerated ? " · GPU" : " · CPU mode (slower)")}
              </span>
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {/* What the last frame decided */}
          <div className="card mt-4 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Last frame
            </p>
            {lastResults.length === 0 ? (
              <p className="text-sm text-slate-500">
                No face in view. Ask students to face the camera one row at a time.
              </p>
            ) : (
              <ul className="space-y-2">
                {lastResults.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    {r.recognised ? (
                      <>
                        <Avatar src={r.photo} name={r.name} size={28} />
                        <span className="flex-1 font-medium text-slate-900">
                          {r.name}
                          <span className="ml-2 font-mono text-xs text-slate-500">
                            {r.matricNo}
                          </span>
                        </span>
                        <span className="text-xs text-slate-500">
                          distance {r.distance}
                        </span>
                        <Badge tone={r.alreadyMarked ? "brand" : "green"}>
                          {r.alreadyMarked ? "already marked" : `marked ${r.status}`}
                        </Badge>
                      </>
                    ) : (
                      <>
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-600">
                          ?
                        </span>
                        <span className="flex-1 text-slate-600">
                          Face not recognised — not registered on this course, or not
                          enrolled.
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ---------- Register ---------- */}
        <div className="lg:col-span-2">
          <div className="card p-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Present
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {records.length}
                  <span className="text-base font-medium text-slate-400">/{total}</span>
                </p>
              </div>
              <span className="text-2xl font-bold text-brand-600">{percent}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="card mt-4 overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Marked present ({records.length})
              </h2>
            </div>
            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {records.length === 0 && (
                <li className="px-5 py-8 text-center text-sm text-slate-500">
                  Nobody marked yet.
                </li>
              )}
              {records.map((r) => (
                <li key={r._id} className="flex items-center gap-3 px-5 py-2.5">
                  <Avatar src={r.student?.photo} name={r.student?.fullName} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {r.student?.fullName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatTime(r.markedAt)} · {r.method}
                    </p>
                  </div>
                  <Badge tone={r.status === "late" ? "amber" : "green"}>{r.status}</Badge>
                </li>
              ))}
            </ul>
          </div>

          <div className="card mt-4 overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Not yet marked ({absent.length})
              </h2>
            </div>
            <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
              {absent.length === 0 && (
                <li className="px-5 py-8 text-center text-sm text-emerald-700">
                  Everyone is present.
                </li>
              )}
              {absent.map((s) => (
                <li key={s._id} className="flex items-center gap-3 px-5 py-2.5">
                  <Avatar src={s.photo} name={s.fullName} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-800">{s.fullName}</p>
                    <p className="font-mono text-xs text-slate-500">{s.matricNo}</p>
                  </div>
                  {!isClosed && (
                    <button
                      onClick={() => markManually(s._id)}
                      className="text-xs font-medium text-brand-600 hover:underline"
                      title="Fallback for poor lighting or camera failure"
                    >
                      Mark manually
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
