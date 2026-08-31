import { Course } from "@/models";
import { ok, fail, handler, requireUser } from "@/lib/api";

export const GET = handler(async () => {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  // Lecturers only see the courses they teach; admins see everything.
  const filter =
    auth.user.role === "admin" ? {} : { lecturer: auth.user.sub };

  const courses = await Course.find(filter)
    .populate("lecturer", "name email")
    .sort({ code: 1 })
    .lean();

  return ok({
    courses: courses.map(({ students, ...c }) => ({
      ...c,
      studentCount: students?.length || 0,
    })),
  });
});

export const POST = handler(async (req) => {
  const auth = await requireUser(["admin"]);
  if (auth.response) return auth.response;

  const { code, title, level, unit, department, lecturer, requiredAttendance } =
    await req.json();

  if (!code || !title) return fail("Course code and title are required");

  const course = await Course.create({
    code,
    title,
    level,
    unit,
    department,
    lecturer: lecturer || undefined,
    requiredAttendance,
  });

  return ok({ course: { id: course._id, code, title } }, { status: 201 });
});
