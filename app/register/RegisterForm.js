"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { SelectField, FacultyDepartmentFields } from "@/components/fields";
import { LEVELS, GENDERS, entryYears, findDepartment, buildMatricNo } from "@/lib/catalog";

const PHOTO_SIZE = 280;

/** Centre-crop and shrink an uploaded image to a small square JPEG. */
function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = PHOTO_SIZE;
      canvas
        .getContext("2d")
        .drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file is not an image"));
    };
    img.src = url;
  });
}

function Section({ n, title, children }) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
          {n}
        </span>
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    gender: "",
    email: "",
    phone: "",
    faculty: "",
    department: "",
    level: "",
    entryYear: "",
    matricSerial: "",
    jambRegNo: "",
    passportPhoto: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: typeof v === "string" ? v : v.target.value }));
  const deptCode = findDepartment(form.department)?.code;
  const matricPreview = buildMatricNo(deptCode, form.entryYear, form.matricSerial);

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      set("passportPhoto")(await resizePhoto(file));
    } catch (err) {
      setError(err.message);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.passportPhoto) return setError("Upload your passport photograph.");
    if (form.password !== form.confirm) return setError("The two passwords do not match.");
    setSaving(true);
    try {
      await api("/api/auth/register", { method: "POST", body: form });
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5">
      <Section n="1" title="Personal details">
        <div className="sm:col-span-2">
          <label className="label">Full name * <span className="font-normal text-slate-400">(surname first)</span></label>
          <input className="input" required placeholder="e.g. Okonkwo Adaeze Chioma"
            value={form.fullName} onChange={set("fullName")} />
        </div>
        <SelectField label="Gender" required value={form.gender} onChange={set("gender")}
          options={GENDERS} placeholder="Select gender" />
        <div>
          <label className="label">Phone number *</label>
          <input className="input" required type="tel" inputMode="tel" placeholder="e.g. 08031234567"
            value={form.phone} onChange={set("phone")} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Email address *</label>
          <input className="input" required type="email" placeholder="you@example.com"
            value={form.email} onChange={set("email")} />
        </div>
      </Section>

      <Section n="2" title="Academic details">
        <FacultyDepartmentFields
          required
          faculty={form.faculty}
          department={form.department}
          onChange={(v) => setForm((f) => ({ ...f, ...v }))}
        />
        <SelectField label="Level" required value={form.level} onChange={set("level")}
          options={LEVELS.map((l) => ({ value: l, label: `${l} Level` }))} placeholder="Select level" />
        <SelectField label="Year of entry" required value={form.entryYear} onChange={set("entryYear")}
          options={entryYears()} placeholder="Select year" />

        <div className="sm:col-span-2">
          <label className="label">Matric number *</label>
          <div className="flex items-center gap-2">
            <span className="input w-auto shrink-0 bg-slate-50 font-mono text-slate-500">
              {deptCode || "DEPT"}/{form.entryYear || "YEAR"}/
            </span>
            <input className="input font-mono" required inputMode="numeric" maxLength={4}
              placeholder="e.g. 034" value={form.matricSerial}
              onChange={(e) => set("matricSerial")(e.target.value.replace(/\D/g, ""))} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            The first parts come from your department and year of entry.
            {matricPreview && <> Your matric number: <b className="font-mono text-slate-800">{matricPreview}</b></>}
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className="label">JAMB registration number *</label>
          <input className="input font-mono uppercase" required placeholder="As printed on your JAMB result slip"
            value={form.jambRegNo} onChange={set("jambRegNo")} />
        </div>
      </Section>

      <Section n="3" title="Passport photograph & password">
        <div className="sm:col-span-2 flex items-center gap-4">
          {form.passportPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.passportPhoto} alt="Passport preview"
              className="h-24 w-24 rounded-lg object-cover ring-1 ring-slate-200" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-xs text-slate-400">
              No photo
            </div>
          )}
          <div>
            <label className="btn-ghost cursor-pointer">
              {form.passportPhoto ? "Change photo" : "Upload passport photo"}
              <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
            </label>
            <p className="mt-1 text-xs text-slate-500">
              A clear, recent photo of your face. The admin compares it with you and your
              JAMB result before enrolling your face.
            </p>
          </div>
        </div>
        <div>
          <label className="label">Password *</label>
          <input className="input" required type="password" minLength={6} autoComplete="new-password"
            value={form.password} onChange={set("password")} />
        </div>
        <div>
          <label className="label">Confirm password *</label>
          <input className="input" required type="password" minLength={6} autoComplete="new-password"
            value={form.confirm} onChange={set("confirm")} />
        </div>
      </Section>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button type="submit" disabled={saving} className="btn-primary w-full py-3">
        {saving ? "Creating your account…" : "Create my account"}
      </button>
    </form>
  );
}
