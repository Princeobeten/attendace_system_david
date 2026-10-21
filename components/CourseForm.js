"use client";

import { useState } from "react";
import { SelectField } from "@/components/fields";
import {
  DEPARTMENTS,
  LEVELS,
  SEMESTERS,
  CREDIT_UNITS,
  ATTENDANCE_REQUIREMENTS,
} from "@/lib/catalog";

/** "CSC 401" -> { prefix: "CSC", number: "401" } */
function splitCode(code = "") {
  const m = /^([A-Z]{2,4})\s*(\d{3})$/i.exec(code.trim());
  return m ? { prefix: m[1].toUpperCase(), number: m[2] } : { prefix: "", number: "" };
}

/**
 * Create / edit a course. Everything except the course number and title is
 * picked from a list; the code prefix also fills in the department.
 */
export default function CourseForm({ initial = {}, lecturers = [], submitLabel, onSubmit }) {
  const start = splitCode(initial.code);
  const [form, setForm] = useState({
    prefix: start.prefix,
    number: start.number,
    title: initial.title || "",
    department: initial.department || "",
    level: initial.level || "",
    semester: initial.semester || "",
    unit: String(initial.unit ?? 3),
    lecturer: initial.lecturer?._id || initial.lecturer || "",
    requiredAttendance: String(initial.requiredAttendance ?? 75),
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const codePreview = form.prefix && form.number ? `${form.prefix} ${form.number}` : "";

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!/^\d{3}$/.test(form.number)) return setError("The course number must be 3 digits, e.g. 401");
    setSaving(true);
    try {
      await onSubmit({
        code: codePreview,
        title: form.title,
        department: form.department,
        level: form.level,
        semester: form.semester,
        unit: Number(form.unit),
        lecturer: form.lecturer,
        requiredAttendance: Number(form.requiredAttendance),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <label className="label">Course code *</label>
        <div className="flex gap-2">
          <select
            className="input w-28"
            required
            value={form.prefix}
            onChange={(e) => {
              const prefix = e.target.value;
              const dept = DEPARTMENTS.find((d) => d.code === prefix);
              setForm((f) => ({ ...f, prefix, department: dept ? dept.name : f.department }));
            }}
          >
            <option value="">Code</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.code} value={d.code}>{d.code}</option>
            ))}
          </select>
          <input
            className="input font-mono"
            required
            inputMode="numeric"
            maxLength={3}
            placeholder="401"
            value={form.number}
            onChange={(e) => set("number")(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      </div>
      <div className="sm:col-span-2">
        <label className="label">Course title *</label>
        <input className="input" required placeholder="e.g. Software Engineering"
          value={form.title} onChange={(e) => set("title")(e.target.value)} />
      </div>

      <SelectField label="Department" value={form.department} onChange={set("department")}
        placeholder="Select department" options={DEPARTMENTS.map((d) => d.name)} />
      <SelectField label="Level" value={form.level} onChange={set("level")}
        placeholder="Select level" options={LEVELS.map((l) => ({ value: l, label: `${l} Level` }))} />
      <SelectField label="Semester" value={form.semester} onChange={set("semester")}
        placeholder="Select semester" options={SEMESTERS.map((s) => ({ value: s, label: `${s} semester` }))} />

      <SelectField label="Credit units" required value={form.unit} onChange={set("unit")}
        placeholder="Units" options={CREDIT_UNITS.map((u) => ({ value: String(u), label: `${u} unit${u === 1 ? "" : "s"}` }))} />
      <SelectField label="Lecturer" value={form.lecturer} onChange={set("lecturer")}
        placeholder="Unassigned" options={lecturers.map((u) => ({ value: u._id, label: u.name }))} />
      <SelectField label="Required attendance" required value={form.requiredAttendance}
        onChange={set("requiredAttendance")} placeholder="Select"
        options={ATTENDANCE_REQUIREMENTS.map((p) => ({ value: String(p), label: `${p}% to sit the exam` }))} />

      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : submitLabel}
        </button>
        {codePreview && (
          <span className="text-sm text-slate-500">
            Course code: <b className="font-mono text-slate-800">{codePreview}</b>
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2 lg:col-span-3">
          {error}
        </p>
      )}
    </form>
  );
}
