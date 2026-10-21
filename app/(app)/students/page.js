"use client";

import Link from "next/link";
import { useState } from "react";
import { useApi, formatDate } from "@/lib/client";
import { PageHeader, Card, Empty, Avatar, Badge } from "@/components/ui";
import { SelectField } from "@/components/fields";
import { DEPARTMENTS, LEVELS } from "@/lib/catalog";

const TABS = [
  { key: "awaiting", label: "Awaiting verification" },
  { key: "enrolled", label: "Face enrolled" },
  { key: "all", label: "All students" },
];

export default function StudentsPage() {
  const { data, loading, error } = useApi("/api/students");
  const all = data?.students || [];
  const awaitingCount = all.filter((s) => !s.faceSamples).length;

  const [tab, setTab] = useState(null); // null until the data decides the default
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");

  const activeTab = tab ?? (awaitingCount ? "awaiting" : "all");
  const q = query.trim().toLowerCase();
  const students = all.filter(
    (s) =>
      (activeTab === "all" ||
        (activeTab === "awaiting" ? !s.faceSamples : s.faceSamples > 0)) &&
      (!department || s.department === department) &&
      (!level || s.level === level) &&
      (!q || s.fullName.toLowerCase().includes(q) || s.matricNo.toLowerCase().includes(q))
  );

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Students register themselves online. Verify each one in person and capture their face."
      />

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 sm:w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              activeTab === t.key ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
            {t.key === "awaiting" && awaitingCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                {awaitingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Search</label>
          <input
            className="input"
            placeholder="Name or matric number…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <SelectField
          label="Department"
          value={department}
          onChange={setDepartment}
          placeholder="All departments"
          options={DEPARTMENTS.map((d) => d.name)}
        />
        <SelectField
          label="Level"
          value={level}
          onChange={setLevel}
          placeholder="All levels"
          options={LEVELS.map((l) => ({ value: l, label: `${l} Level` }))}
        />
      </div>

      {loading && <p className="text-sm text-slate-500">Loading students…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && students.length === 0 && (
        <Empty
          title={activeTab === "awaiting" ? "Nobody is waiting for verification" : "No students match"}
          description={
            activeTab === "awaiting"
              ? "Students appear here after registering online at /register. Verify them when they visit the office."
              : "Change the filters above, or ask students to register online."
          }
        />
      )}

      {students.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="th">Student</th>
                  <th className="th">Matric number</th>
                  <th className="th">Department</th>
                  <th className="th">Level</th>
                  <th className="th">Status</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50">
                    <td className="td">
                      <Link href={`/students/${s._id}`} className="flex items-center gap-3">
                        <Avatar src={s.photo} name={s.fullName} />
                        <span>
                          <span className="block font-medium text-slate-900">{s.fullName}</span>
                          {s.registeredOnline && (
                            <span className="text-xs text-slate-500">
                              Registered online {formatDate(s.createdAt, false)}
                            </span>
                          )}
                        </span>
                      </Link>
                    </td>
                    <td className="td font-mono text-xs">{s.matricNo}</td>
                    <td className="td">{s.department || "—"}</td>
                    <td className="td">{s.level || "—"}</td>
                    <td className="td">
                      {s.faceSamples > 0 ? (
                        <Badge tone="green">Face enrolled</Badge>
                      ) : (
                        <Badge tone="amber">Awaiting verification</Badge>
                      )}
                      {s.isActive === false && <Badge tone="slate">Inactive</Badge>}
                    </td>
                    <td className="td text-right">
                      <Link
                        href={`/students/${s._id}`}
                        className={s.faceSamples > 0 ? "text-xs font-medium text-brand-600 hover:underline" : "btn-primary py-1.5 text-xs"}
                      >
                        {s.faceSamples > 0 ? "View / edit" : "Verify & enrol"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
