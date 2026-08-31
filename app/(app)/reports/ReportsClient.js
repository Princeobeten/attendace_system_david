"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useApi, api, formatDate, downloadCsv } from "@/lib/client";
import { PageHeader, Card, Stat, Empty, Badge } from "@/components/ui";

export default function ReportsClient() {
  const params = useSearchParams();
  const router = useRouter();
  const { data: courseData } = useApi("/api/courses");
  const [chosen, setChosen] = useState(params.get("course") || "");

  const courses = courseData?.courses || [];
  // Fall back to the first course until the lecturer picks one.
  const courseId = chosen || courses[0]?._id || "";

  const {
    data: report,
    loading,
    error,
  } = useApi(courseId ? `/api/reports/course/${courseId}` : null);

  function chooseCourse(id) {
    setChosen(id);
    router.replace(id ? `/reports?course=${id}` : "/reports", { scroll: false });
  }

  function exportCsv() {
    if (!report) return;
    const header = [
      "S/N",
      "Matric number",
      "Full name",
      "Level",
      ...report.sessions.map((s) => formatDate(s.startedAt, false)),
      "Attended",
      "Sessions held",
      "Percentage",
      "Eligible",
    ];
    const rows = report.rows.map((r, i) => [
      i + 1,
      r.student.matricNo,
      r.student.fullName,
      r.student.level || "",
      ...r.marks.map((m) => (m === "absent" ? "A" : m === "late" ? "L" : "P")),
      r.attended,
      report.summary.sessionsHeld,
      `${r.percentage}%`,
      r.eligible ? "Yes" : "No",
    ]);
    downloadCsv(`${report.course.code}-attendance-report.csv`, [header, ...rows]);
  }

  return (
    <div>
      <PageHeader
        title="Attendance report"
        subtitle="Per-course register with attendance percentage and exam eligibility."
        action={
          report && (
            <button onClick={exportCsv} className="btn-ghost">
              Export CSV
            </button>
          )
        }
      />

      <div className="mb-6 max-w-md">
        <label className="label">Course</label>
        <select
          className="input"
          value={courseId}
          onChange={(e) => chooseCourse(e.target.value)}
        >
          <option value="">Select a course…</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>
              {c.code} — {c.title}
            </option>
          ))}
        </select>
      </div>

      {courses.length === 0 && (
        <Empty title="No courses" description="Create a course first." />
      )}
      {loading && <p className="text-sm text-slate-500">Building report…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {report && !loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Sessions held" value={report.summary.sessionsHeld} tone="slate" />
            <Stat label="Registered students" value={report.summary.registered} tone="brand" />
            <Stat
              label="Average attendance"
              value={`${report.summary.averageAttendance}%`}
              tone="green"
            />
            <Stat
              label="Below requirement"
              value={report.summary.atRisk}
              hint={`Needs ${report.course.requiredAttendance}%`}
              tone={report.summary.atRisk ? "amber" : "green"}
            />
          </div>

          {report.summary.sessionsHeld === 0 ? (
            <div className="mt-6">
              <Empty
                title="No sessions held yet"
                description="Start a lecture session for this course to populate the register."
              />
            </div>
          ) : (
            <Card className="mt-6 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-900">
                  {report.course.code} — {report.course.title}
                </h2>
                <div className="flex gap-3 text-xs text-slate-500">
                  <span><b className="text-emerald-600">P</b> present</span>
                  <span><b className="text-amber-600">L</b> late</span>
                  <span><b className="text-red-500">A</b> absent</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="th">Student</th>
                      <th className="th">Matric number</th>
                      {report.sessions.map((s) => (
                        <th key={s._id} className="th whitespace-nowrap text-center">
                          {formatDate(s.startedAt, false).replace(/ \d{4}$/, "")}
                        </th>
                      ))}
                      <th className="th text-center">%</th>
                      <th className="th">Eligibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.rows.map((r) => (
                      <tr key={r.student._id} className="hover:bg-slate-50">
                        <td className="td">
                          <Link
                            href={`/students/${r.student._id}`}
                            className="font-medium text-slate-900 hover:text-brand-700"
                          >
                            {r.student.fullName}
                          </Link>
                        </td>
                        <td className="td font-mono text-xs">{r.student.matricNo}</td>
                        {r.marks.map((m, i) => (
                          <td key={i} className="td text-center">
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                                m === "present"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : m === "late"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-50 text-red-500"
                              }`}
                            >
                              {m === "present" ? "P" : m === "late" ? "L" : "A"}
                            </span>
                          </td>
                        ))}
                        <td className="td text-center font-semibold">{r.percentage}%</td>
                        <td className="td">
                          <Badge tone={r.eligible ? "green" : "red"}>
                            {r.eligible ? "Eligible" : "Below requirement"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
