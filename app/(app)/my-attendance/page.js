"use client";

import { useState } from "react";
import { useApi, formatDate } from "@/lib/client";
import { PageHeader, Card, Empty, Badge } from "@/components/ui";
import { SelectField } from "@/components/fields";

/** Every time the student was marked present, filterable by course. */
export default function MyAttendancePage() {
  const { data, loading, error } = useApi("/api/student/attendance");
  const [course, setCourse] = useState("");

  const records = data?.records || [];
  const courseOptions = [...new Map(records.map((r) => [r.course?._id, r.course])).values()]
    .filter(Boolean)
    .map((c) => ({ value: c._id, label: `${c.code} — ${c.title}` }));
  const shown = records.filter((r) => !course || r.course?._id === course);

  return (
    <div>
      <PageHeader title="My attendance" subtitle="Every lecture you were marked present in." />

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && records.length === 0 && (
        <Empty
          title="No attendance yet"
          description="Once your face is enrolled and you attend a lecture, it will appear here."
        />
      )}

      {records.length > 0 && (
        <>
          <SelectField className="mb-4 max-w-sm" label="Course" value={course} onChange={setCourse}
            placeholder="All courses" options={courseOptions} />
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="th">Course</th>
                    <th className="th">Lecture</th>
                    <th className="th">Venue</th>
                    <th className="th">Marked at</th>
                    <th className="th">Status</th>
                    <th className="th">How</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shown.map((r) => (
                    <tr key={r._id}>
                      <td className="td font-medium">{r.course?.code}</td>
                      <td className="td">{r.session?.title || "—"}</td>
                      <td className="td">{r.session?.venue || "—"}</td>
                      <td className="td">{formatDate(r.markedAt)}</td>
                      <td className="td">
                        <Badge tone={r.status === "late" ? "amber" : "green"}>{r.status}</Badge>
                      </td>
                      <td className="td">{r.method === "face" ? "Face recognition" : "Marked by lecturer"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
