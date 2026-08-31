import { Course, Session, Attendance } from "@/models";
import { ok, fail, handler, requireUser } from "@/lib/api";

export const GET = handler(async (_req, { params }) => {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { id } = await params;
  const course = await Course.findById(id)
    .populate("lecturer", "name email")
    .populate("students", "matricNo fullName level department photo")
    .lean();

  if (!course) return fail("Course not found", 404);

  const sessions = await Session.find({ course: id })
    .sort({ startedAt: -1 })
    .lean();

  const counts = await Attendance.aggregate([
    { $match: { course: course._id } },
    { $group: { _id: "$session", total: { $sum: 1 } } },
  ]);
  const bySession = Object.fromEntries(counts.map((c) => [String(c._id), c.total]));

  return ok({
    course,
    sessions: sessions.map((s) => ({ ...s, presentCount: bySession[String(s._id)] || 0 })),
  });
});

export const PATCH = handler(async (req, { params }) => {
  const auth = await requireUser(["admin"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const update = {};
  for (const f of ["code", "title", "level", "unit", "department", "lecturer", "requiredAttendance"]) {
    if (body[f] !== undefined) update[f] = body[f] || undefined;
  }

  const course = await Course.findByIdAndUpdate(id, update, { new: true });
  if (!course) return fail("Course not found", 404);
  return ok({ success: true });
});

export const DELETE = handler(async (_req, { params }) => {
  const auth = await requireUser(["admin"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  await Promise.all([
    Course.findByIdAndDelete(id),
    Session.deleteMany({ course: id }),
    Attendance.deleteMany({ course: id }),
  ]);
  return ok({ success: true });
});
