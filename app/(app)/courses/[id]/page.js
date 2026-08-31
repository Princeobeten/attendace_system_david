"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApi, api, formatDate } from "@/lib/client";
import { PageHeader, Card, Avatar, Badge } from "@/components/ui";

export default function CoursePage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, loading, error, reload } = useApi(`/api/courses/${id}`);
  const { data: allStudents } = useApi("/api/students");
  const [picker, setPicker] = useState(false);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const registeredIds = useMemo(
    () => new Set((data?.course?.students || []).map((s) => String(s._id))),
    [data]
  );

  const available = (allStudents?.students || []).filter(
    (s) =>
      !registeredIds.has(String(s._id)) &&
      (s.fullName + s.matricNo).toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <p className="text-sm text-slate-500">Loading course…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const { course, sessions } = data;

  async function addStudents() {
    if (!selected.length) return;
    setBusy(true);
    try {
      await api(`/api/courses/${id}/students`, {
        method: "POST",
        body: { studentIds: selected },
      });
      setSelected([]);
      setPicker(false);
      reload();
    } finally {
      setBusy(false);
    }
  }

  async function removeStudent(studentId) {
    await api(`/api/courses/${id}/students?studentId=${studentId}`, {
      method: "DELETE",
    });
    reload();
  }

  async function startSession() {
    setNotice("");
    try {
      const res = await api("/api/sessions", {
        method: "POST",
        body: { course: id, title: `${course.code} lecture` },
      });
      router.push(`/sessions/${res.session.id}/capture`);
    } catch (err) {
      if (err.data?.sessionId) {
        router.push(`/sessions/${err.data.sessionId}/capture`);
        return;
      }
      setNotice(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title={`${course.code} — ${course.title}`}
        subtitle={`${course.students?.length || 0} registered · ${
          course.requiredAttendance ?? 75
        }% attendance required · Lecturer: ${course.lecturer?.name || "Unassigned"}`}
        action={
          <div className="flex gap-2">
            <Link href={`/reports?course=${id}`} className="btn-ghost">
              View report
            </Link>
            <button onClick={startSession} className="btn-primary">
              Start lecture session
            </button>
          </div>
        }
      />

      {notice && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {notice}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Registered students</h2>
            <button onClick={() => setPicker((p) => !p)} className="btn-ghost py-1.5">
              {picker ? "Done" : "+ Add students"}
            </button>
          </div>

          {picker && (
            <div className="border-b border-slate-100 bg-slate-50 p-4">
              <input
                className="input mb-3"
                placeholder="Search students to add…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {available.length === 0 && (
                  <p className="py-4 text-center text-sm text-slate-500">
                    No unregistered students match.
                  </p>
                )}
                {available.map((s) => (
                  <label
                    key={s._id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(s._id)}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked
                            ? [...prev, s._id]
                            : prev.filter((x) => x !== s._id)
                        )
                      }
                    />
                    <Avatar src={s.photo} name={s.fullName} size={28} />
                    <span className="flex-1">{s.fullName}</span>
                    <span className="font-mono text-xs text-slate-500">
                      {s.matricNo}
                    </span>
                    {s.faceSamples === 0 && <Badge tone="red">no face</Badge>}
                  </label>
                ))}
              </div>
              <button
                onClick={addStudents}
                disabled={!selected.length || busy}
                className="btn-primary mt-3"
              >
                {busy ? "Adding…" : `Register ${selected.length} student(s)`}
              </button>
            </div>
          )}

          {(course.students || []).length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              No students registered on this course yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {course.students.map((s) => (
                <li key={s._id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar src={s.photo} name={s.fullName} size={32} />
                  <Link
                    href={`/students/${s._id}`}
                    className="flex-1 text-sm font-medium text-slate-900 hover:text-brand-700"
                  >
                    {s.fullName}
                  </Link>
                  <span className="font-mono text-xs text-slate-500">{s.matricNo}</span>
                  <button
                    onClick={() => removeStudent(s._id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Lecture sessions</h2>
          </div>
          {sessions.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              No sessions held yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sessions.map((s) => (
                <li key={s._id}>
                  <Link
                    href={`/sessions/${s._id}`}
                    className="block px-5 py-3 hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        {formatDate(s.startedAt)}
                      </span>
                      <Badge tone={s.status === "open" ? "green" : "slate"}>
                        {s.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {s.presentCount} of {course.students?.length || 0} present
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
