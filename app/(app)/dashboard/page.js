"use client";

import Link from "next/link";
import { useApi, formatDate } from "@/lib/client";
import { Stat, PageHeader, Card, Empty, Avatar, Badge } from "@/components/ui";

export default function DashboardPage() {
  const { data, loading, error } = useApi("/api/dashboard");

  if (loading) return <p className="text-sm text-slate-500">Loading dashboard…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const { stats, openSessions, recent } = data;
  const enrolmentGap = stats.students - stats.enrolledStudents;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of enrolment, lectures and attendance capture."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Registered students"
          value={stats.students}
          hint={
            enrolmentGap > 0
              ? `${enrolmentGap} without a face template`
              : "All faces enrolled"
          }
          tone={enrolmentGap > 0 ? "amber" : "green"}
        />
        <Stat label="Courses" value={stats.courses} hint="Assigned to you" tone="brand" />
        <Stat
          label="Open sessions"
          value={stats.openSessions}
          hint={stats.openSessions ? "Capture in progress" : "Nothing running"}
          tone={stats.openSessions ? "green" : "slate"}
        />
        <Stat
          label="Marked today"
          value={stats.markedToday}
          hint={`${stats.faceMarked} by face · ${stats.manualMarked} manual`}
          tone="slate"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Open lecture sessions</h2>
            <Link href="/sessions" className="text-sm font-medium text-brand-600">
              All sessions →
            </Link>
          </div>

          {openSessions.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-slate-500">
                No session is running. Start one to begin capturing attendance.
              </p>
              <Link href="/sessions" className="btn-primary mt-4">
                Start a session
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {openSessions.map((s) => (
                <li key={s._id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-medium text-slate-900">
                      {s.course?.code} — {s.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      Started {formatDate(s.startedAt)}
                      {s.venue ? ` · ${s.venue}` : ""}
                    </p>
                  </div>
                  <Link href={`/sessions/${s._id}/capture`} className="btn-primary py-1.5">
                    Open camera
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Recent attendance</h2>
          </div>
          {recent.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              Nothing recorded yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((r) => (
                <li key={r._id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar src={r.student?.photo} name={r.student?.fullName} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {r.student?.fullName}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {r.course?.code} · {formatDate(r.markedAt)}
                    </p>
                  </div>
                  <Badge tone={r.status === "late" ? "amber" : "green"}>
                    {r.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
