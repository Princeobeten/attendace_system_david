"use client";

import { useState } from "react";
import { useApi, api } from "@/lib/client";
import { PageHeader, Card, Badge } from "@/components/ui";

export default function StaffPage() {
  const { data, loading, error, reload } = useApi("/api/users");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "lecturer",
    staffId: "",
    department: "",
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function create(e) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await api("/api/users", { method: "POST", body: form });
      setForm({ name: "", email: "", password: "", role: "lecturer", staffId: "", department: "" });
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
        title="Staff accounts"
        subtitle="Lecturers and administrators who can sign in and take attendance."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold text-slate-900">Add staff account</h2>
          <form onSubmit={create} className="space-y-4">
            <div>
              <label className="label">Full name *</label>
              <input className="input" required value={form.name} onChange={set("name")} />
            </div>
            <div>
              <label className="label">Email *</label>
              <input className="input" type="email" required value={form.email} onChange={set("email")} />
            </div>
            <div>
              <label className="label">Password *</label>
              <input
                className="input"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={set("password")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={set("role")}>
                  <option value="lecturer">Lecturer</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div>
                <label className="label">Staff ID</label>
                <input className="input" value={form.staffId} onChange={set("staffId")} />
              </div>
            </div>
            <div>
              <label className="label">Department</label>
              <input className="input" value={form.department} onChange={set("department")} />
            </div>

            {formError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            )}

            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? "Creating…" : "Create account"}
            </button>
          </form>
        </Card>

        <Card className="overflow-hidden lg:col-span-2">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Accounts</h2>
          </div>
          {loading && <p className="px-5 py-6 text-sm text-slate-500">Loading…</p>}
          {error && <p className="px-5 py-6 text-sm text-red-600">{error}</p>}
          <ul className="divide-y divide-slate-100">
            {(data?.users || []).map((u) => (
              <li key={u._id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                  {u.name?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{u.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {u.email}
                    {u.department ? ` · ${u.department}` : ""}
                  </p>
                </div>
                <Badge tone={u.role === "admin" ? "brand" : "slate"}>{u.role}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
