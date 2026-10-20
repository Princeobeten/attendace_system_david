"use client";

import Link from "next/link";
import { useApi, formatDate } from "@/lib/client";
import { useUser } from "@/components/UserProvider";
import { Stat, PageHeader, Card, Avatar, Badge } from "@/components/ui";

export default function DashboardPage() {
  const { data, loading, error } = useApi("/api/dashboard");
  const { name } = useUser();

  if (loading) return <p className="text-sm text-slate-500">Loading dashboard…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return data.role === "admin" ? (
    <AdminDashboard data={data} name={name} />
  ) : (
    <LecturerDashboard data={data} name={name} />
  );
}

/* ------------------------------------------------------------------ */
/* Administrator: maintains students, courses and staff accounts.      */
/* ------------------------------------------------------------------ */

function AdminDashboard({ data, name }) {
  const { stats, openSessions, recent } = data;
  const enrolmentGap = stats.students - stats.enrolledStudents;

  return (
    <div>
      <PageHeader
        title="Administrator dashboard"
        subtitle={`Welcome, ${name}. Keep student records, courses and staff accounts up to date.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/students/new" className="btn-primary">
              + Register student
            </Link>
            <Link href="/courses" className="btn-ghost">
              Manage courses
            </Link>
            <Link href="/staff" className="btn-ghost">
              Add staff
            </Link>
          </div>
        }
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
        <Stat
          label="Courses"
          value={stats.courses}
          hint={
            stats.unassignedCourses
              ? `${stats.unassignedCourses} without a lecturer`
              : "All have a lecturer"
          }
          tone={stats.unassignedCourses ? "amber" : "green"}
        />
        <Stat label="Lecturers" value={stats.lecturers} hint="Staff accounts" tone="brand" />
        <Stat
          label="Marked today"
          value={stats.markedToday}
          hint={`${stats.openSessions} class(es) in progress`}
          tone={stats.openSessions ? "green" : "slate"}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Classes in progress</h2>
            <Link href="/sessions" className="text-sm font-medium text-brand-600">
              Session monitor →
            </Link>
          </div>

          {openSessions.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              No lecturer is taking attendance right now.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {openSessions.map((s) => (
                <li key={s._id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-medium text-slate-900">
                      {s.course?.code} — {s.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {s.lecturer?.name || "—"} · started {formatDate(s.startedAt)}
                      {s.venue ? ` · ${s.venue}` : ""}
                    </p>
                  </div>
                  <Link href={`/sessions/${s._id}`} className="btn-ghost py-1.5">
                    View register
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <RecentAttendance recent={recent} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lecturer: runs their own classes and takes attendance.              */
/* ------------------------------------------------------------------ */

function LecturerDashboard({ data, name }) {
  const { stats, courses, openSessions, recent } = data;

  return (
    <div>
      <PageHeader
        title="Lecturer dashboard"
        subtitle={`Welcome, ${name}. Start a lecture session to take attendance by face.`}
        action={
          <Link href="/sessions" className="btn-primary">
            Start a lecture session
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="My courses" value={stats.courses} hint={`${stats.students} students`} tone="brand" />
        <Stat label="Sessions held" value={stats.sessionsHeld} hint="Across my courses" tone="slate" />
        <Stat
          label="Open sessions"
          value={stats.openSessions}
          hint={stats.openSessions ? "Capture in progress" : "Nothing running"}
          tone={stats.openSessions ? "green" : "slate"}
        />
        <Stat
          label="Marked today"
          value={stats.markedToday}
          hint={`${stats.faceMarked} by face · ${stats.manualMarked} manual (all time)`}
          tone="slate"
        />
      </div>

      {openSessions.length > 0 && (
        <Card className="mt-8 border-emerald-200">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Your class in progress</h2>
          </div>
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
        </Card>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">My courses</h2>
            <Link href="/courses" className="text-sm font-medium text-brand-600">
              All my courses →
            </Link>
          </div>
          {courses.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              No course has been assigned to you yet. Ask the administrator to assign
              you as the lecturer of a course.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {courses.map((c) => (
                <li key={c._id} className="flex items-center justify-between px-5 py-4">
                  <Link href={`/courses/${c._id}`}>
                    <p className="font-medium text-slate-900">
                      {c.code} — {c.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {c.studentCount} students · {c.requiredAttendance ?? 75}% required
                    </p>
                  </Link>
                  <Link href={`/reports?course=${c._id}`} className="btn-ghost py-1.5">
                    Report
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <RecentAttendance recent={recent} />
      </div>
    </div>
  );
}

function RecentAttendance({ recent }) {
  return (
    <Card className="lg:col-span-2">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-semibold text-slate-900">Recent attendance</h2>
      </div>
      {recent.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500">Nothing recorded yet.</p>
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
              <Badge tone={r.status === "late" ? "amber" : "green"}>{r.status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
