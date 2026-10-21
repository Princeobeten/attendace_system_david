import { Attendance } from "@/models";
import { ok, handler, requireUser } from "@/lib/api";

/** The signed-in student's own attendance records, newest first. */
export const GET = handler(async () => {
  const auth = await requireUser(["student"]);
  if (auth.response) return auth.response;

  const records = await Attendance.find({ student: auth.user.sub })
    .populate("course", "code title")
    .populate("session", "title startedAt venue")
    .sort({ markedAt: -1 })
    .limit(200)
    .lean();

  return ok({ records });
});
