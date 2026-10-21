"use client";

import Link from "next/link";
import { useState } from "react";
import { useApi, api } from "@/lib/client";
import { PageHeader, Card, Empty, Badge } from "@/components/ui";
import { useUser } from "@/components/UserProvider";
import CourseForm from "@/components/CourseForm";

export default function CoursesPage() {
  const { isAdmin } = useUser();
  const { data, loading, error, reload } = useApi("/api/courses");
  // Only admins create courses, so only they need the staff list.
  const { data: staff } = useApi(isAdmin ? "/api/users" : null);
  const lecturers = (staff?.users || []).filter((u) => u.role === "lecturer");
  const [open, setOpen] = useState(false);
  return (
    <div>
      <PageHeader
        title={isAdmin ? "Courses" : "My courses"}
        subtitle={
          isAdmin
            ? "Create courses, assign a lecturer and register students on them."
            : "Courses assigned to you by the administrator."
        }
        action={
          isAdmin && (
            <button onClick={() => setOpen((o) => !o)} className="btn-primary">
              {open ? "Close" : "+ New course"}
            </button>
          )
        }
      />

      {isAdmin && open && (
        <Card className="mb-6 p-5">
          <CourseForm
            lecturers={lecturers}
            submitLabel="Create course"
            onSubmit={async (course) => {
              await api("/api/courses", { method: "POST", body: course });
              setOpen(false);
              reload();
            }}
          />
        </Card>
      )}

      {loading && <p className="text-sm text-slate-500">Loading courses…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && data?.courses.length === 0 && (
        <Empty
          title={isAdmin ? "No courses yet" : "No course assigned to you"}
          description={
            isAdmin
              ? "Create a course, assign its lecturer and register students on it."
              : "Ask the administrator to assign you as the lecturer of a course."
          }
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
              {c.semester && <span>· {c.semester} semester</span>}
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
