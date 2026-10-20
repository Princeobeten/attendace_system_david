import { Attendance, Course, Session } from "@/models";
import { ok, fail, handler, requireUser, canView } from "@/lib/api";

/** Live feed used by the capture screen to refresh the "marked" list. */
export const GET = handler(async (_req, { params }) => {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { id } = await params;
  const session = await Session.findById(id).select("course").lean();
  if (!session) return fail("Session not found", 404);
  const course = await Course.findById(session.course).select("lecturer").lean();
  if (!canView(auth.user, course)) return fail("This course is not assigned to you", 403);

  const records = await Attendance.find({ session: id })
    .populate("student", "matricNo fullName photo")
    .sort({ markedAt: -1 })
    .lean();

  return ok({ records });
});
