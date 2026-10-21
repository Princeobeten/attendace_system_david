"use client";

import Link from "next/link";
import { useApi, formatDate } from "@/lib/client";
import { PageHeader, Card, Avatar, Badge } from "@/components/ui";

/** Student: registration progress and their own attendance per course. */
export default function StudentDashboard() {
  const { data, loading, error } = useApi("/api/student/overview");

  if (loading) return <p className="text-sm text-slate-500">Loading your dashboard…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const { student, courses } = data;
  const verified = student.faceSamples > 0;

  const steps = [
    {
      done: true,
      title: "Registered online",
      detail: `Account created ${formatDate(student.createdAt, false)}`,
    },
    {
      done: courses.length > 0,
      title: "Courses registered",
      detail: courses.length
        ? `${courses.length} course${courses.length === 1 ? "" : "s"} registered`
        : "Register the courses you are taking this semester.",
      action: !courses.length && { href: "/my-courses", label: "Register courses" },
    },
    {
      done: verified,
      title: "Identity verified & face enrolled",
      detail: verified
        ? `Verified ${formatDate(student.identityCheck?.verifiedAt, false)}${
            student.identityCheck?.document ? ` with your ${student.identityCheck.document}` : ""
          }`
        : "Visit the admin office with your JAMB result slip or admission letter. They will check your identity and capture your face — it takes under a minute.",
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome, ${student.fullName.split(" ")[0]}`}
        subtitle={`${student.matricNo} · ${student.department || ""}${student.level ? ` · ${student.level} Level` : ""}`}
        action={
          <Link href="/my-courses" className="btn-primary">
            Course registration
          </Link>
        }
      />

      {!verified && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <b>Your face is not enrolled yet.</b> Until it is, the classroom camera cannot mark
          you present. Take your JAMB result slip or admission letter to the admin office.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold text-slate-900">Registration progress</h2>
          <ol className="mt-4 space-y-4">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    s.done ? "bg-emerald-500 text-white" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {s.done ? "✓" : i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{s.title}</p>
                  <p className="text-sm text-slate-500">{s.detail}</p>
                  {s.action && (
                    <Link href={s.action.href} className="mt-1 inline-block text-sm font-medium text-brand-600 hover:underline">
                      {s.action.label} →
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-4">
            <Avatar src={student.passportPhoto || student.photo} name={student.fullName} size={64} />
            <div>
              <p className="font-semibold text-slate-900">{student.fullName}</p>
              <p className="font-mono text-xs text-slate-500">{student.matricNo}</p>
              <div className="mt-2">
                {verified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Awaiting verification</Badge>}
              </div>
            </div>
          </div>
          <dl className="mt-5 space-y-2 text-sm">
            {[
              ["Faculty", student.faculty],
              ["Department", student.department],
              ["Level", student.level && `${student.level} Level`],
              ["JAMB reg. no.", student.jambRegNo],
              ["Email", student.email],
              ["Phone", student.phone],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-medium text-slate-800">{v || "—"}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-slate-400">
            Something wrong? The admin office can correct your details.
          </p>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">My attendance</h2>
          <Link href="/my-attendance" className="text-sm font-medium text-brand-600">
            Full history →
          </Link>
        </div>
        {courses.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            You have not registered any course yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="th">Course</th>
                  <th className="th">Lecturer</th>
                  <th className="th text-center">Classes held</th>
                  <th className="th text-center">Attended</th>
                  <th className="th">Attendance</th>
                  <th className="th">Exam eligibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.map((c) => (
                  <tr key={c._id}>
                    <td className="td">
                      <p className="font-medium text-slate-900">{c.code}</p>
                      <p className="text-xs text-slate-500">{c.title}</p>
                    </td>
                    <td className="td">{c.lecturer?.name || "—"}</td>
                    <td className="td text-center">{c.sessionsHeld}</td>
                    <td className="td text-center">
                      {c.attended}
                      {c.late > 0 && <span className="text-xs text-amber-700"> ({c.late} late)</span>}
                    </td>
                    <td className="td min-w-40">
                      {c.percentage === null ? (
                        <span className="text-xs text-slate-400">No classes yet</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${c.eligible ? "bg-emerald-500" : "bg-red-500"}`}
                              style={{ width: `${c.percentage}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-sm font-semibold">{c.percentage}%</span>
                        </div>
                      )}
                    </td>
                    <td className="td">
                      {c.eligible === null ? (
                        <Badge tone="slate">Needs {c.required}%</Badge>
                      ) : c.eligible ? (
                        <Badge tone="green">Eligible</Badge>
                      ) : (
                        <Badge tone="red">Below {c.required}%</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
