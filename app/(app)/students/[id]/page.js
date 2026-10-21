"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApi, api, formatDate } from "@/lib/client";
import { PageHeader, Card, Avatar, Badge } from "@/components/ui";
import { SelectField, FacultyDepartmentFields } from "@/components/fields";
import FaceEnroll from "@/components/FaceEnroll";
import { ID_DOCUMENTS, LEVELS, GENDERS, entryYears } from "@/lib/catalog";

export default function StudentPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, loading, error, reload } = useApi(`/api/students/${id}`);
  const [reenrol, setReenrol] = useState(false);
  const [editing, setEditing] = useState(false);

  if (loading) return <p className="text-sm text-slate-500">Loading student…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const { student, courses, attendance } = data;
  const enrolled = student.faceSamples > 0;
  const showEnrol = !enrolled || reenrol;

  async function remove() {
    if (!confirm(`Delete ${student.fullName} and all their attendance records?`)) return;
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
            <button onClick={() => setEditing((e) => !e)} className="btn-ghost">
              {editing ? "Cancel editing" : "Edit details"}
            </button>
            {enrolled && (
              <button onClick={() => setReenrol((r) => !r)} className="btn-ghost">
                {reenrol ? "Cancel re-enrolment" : "Re-enrol face"}
              </button>
            )}
            <button onClick={remove} className="btn-danger">
              Delete
            </button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <Avatar src={student.photo || student.passportPhoto} name={student.fullName} size={64} />
            <div>
              <p className="font-semibold text-slate-900">{student.fullName}</p>
              <p className="font-mono text-xs text-slate-500">{student.matricNo}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {enrolled ? (
                  <Badge tone="green">Face enrolled · {student.faceSamples} samples</Badge>
                ) : (
                  <Badge tone="amber">Awaiting verification</Badge>
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
                ["JAMB reg. no.", student.jambRegNo || "—"],
                ["Gender", student.gender || "—"],
                ["Phone", student.phone || "—"],
                ["Email", student.email || "—"],
                ["Faculty", student.faculty || "—"],
                ["Department", student.department || "—"],
                ["Level", student.level ? `${student.level} Level` : "—"],
                ["Year of entry", student.entryYear || "—"],
                ["Online account", student.hasPassword ? "Yes" : "No"],
                ["Registered", formatDate(student.createdAt, false)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-medium text-slate-800">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {student.identityCheck?.verifiedAt && (
            <div className="mt-6 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">
              <p className="font-semibold">Identity verified</p>
              <p className="mt-1">
                {student.identityCheck.document}
                {student.identityCheck.documentNo ? ` (${student.identityCheck.documentNo})` : ""}
                <br />
                by {student.verifiedByName || "an administrator"} on{" "}
                {formatDate(student.identityCheck.verifiedAt)}
              </p>
            </div>
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
          {showEnrol ? (
            <VerifyAndEnrol
              student={student}
              onDone={() => {
                setReenrol(false);
                reload();
              }}
            />
          ) : (
            <AttendanceHistory attendance={attendance} />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The in-person step: check the student against their document, then capture
 * their face. The camera stays locked until the identity check is complete.
 */
function VerifyAndEnrol({ student, onDone }) {
  const [document, setDocument] = useState("");
  const [documentNo, setDocumentNo] = useState(student.jambRegNo || "");
  const [confirmed, setConfirmed] = useState(false);
  const [descriptors, setDescriptors] = useState([]);
  const [photo, setPhoto] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const checkDone = Boolean(document) && confirmed;

  async function save() {
    setError("");
    setSaving(true);
    try {
      await api(`/api/students/${student._id}/enrol`, {
        method: "POST",
        body: { faceDescriptors: descriptors, photo, document, documentNo, confirmed },
      });
      onDone();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">1</span>
          Check the student&apos;s identity
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Compare the person in front of you with the passport photo they uploaded and the
          photograph on their JAMB result or admission letter.
        </p>

        <div className="mt-4 grid gap-5 sm:grid-cols-[auto_1fr]">
          <div className="text-center">
            {student.passportPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={student.passportPhoto}
                alt={`Passport photo of ${student.fullName}`}
                className="h-36 w-36 rounded-lg object-cover ring-1 ring-slate-200"
              />
            ) : (
              <div className="flex h-36 w-36 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-3 text-xs text-slate-400">
                No passport photo uploaded
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">Uploaded at registration</p>
          </div>

          <div className="space-y-4">
            <SelectField
              label="Document checked"
              required
              value={document}
              onChange={setDocument}
              options={ID_DOCUMENTS}
              placeholder="Select the document presented"
            />
            <div>
              <label className="label">Document / JAMB number</label>
              <input
                className="input font-mono"
                value={documentNo}
                onChange={(e) => setDocumentNo(e.target.value)}
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              I have seen this student in person, and they match the photograph on the
              document and the uploaded passport.
            </label>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">2</span>
          Capture the face
        </h2>
        <FaceEnroll
          initialCount={student.faceSamples}
          locked={checkDone ? "" : "Complete the identity check above to unlock the camera."}
          onChange={(d, thumb) => {
            setDescriptors(d);
            setPhoto(thumb || "");
            setError("");
          }}
        />
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        onClick={save}
        disabled={!checkDone || !descriptors.length || saving}
        className="btn-primary w-full py-3"
      >
        {saving ? "Saving…" : "Verify student & save face"}
      </button>
    </div>
  );
}

function AttendanceHistory({ attendance }) {
  return (
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
                    <Badge tone={a.status === "late" ? "amber" : "green"}>{a.status}</Badge>
                  </td>
                  <td className="td capitalize">{a.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
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
    phone: student.phone || "",
    gender: student.gender || "",
    faculty: student.faculty || "",
    department: student.department || "",
    level: student.level || "",
    entryYear: student.entryYear || "",
    jambRegNo: student.jambRegNo || "",
    isActive: student.isActive !== false,
    newPassword: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: typeof v === "string" ? v : v.target.value }));
  const years = entryYears();
  if (form.entryYear && !years.includes(form.entryYear)) years.push(form.entryYear);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const { newPassword, ...rest } = form;
      await api(`/api/students/${student._id}`, {
        method: "PATCH",
        body: newPassword ? { ...rest, newPassword } : rest,
      });
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
        <input className="input font-mono" required value={form.matricNo} onChange={set("matricNo")} />
      </div>
      <div>
        <label className="label">Full name *</label>
        <input className="input" required value={form.fullName} onChange={set("fullName")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Gender" value={form.gender} onChange={set("gender")} options={GENDERS} />
        <div>
          <label className="label">Phone</label>
          <input className="input" type="tel" value={form.phone} onChange={set("phone")} />
        </div>
      </div>
      <div>
        <label className="label">Email address</label>
        <input className="input" type="email" value={form.email} onChange={set("email")} />
      </div>
      <FacultyDepartmentFields
        faculty={form.faculty}
        department={form.department}
        onChange={(v) => setForm((f) => ({ ...f, ...v }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Level"
          value={form.level}
          onChange={set("level")}
          options={LEVELS.map((l) => ({ value: l, label: `${l} Level` }))}
        />
        <SelectField label="Year of entry" value={form.entryYear} onChange={set("entryYear")} options={years} />
      </div>
      <div>
        <label className="label">JAMB registration number</label>
        <input className="input font-mono uppercase" value={form.jambRegNo} onChange={set("jambRegNo")} />
      </div>
      <div>
        <label className="label">Reset password <span className="font-normal text-slate-400">(optional)</span></label>
        <input
          className="input"
          type="password"
          minLength={6}
          autoComplete="new-password"
          placeholder="Leave blank to keep the current password"
          value={form.newPassword}
          onChange={set("newPassword")}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
        />
        Active (inactive students are not recognised in class)
      </label>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
