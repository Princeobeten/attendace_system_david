"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApi, api, formatDate } from "@/lib/client";
import { PageHeader, Card, Empty, Badge } from "@/components/ui";

export default function SessionsPage() {
  const router = useRouter();
  const { data, loading, error, reload } = useApi("/api/sessions");
  const { data: courseData } = useApi("/api/courses");
  const [form, setForm] = useState({ course: "", venue: "", lateAfterMinutes: 15 });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function start(e) {
    e.preventDefault();
    setNotice("");
    setBusy(true);
    try {
      const res = await api("/api/sessions", { method: "POST", body: form });
      router.push(`/sessions/${res.session.id}/capture`);
    } catch (err) {
      if (err.data?.sessionId) {
        router.push(`/sessions/${err.data.sessionId}/capture`);
        return;
      }
      setNotice(err.message);
      setBusy(false);
    }
  }

  async function close(id) {
    await api(`/api/sessions/${id}`, { method: "PATCH", body: { status: "closed" } });
    reload();
  }

  return (
    <div>
      <PageHeader
        title="Lecture sessions"
        subtitle="Start a sitting, capture faces, then close it to lock the register."
      />

      <Card className="mb-6 p-5">
        <form onSubmit={start} className="grid items-end gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label">Course</label>
            <select
              className="input"
              required
              value={form.course}
              onChange={(e) => setForm({ ...form, course: e.target.value })}
            >
              <option value="">Select a course…</option>
              {(courseData?.courses || []).map((c) => (
                <option key={c._id} value={c._id}>
                  {c.code} — {c.title} ({c.studentCount} students)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Venue</label>
            <input
              className="input"
              placeholder="e.g. LT1"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Late after (mins)</label>
            <input
              className="input"
              type="number"
              min="0"
              value={form.lateAfterMinutes}
              onChange={(e) =>
                setForm({ ...form, lateAfterMinutes: Number(e.target.value) })
              }
            />
          </div>
          <div className="sm:col-span-4">
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? "Starting…" : "Start session & open camera"}
            </button>
            {notice && (
              <span className="ml-3 text-sm text-red-600">{notice}</span>
            )}
          </div>
        </form>
      </Card>

      {loading && <p className="text-sm text-slate-500">Loading sessions…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && data?.sessions.length === 0 && (
        <Empty
          title="No sessions yet"
          description="Pick a course above and start your first lecture session."
        />
      )}

      {data?.sessions.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="th">Course</th>
                  <th className="th">Started</th>
                  <th className="th">Venue</th>
                  <th className="th">Present</th>
                  <th className="th">Status</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.sessions.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50">
                    <td className="td">
                      <Link href={`/sessions/${s._id}`} className="font-medium text-slate-900">
                        {s.course?.code}
                      </Link>
                      <p className="text-xs text-slate-500">{s.title}</p>
                    </td>
                    <td className="td">{formatDate(s.startedAt)}</td>
                    <td className="td">{s.venue || "—"}</td>
                    <td className="td font-semibold">{s.presentCount}</td>
                    <td className="td">
                      <Badge tone={s.status === "open" ? "green" : "slate"}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="td text-right">
                      {s.status === "open" ? (
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/sessions/${s._id}/capture`}
                            className="btn-primary py-1.5 text-xs"
                          >
                            Capture
                          </Link>
                          <button onClick={() => close(s._id)} className="btn-ghost py-1.5 text-xs">
                            Close
                          </button>
                        </div>
                      ) : (
                        <Link href={`/sessions/${s._id}`} className="btn-ghost py-1.5 text-xs">
                          View register
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
