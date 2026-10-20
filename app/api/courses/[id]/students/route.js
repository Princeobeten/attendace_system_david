import { Course } from "@/models";
import { ok, fail, handler, requireUser } from "@/lib/api";

/** Register students on a course (admin only — lecturers cannot change the class list). */
export const POST = handler(async (req, { params }) => {
  const auth = await requireUser(["admin"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  const { studentIds } = await req.json();
  if (!Array.isArray(studentIds) || !studentIds.length) {
    return fail("Select at least one student");
  }

  const course = await Course.findByIdAndUpdate(
    id,
    { $addToSet: { students: { $each: studentIds } } },
    { new: true }
  );
  if (!course) return fail("Course not found", 404);

  return ok({ studentCount: course.students.length });
});

/** Remove a student from a course. */
export const DELETE = handler(async (req, { params }) => {
  const auth = await requireUser(["admin"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  const studentId = req.nextUrl.searchParams.get("studentId");
  if (!studentId) return fail("studentId is required");

  const course = await Course.findByIdAndUpdate(
    id,
    { $pull: { students: studentId } },
    { new: true }
  );
  if (!course) return fail("Course not found", 404);

  return ok({ studentCount: course.students.length });
});
