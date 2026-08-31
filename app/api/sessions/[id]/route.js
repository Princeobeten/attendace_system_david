import { Session, Course, Attendance } from "@/models";
import { ok, fail, handler, requireUser } from "@/lib/api";

export const GET = handler(async (_req, { params }) => {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { id } = await params;
  const session = await Session.findById(id)
    .populate("lecturer", "name email")
    .lean();
  if (!session) return fail("Session not found", 404);

  const course = await Course.findById(session.course)
    .populate("students", "matricNo fullName level photo")
    .lean();

  const records = await Attendance.find({ session: id })
    .populate("student", "matricNo fullName photo")
    .sort({ markedAt: 1 })
    .lean();

  const presentIds = new Set(records.map((r) => String(r.student?._id)));
  const absent = (course?.students || []).filter(
    (s) => !presentIds.has(String(s._id))
  );

  return ok({
    session: { ...session, course: { _id: course?._id, code: course?.code, title: course?.title } },
    records,
    absent,
    totalRegistered: course?.students?.length || 0,
  });
});

/** Close (or reopen) a session. */
export const PATCH = handler(async (req, { params }) => {
  const auth = await requireUser(["admin", "lecturer"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  const { status } = await req.json();
  if (!["open", "closed"].includes(status)) return fail("Invalid status");

  const session = await Session.findByIdAndUpdate(
    id,
    { status, closedAt: status === "closed" ? new Date() : null },
    { new: true }
  );
  if (!session) return fail("Session not found", 404);

  return ok({ session: { id: session._id, status: session.status } });
});

export const DELETE = handler(async (_req, { params }) => {
  const auth = await requireUser(["admin"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  await Promise.all([
    Session.findByIdAndDelete(id),
    Attendance.deleteMany({ session: id }),
  ]);
  return ok({ success: true });
});
