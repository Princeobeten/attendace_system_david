"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApi, api, formatDate } from "@/lib/client";
import { PageHeader, Card, Avatar, Badge } from "@/components/ui";
import FaceEnroll from "@/components/FaceEnroll";

export default function StudentPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, loading, error, reload } = useApi(`/api/students/${id}`);
  const [reenroll, setReenroll] = useState(false);
  const [editing, setEditing] = useState(false);
  const [descriptors, setDescriptors] = useState([]);
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <p className="text-sm text-slate-500">Loading student…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const { student, courses, attendance } = data;

  async function saveTemplates() {
    if (!descriptors.length) return;
    setBusy(true);
    try {
      await api(`/api/students/${id}`, {
        method: "PATCH",
        body: { faceDescriptors: descriptors, ...(photo ? { photo } : {}) },
      });
      setReenroll(false);
      setDescriptors([]);
      reload();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${student.fullName} and all their attendance records?`))
      return;
    await api(`/api/students/${id}`, { method: "DELETE" });
    router.push("/students");
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title={student.fullName}
        subtitle={`${student.matricNo}${student.department ? ` · ${student.department}` : ""}`}
        action={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setEditing((e) => !e)} className="btn-primary">
              {editing ? "Cancel editing" : "Edit details"}
            </button>
            <button onClick={() => setReenroll((r) => !r)} className="btn-ghost">
              {reenroll ? "Cancel re-enrolment" : "Re-enrol face"}
            </button>
            <button onClick={remove} className="btn-danger">
              Delete
            </button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <Avatar src={student.photo} name={student.fullName} size={64} />
            <div>
              <p className="font-semibold text-slate-900">{student.fullName}</p>
              <p className="font-mono text-xs text-slate-500">{student.matricNo}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {student.faceSamples > 0 ? (
                  <Badge tone="green">{student.faceSamples} face samples</Badge>
                ) : (
                  <Badge tone="red">No face template</Badge>
                )}
                {student.isActive === false && <Badge tone="slate">Inactive</Badge>}
              </div>
            </div>
          </div>

          {editing ? (
            <EditStudentForm
              student={student}
              onSaved={() => {
                setEditing(false);
                reload();
              }}
            />
          ) : (
            <dl className="mt-6 space-y-3 text-sm">
              {[
                ["Email", student.email || "—"],
                ["Department", student.department || "—"],
                ["Level", student.level || "—"],
                ["Status", student.isActive === false ? "Inactive" : "Active"],
                ["Registered", formatDate(student.createdAt, false)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-medium text-slate-800">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Registered courses
            </p>
            {courses.length === 0 ? (
              <p className="text-sm text-slate-500">Not registered on any course.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {courses.map((c) => (
                  <Link key={c._id} href={`/courses/${c._id}`}>
                    <Badge tone="brand">{c.code}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>

        <div className="lg:col-span-2">
          {reenroll ? (
            <div>
              <FaceEnroll
                initialCount={student.faceSamples}
                onChange={(d, thumb) => {
                  setDescriptors(d);
                  if (thumb) setPhoto(thumb);
                }}
              />
              <button
                onClick={saveTemplates}
                disabled={!descriptors.length || busy}
                className="btn-primary mt-4"
              >
                {busy ? "Saving…" : `Replace stored template (${descriptors.length} samples)`}
              </button>
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-900">Attendance history</h2>
              </div>
              {attendance.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-slate-500">
                  This student has not been marked present in any lecture yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-slate-100 bg-slate-50">
                      <tr>
                        <th className="th">Course</th>
                        <th className="th">Session</th>
                        <th className="th">Marked at</th>
                        <th className="th">Status</th>
                        <th className="th">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendance.map((a) => (
                        <tr key={a._id}>
                          <td className="td font-medium">{a.course?.code}</td>
                          <td className="td">{a.session?.title || "—"}</td>
                          <td className="td">{formatDate(a.markedAt)}</td>
                          <td className="td">
                            <Badge tone={a.status === "late" ? "amber" : "green"}>
                              {a.status}
                            </Badge>
                          </td>
                          <td className="td capitalize">{a.method}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Correct a student's record — e.g. a mistyped matric number — without
 * touching their face templates or attendance history.
 */
function EditStudentForm({ student, onSaved }) {
  const [form, setForm] = useState({
    matricNo: student.matricNo || "",
    fullName: student.fullName || "",
    email: student.email || "",
    department: student.department || "",
    level: student.level || "",
    isActive: student.isActive !== false,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api(`/api/students/${student._id}`, { method: "PATCH", body: form });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label className="label">Matriculation number *</label>
        <input className="input" required value={form.matricNo} onChange={set("matricNo")} />
      </div>
      <div>
        <label className="label">Full name *</label>
        <input className="input" required value={form.fullName} onChange={set("fullName")} />
      </div>
      <div>
        <label className="label">Email address</label>
        <input className="input" type="email" value={form.email} onChange={set("email")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Department</label>
          <input className="input" value={form.department} onChange={set("department")} />
        </div>
        <div>
          <label className="label">Level</label>
          <select className="input" value={form.level} onChange={set("level")}>
            <option value="">Select level</option>
            {["100", "200", "300", "400", "500"].map((l) => (
              <option key={l} value={l}>
                {l} Level
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
        />
        Active (inactive students are not recognised in class)
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
