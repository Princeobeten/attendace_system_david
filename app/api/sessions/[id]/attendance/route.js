import { Attendance } from "@/models";
import { ok, handler, requireUser } from "@/lib/api";

/** Live feed used by the capture screen to refresh the "marked" list. */
export const GET = handler(async (_req, { params }) => {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { id } = await params;
  const records = await Attendance.find({ session: id })
    .populate("student", "matricNo fullName photo")
    .sort({ markedAt: -1 })
    .lean();

  return ok({ records });
});
