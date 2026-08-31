import { Session, Course, Attendance } from "@/models";
import { ok, fail, handler, requireUser } from "@/lib/api";

export const GET = handler(async (req) => {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const courseId = req.nextUrl.searchParams.get("course");
  const filter = {};
  if (courseId) filter.course = courseId;
  if (auth.user.role !== "admin") filter.lecturer = auth.user.sub;

  const sessions = await Session.find(filter)
    .populate("course", "code title")
    .populate("lecturer", "name")
    .sort({ startedAt: -1 })
    .limit(100)
    .lean();

  const counts = await Attendance.aggregate([
    { $match: { session: { $in: sessions.map((s) => s._id) } } },
    { $group: { _id: "$session", total: { $sum: 1 } } },
  ]);
  const bySession = Object.fromEntries(counts.map((c) => [String(c._id), c.total]));

  return ok({
    sessions: sessions.map((s) => ({
      ...s,
      presentCount: bySession[String(s._id)] || 0,
    })),
  });
});

export const POST = handler(async (req) => {
  const auth = await requireUser(["admin", "lecturer"]);
  if (auth.response) return auth.response;

  const { course, title, venue, lateAfterMinutes } = await req.json();
  if (!course) return fail("Choose a course for this session");

  const found = await Course.findById(course);
  if (!found) return fail("Course not found", 404);
  if (!found.students?.length) {
    return fail("Register students on this course before starting a session");
  }

  // Only one session per course may be open at a time, otherwise a face could
  // be captured into the wrong sitting.
  const alreadyOpen = await Session.findOne({ course, status: "open" });
  if (alreadyOpen) {
    return fail("This course already has an open session", 409, {
      sessionId: alreadyOpen._id,
    });
  }

  const session = await Session.create({
    course,
    lecturer: auth.user.sub,
    title: title || `${found.code} lecture`,
    venue,
    lateAfterMinutes: lateAfterMinutes ?? 15,
    startedAt: new Date(),
    status: "open",
  });

  return ok({ session: { id: session._id } }, { status: 201 });
});
