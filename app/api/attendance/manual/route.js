import { Session, Attendance, Course } from "@/models";
import { ok, fail, handler, requireUser } from "@/lib/api";

/**
 * Fallback for the cases the literature flags as the weak spot of face
 * recognition — poor lighting, a camera failure, a student the model keeps
 * rejecting. Marked records are tagged `manual` so reports can distinguish
 * them from biometric ones.
 */
export const POST = handler(async (req) => {
  const auth = await requireUser(["admin", "lecturer"]);
  if (auth.response) return auth.response;

  const { sessionId, studentId, status = "present" } = await req.json();
  if (!sessionId || !studentId) return fail("sessionId and studentId are required");

  const session = await Session.findById(sessionId);
  if (!session) return fail("Session not found", 404);
  if (session.status !== "open") return fail("This session is closed", 409);

  const course = await Course.findById(session.course).lean();
  if (!course?.students?.some((s) => String(s) === String(studentId))) {
    return fail("That student is not registered on this course", 403);
  }

  const existing = await Attendance.findOne({ session: sessionId, student: studentId });
  if (existing) return fail("Student is already marked for this session", 409);

  await Attendance.create({
    session: sessionId,
    course: session.course,
    student: studentId,
    status,
    method: "manual",
    markedBy: auth.user.sub,
  });

  return ok({ success: true });
});
