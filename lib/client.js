"use client";

import { useCallback, useEffect, useState } from "react";

export async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

/**
 * Small data-fetching hook: `{ data, error, loading, reload }`.
 * Pass a falsy path to skip fetching (useful while an id is still unknown).
 *
 * `loading` is derived from which path the state belongs to rather than being
 * written by the effect, so the effect never calls setState synchronously.
 */
export function useApi(path, deps = []) {
  const [state, setState] = useState({ data: null, error: null, source: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api(path);
        if (!cancelled) setState({ data, error: null, source: path });
      } catch (err) {
        if (!cancelled) setState({ data: null, error: err.message, source: path });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, nonce, ...deps]);

  /** Refetch on demand. Called from event handlers, never from an effect. */
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return {
    data: state.source === path ? state.data : null,
    error: state.source === path ? state.error : null,
    loading: Boolean(path) && state.source !== path,
    reload,
  };
}

export function formatDate(value, withTime = true) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Trigger a client-side CSV download. */
export function downloadCsv(filename, rows) {
  const escape = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
