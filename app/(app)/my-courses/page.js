"use client";

import { useState } from "react";
import { useApi, api } from "@/lib/client";
import { PageHeader, Card, Empty, Badge } from "@/components/ui";
import { SelectField } from "@/components/fields";
import { DEPARTMENTS, LEVELS, SEMESTERS } from "@/lib/catalog";

/** Student course registration: pick courses instead of typing anything. */
export default function MyCoursesPage() {
  const { data, loading, error, reload } = useApi("/api/student/courses");
  const [filters, setFilters] = useState(null); // defaults come from the student's own record
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  const courses = data?.courses || [];
  const f = filters ?? { department: data?.me.department || "", level: data?.me.level || "", semester: "" };
  const setFilter = (k) => (v) => setFilters({ ...f, [k]: v });

  const registered = courses.filter((c) => c.registered);
  const totalUnits = registered.reduce((sum, c) => sum + (Number(c.unit) || 0), 0);
  const offered = courses.filter(
    (c) =>
      !c.registered &&
      (!f.department || c.department === f.department) &&
      (!f.level || c.level === f.level) &&
      (!f.semester || c.semester === f.semester)
  );

  async function change(course, register) {
    setBusy(course._id);
    setNotice("");
    try {
      if (register) {
        await api("/api/student/courses", { method: "POST", body: { courseId: course._id } });
      } else {
        if (!confirm(`Drop ${course.code}?`)) return;
        await api(`/api/student/courses?courseId=${course._id}`, { method: "DELETE" });
      }
      reload();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy("");
    }
  }

  const row = (c, register) => (
    <tr key={c._id} className="hover:bg-slate-50">
      <td className="td">
        <p className="font-mono text-sm font-bold text-brand-700">{c.code}</p>
        <p className="text-sm text-slate-800">{c.title}</p>
      </td>
      <td className="td">{c.unit ?? "—"}</td>
      <td className="td">{c.level ? `${c.level}` : "—"}</td>
      <td className="td">{c.semester || "—"}</td>
      <td className="td">{c.lecturer?.name || "—"}</td>
      <td className="td text-right">
        <button
          onClick={() => change(c, register)}
          disabled={busy === c._id}
          className={register ? "btn-primary py-1.5 text-xs" : "btn-ghost py-1.5 text-xs text-red-600"}
        >
          {busy === c._id ? "…" : register ? "Register" : "Drop"}
        </button>
      </td>
    </tr>
  );

  const head = (
    <thead className="border-b border-slate-100 bg-slate-50">
      <tr>
        <th className="th">Course</th>
        <th className="th">Units</th>
        <th className="th">Level</th>
        <th className="th">Semester</th>
        <th className="th">Lecturer</th>
        <th className="th"></th>
      </tr>
    </thead>
  );

  return (
    <div>
      <PageHeader
        title="Course registration"
        subtitle="Choose the courses you are taking. Only registered students can be marked present in a course."
      />

      {loading && <p className="text-sm text-slate-500">Loading courses…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p>}

      {data && (
        <>
          <Card className="mb-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">My registered courses</h2>
              <Badge tone="brand">
                {registered.length} course{registered.length === 1 ? "" : "s"} · {totalUnits} units
              </Badge>
            </div>
            {registered.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                Nothing registered yet — pick from the courses below.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  {head}
                  <tbody className="divide-y divide-slate-100">{registered.map((c) => row(c, false))}</tbody>
                </table>
              </div>
            )}
          </Card>

          <h2 className="mb-3 font-semibold text-slate-900">Courses on offer</h2>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <SelectField label="Department" value={f.department} onChange={setFilter("department")}
              placeholder="All departments" options={DEPARTMENTS.map((d) => d.name)} />
            <SelectField label="Level" value={f.level} onChange={setFilter("level")}
              placeholder="All levels" options={LEVELS.map((l) => ({ value: l, label: `${l} Level` }))} />
            <SelectField label="Semester" value={f.semester} onChange={setFilter("semester")}
              placeholder="Both semesters" options={SEMESTERS.map((s) => ({ value: s, label: `${s} semester` }))} />
          </div>

          {offered.length === 0 ? (
            <Empty title="No more courses match" description="Change the filters above to see other departments or levels." />
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  {head}
                  <tbody className="divide-y divide-slate-100">{offered.map((c) => row(c, true))}</tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
