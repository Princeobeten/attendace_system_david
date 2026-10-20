"use client";

import Link from "next/link";
import { useState } from "react";
import { useApi } from "@/lib/client";
import { PageHeader, Card, Empty, Avatar, Badge, LinkButton } from "@/components/ui";

export default function StudentsPage() {
  const [query, setQuery] = useState("");
  const { data, loading, error } = useApi("/api/students");

  const students = (data?.students || []).filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.matricNo.toLowerCase().includes(q) ||
      (s.department || "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Student records and their enrolled face templates."
        action={<LinkButton href="/students/new">+ Register student</LinkButton>}
      />

      <input
        className="input mb-4 max-w-sm"
        placeholder="Search by name, matric number or department…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && <p className="text-sm text-slate-500">Loading students…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && students.length === 0 && (
        <Empty
          title="No students yet"
          description="Register a student and capture their face to begin taking attendance."
          action={<LinkButton href="/students/new">Register student</LinkButton>}
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
                  <th className="th">Face template</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50">
                    <td className="td">
                      <Link
                        href={`/students/${s._id}`}
                        className="flex items-center gap-3"
                      >
                        <Avatar src={s.photo} name={s.fullName} />
                        <span className="font-medium text-slate-900">
                          {s.fullName}
                        </span>
                      </Link>
                    </td>
                    <td className="td font-mono text-xs">{s.matricNo}</td>
                    <td className="td">{s.department || "—"}</td>
                    <td className="td">{s.level || "—"}</td>
                    <td className="td">
                      {s.faceSamples > 0 ? (
                        <Badge tone="green">{s.faceSamples} samples</Badge>
                      ) : (
                        <Badge tone="red">Not enrolled</Badge>
                      )}
                    </td>
                    <td className="td text-right">
                      <Link
                        href={`/students/${s._id}`}
                        className="text-xs font-medium text-brand-600 hover:underline"
                      >
                        View / edit
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
