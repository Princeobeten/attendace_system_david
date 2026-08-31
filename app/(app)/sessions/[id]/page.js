"use client";

import { use } from "react";
import Link from "next/link";
import { useApi, api, formatDate, formatTime, downloadCsv } from "@/lib/client";
import { PageHeader, Card, Avatar, Badge } from "@/components/ui";

export default function SessionPage({ params }) {
  const { id } = use(params);
  const { data, loading, error, reload } = useApi(`/api/sessions/${id}`);

  if (loading) return <p className="text-sm text-slate-500">Loading session…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const { session, records, absent, totalRegistered } = data;
  const percent = totalRegistered
    ? Math.round((records.length / totalRegistered) * 100)
    : 0;

  async function toggleStatus() {
    await api(`/api/sessions/${id}`, {
      method: "PATCH",
      body: { status: session.status === "open" ? "closed" : "open" },
    });
    reload();
  }

  async function removeRecord(recordId) {
    if (!confirm("Remove this attendance record?")) return;
    await api(`/api/attendance/${recordId}`, { method: "DELETE" });
    reload();
  }

  function exportCsv() {
    const rows = [
      ["Course", session.course?.code, session.course?.title],
      ["Session", session.title || "", formatDate(session.startedAt)],
      ["Venue", session.venue || "—"],
      [],
      ["S/N", "Matric number", "Full name", "Status", "Marked at", "Method"],
      ...records.map((r, i) => [
        i + 1,
        r.student?.matricNo,
        r.student?.fullName,
        r.status,
        formatDate(r.markedAt),
        r.method,
      ]),
      [],
      ["ABSENT"],
      ...absent.map((s, i) => [i + 1, s.matricNo, s.fullName, "absent", "", ""]),
    ];
    downloadCsv(
      `${session.course?.code || "session"}-${new Date(session.startedAt)
        .toISOString()
        .slice(0, 10)}.csv`,
      rows
    );
  }

  return (
    <div>
      <PageHeader
        title={`${session.course?.code} register`}
        subtitle={`${formatDate(session.startedAt)}${
          session.venue ? ` · ${session.venue}` : ""
        } · ${records.length} of ${totalRegistered} present (${percent}%)`}
        action={
          <div className="flex gap-2">
            <button onClick={exportCsv} className="btn-ghost">
              Export CSV
            </button>
            {session.status === "open" && (
              <Link href={`/sessions/${id}/capture`} className="btn-primary">
                Open camera
              </Link>
            )}
            <button onClick={toggleStatus} className="btn-ghost">
              {session.status === "open" ? "Close session" : "Reopen session"}
            </button>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <Badge tone={session.status === "open" ? "green" : "slate"}>
          {session.status}
        </Badge>
        <span className="text-slate-500">
          Lecturer: {session.lecturer?.name || "—"}
        </span>
        <span className="text-slate-500">
          Late after {session.lateAfterMinutes} minutes
        </span>
        {session.closedAt && (
          <span className="text-slate-500">Closed {formatDate(session.closedAt)}</span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Present ({records.length})
            </h2>
          </div>
          {records.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              No attendance was captured in this session.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="th">#</th>
                    <th className="th">Student</th>
                    <th className="th">Matric number</th>
                    <th className="th">Time</th>
                    <th className="th">Status</th>
                    <th className="th">Method</th>
                    <th className="th"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((r, i) => (
                    <tr key={r._id}>
                      <td className="td text-slate-400">{i + 1}</td>
                      <td className="td">
                        <Link
                          href={`/students/${r.student?._id}`}
                          className="flex items-center gap-2 font-medium text-slate-900"
                        >
                          <Avatar src={r.student?.photo} name={r.student?.fullName} size={28} />
                          {r.student?.fullName}
                        </Link>
                      </td>
                      <td className="td font-mono text-xs">{r.student?.matricNo}</td>
                      <td className="td">{formatTime(r.markedAt)}</td>
                      <td className="td">
                        <Badge tone={r.status === "late" ? "amber" : "green"}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="td">
                        <span className="capitalize">{r.method}</span>
                        {r.matchDistance != null && (
                          <span className="ml-1 text-xs text-slate-400">
                            ({r.matchDistance.toFixed(2)})
                          </span>
                        )}
                      </td>
                      <td className="td text-right">
                        <button
                          onClick={() => removeRecord(r._id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Absent ({absent.length})</h2>
          </div>
          {absent.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-emerald-700">
              Full attendance.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {absent.map((s) => (
                <li key={s._id} className="flex items-center gap-3 px-5 py-2.5">
                  <Avatar src={s.photo} name={s.fullName} size={30} />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-800">{s.fullName}</p>
                    <p className="font-mono text-xs text-slate-500">{s.matricNo}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
