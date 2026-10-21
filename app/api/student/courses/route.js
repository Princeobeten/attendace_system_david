import mongoose from "mongoose";
import { Course, Attendance, Student } from "@/models";
import { ok, fail, handler, requireUser } from "@/lib/api";

/** Every course on offer, marked with whether the student has registered it. */
export const GET = handler(async () => {
  const auth = await requireUser(["student"]);
  if (auth.response) return auth.response;

  const [courses, me] = await Promise.all([
    Course.find({})
      .select("code title unit level semester department lecturer students")
      .populate("lecturer", "name")
      .sort({ code: 1 })
      .lean(),
    Student.findById(auth.user.sub).select("department level").lean(),
  ]);

  return ok({
    me: { department: me?.department || "", level: me?.level || "" },
    courses: courses.map(({ students, ...c }) => ({
      ...c,
      registered: (students || []).some((s) => String(s) === auth.user.sub),
    })),
  });
});

/** Register a course. */
export const POST = handler(async (req) => {
  const auth = await requireUser(["student"]);
  if (auth.response) return auth.response;

  const { courseId } = await req.json();
  if (!mongoose.isValidObjectId(courseId)) return fail("Choose a course");

  const course = await Course.findByIdAndUpdate(
    courseId,
    { $addToSet: { students: auth.user.sub } },
    { new: true }
  );
  if (!course) return fail("Course not found", 404);
  return ok({ success: true });
});

/** Drop a course — only while no attendance has been recorded for it. */
export const DELETE = handler(async (req) => {
  const auth = await requireUser(["student"]);
  if (auth.response) return auth.response;

  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!mongoose.isValidObjectId(courseId)) return fail("Choose a course");

  if (await Attendance.exists({ course: courseId, student: auth.user.sub })) {
    return fail("Attendance has already been recorded for you on this course. See the admin office to drop it.", 409);
  }

  const course = await Course.findByIdAndUpdate(courseId, { $pull: { students: auth.user.sub } });
  if (!course) return fail("Course not found", 404);
  return ok({ success: true });
});
