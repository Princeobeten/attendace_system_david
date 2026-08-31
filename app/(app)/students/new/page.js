"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { PageHeader, Card } from "@/components/ui";
import FaceEnroll from "@/components/FaceEnroll";

export default function NewStudentPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    matricNo: "",
    fullName: "",
    email: "",
    department: "",
    level: "",
  });
  const [descriptors, setDescriptors] = useState([]);
  const [photo, setPhoto] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (descriptors.length === 0) {
      setError("Capture at least one face sample before saving.");
      return;
    }
    setSaving(true);
    try {
      await api("/api/students", {
        method: "POST",
        body: { ...form, photo, faceDescriptors: descriptors },
      });
      router.push("/students");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Register student"
        subtitle="Record the student's details, then capture their face template."
      />

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold text-slate-900">Student details</h2>

          <div className="space-y-4">
            <div>
              <label className="label">Matriculation number *</label>
              <input
                className="input"
                required
                placeholder="e.g. CSC/2021/034"
                value={form.matricNo}
                onChange={set("matricNo")}
              />
            </div>
            <div>
              <label className="label">Full name *</label>
              <input
                className="input"
                required
                placeholder="e.g. Adaeze Okonkwo"
                value={form.fullName}
                onChange={set("fullName")}
              />
            </div>
            <div>
              <label className="label">Email address</label>
              <input
                className="input"
                type="email"
                placeholder="student@example.edu"
                value={form.email}
                onChange={set("email")}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Department</label>
                <input
                  className="input"
                  placeholder="Computer Science"
                  value={form.department}
                  onChange={set("department")}
                />
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
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-6 flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Save student"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-ghost"
            >
              Cancel
            </button>
          </div>
        </Card>

        <FaceEnroll
          onChange={(d, thumb) => {
            setDescriptors(d);
            if (thumb) setPhoto(thumb);
          }}
        />
      </form>
    </div>
  );
}
