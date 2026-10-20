"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApi, api, formatDate } from "@/lib/client";
import { useUser } from "@/components/UserProvider";
import { PageHeader, Card, Avatar, Badge } from "@/components/ui";

export default function CoursePage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { isAdmin } = useUser();
  const { data, loading, error, reload } = useApi(`/api/courses/${id}`);
  // The full student list is only needed by the admin's "add students" picker.
  const { data: allStudents } = useApi(isAdmin ? "/api/students" : null);
  const [picker, setPicker] = useState(false);
  const [editing, setEditing] = useState(false);
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
    setNotice("");
    try {
      await api(`/api/courses/${id}/students`, {
        method: "POST",
        body: { studentIds: selected },
      });
      setSelected([]);
      setPicker(false);
      reload();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeStudent(studentId) {
    setNotice("");
    try {
      await api(`/api/courses/${id}/students?studentId=${studentId}`, {
        method: "DELETE",
      });
      reload();
    } catch (err) {
      setNotice(err.message);
    }
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

  async function deleteCourse() {
    if (!confirm(`Delete ${course.code} together with all its sessions and attendance?`)) return;
    try {
      await api(`/api/courses/${id}`, { method: "DELETE" });
      router.push("/courses");
    } catch (err) {
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
          <div className="flex flex-wrap gap-2">
            <Link href={`/reports?course=${id}`} className="btn-ghost">
              View report
            </Link>
            {isAdmin ? (
              <>
                <button onClick={() => setEditing((e) => !e)} className="btn-primary">
                  {editing ? "Cancel editing" : "Edit course"}
                </button>
                <button onClick={deleteCourse} className="btn-danger">
                  Delete
                </button>
              </>
            ) : (
              <button onClick={startSession} className="btn-primary">
                Start lecture session
              </button>
            )}
          </div>
        }
      />

      {notice && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {notice}
        </p>
      )}

      {isAdmin && editing && (
        <EditCourseForm
          course={course}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Registered students</h2>
            {isAdmin && (
              <button onClick={() => setPicker((p) => !p)} className="btn-ghost py-1.5">
                {picker ? "Done" : "+ Add students"}
              </button>
            )}
          </div>

          {isAdmin && picker && (
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
              {isAdmin
                ? "No students registered on this course yet."
                : "No students registered on this course yet. The administrator registers students on courses."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {course.students.map((s) => (
                <li key={s._id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar src={s.photo} name={s.fullName} size={32} />
                  {isAdmin ? (
                    <Link
                      href={`/students/${s._id}`}
                      className="flex-1 text-sm font-medium text-slate-900 hover:text-brand-700"
                    >
                      {s.fullName}
                    </Link>
                  ) : (
                    <span className="flex-1 text-sm font-medium text-slate-900">
                      {s.fullName}
                    </span>
                  )}
                  <span className="font-mono text-xs text-slate-500">{s.matricNo}</span>
                  {isAdmin && (
                    <button
                      onClick={() => removeStudent(s._id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
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

/** Admin: correct course details and (re)assign its lecturer. */
function EditCourseForm({ course, onSaved }) {
  const { data: staff } = useApi("/api/users");
  const lecturers = (staff?.users || []).filter((u) => u.role === "lecturer");
  const [form, setForm] = useState({
    code: course.code || "",
    title: course.title || "",
    level: course.level || "",
    unit: course.unit ?? 3,
    department: course.department || "",
    lecturer: course.lecturer?._id || "",
    requiredAttendance: course.requiredAttendance ?? 75,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api(`/api/courses/${course._id}`, {
        method: "PATCH",
        body: {
          ...form,
          unit: Number(form.unit),
          requiredAttendance: Number(form.requiredAttendance),
        },
      });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Card className="mb-6 p-5">
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="label">Course code *</label>
          <input className="input" required value={form.code} onChange={set("code")} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Course title *</label>
          <input className="input" required value={form.title} onChange={set("title")} />
        </div>
        <div>
          <label className="label">Level</label>
          <select className="input" value={form.level} onChange={set("level")}>
            <option value="">Select level</option>
            {["100", "200", "300", "400", "500"].map((l) => (
              <option key={l} value={l}>{l} Level</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Credit unit</label>
          <input className="input" type="number" min="1" max="9"
            value={form.unit} onChange={set("unit")} />
        </div>
        <div>
          <label className="label">Lecturer</label>
          <select className="input" value={form.lecturer} onChange={set("lecturer")}>
            <option value="">Unassigned</option>
            {lecturers.map((u) => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Department</label>
          <input className="input" value={form.department} onChange={set("department")} />
        </div>
        <div>
          <label className="label">Required attendance (%)</label>
          <input className="input" type="number" min="0" max="100"
            value={form.requiredAttendance} onChange={set("requiredAttendance")} />
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2 lg:col-span-3">
            {error}
          </p>
        )}
      </form>
    </Card>
  );
}
