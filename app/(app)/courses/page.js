"use client";

import Link from "next/link";
import { useState } from "react";
import { useApi, api } from "@/lib/client";
import { PageHeader, Card, Empty, Badge } from "@/components/ui";

export default function CoursesPage() {
  const { data, loading, error, reload } = useApi("/api/courses");
  const { data: staff } = useApi("/api/users");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    title: "",
    level: "",
    unit: 3,
    department: "",
    lecturer: "",
    requiredAttendance: 75,
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function create(e) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await api("/api/courses", { method: "POST", body: form });
      setOpen(false);
      setForm({
        code: "", title: "", level: "", unit: 3,
        department: "", lecturer: "", requiredAttendance: 75,
      });
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Courses"
        subtitle="Courses and the students registered for them."
        action={
          <button onClick={() => setOpen((o) => !o)} className="btn-primary">
            {open ? "Close" : "+ New course"}
          </button>
        }
      />

      {open && (
        <Card className="mb-6 p-5">
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label">Course code *</label>
              <input className="input" required placeholder="CSC 401"
                value={form.code} onChange={set("code")} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Course title *</label>
              <input className="input" required placeholder="Software Engineering"
                value={form.title} onChange={set("title")} />
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
                {(staff?.users || []).map((u) => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Department</label>
              <input className="input" placeholder="Computer Science"
                value={form.department} onChange={set("department")} />
            </div>
            <div>
              <label className="label">Required attendance (%)</label>
              <input className="input" type="number" min="0" max="100"
                value={form.requiredAttendance} onChange={set("requiredAttendance")} />
            </div>

            <div className="flex items-end gap-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? "Creating…" : "Create course"}
              </button>
            </div>

            {formError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2 lg:col-span-3">
                {formError}
              </p>
            )}
          </form>
        </Card>
      )}

      {loading && <p className="text-sm text-slate-500">Loading courses…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && data?.courses.length === 0 && (
        <Empty
          title="No courses yet"
          description="Create a course, register students on it, then start a lecture session."
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(data?.courses || []).map((c) => (
          <Link key={c._id} href={`/courses/${c._id}`} className="card p-5 transition hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-bold text-brand-700">{c.code}</p>
                <p className="mt-1 font-semibold text-slate-900">{c.title}</p>
              </div>
              <Badge tone="slate">{c.unit} units</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
              <span>{c.studentCount} students</span>
              {c.level && <span>· {c.level} Level</span>}
              <span>· {c.requiredAttendance ?? 75}% required</span>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Lecturer: {c.lecturer?.name || "Unassigned"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
