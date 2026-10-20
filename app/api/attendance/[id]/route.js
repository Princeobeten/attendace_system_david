import { Attendance, Course } from "@/models";
import { ok, fail, handler, requireUser, teaches } from "@/lib/api";

/** Remove a wrongly-marked record. Only the course's own lecturer may do this. */
export const DELETE = handler(async (_req, { params }) => {
  const auth = await requireUser(["lecturer"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  const record = await Attendance.findById(id);
  if (!record) return fail("Record not found", 404);

  const course = await Course.findById(record.course).select("lecturer").lean();
  if (!teaches(auth.user, course)) {
    return fail("Only the lecturer of this course can change its register", 403);
  }

  await record.deleteOne();
  return ok({ success: true });
});
