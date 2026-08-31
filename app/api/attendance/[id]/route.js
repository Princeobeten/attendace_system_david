import { Attendance } from "@/models";
import { ok, fail, handler, requireUser } from "@/lib/api";

export const DELETE = handler(async (_req, { params }) => {
  const auth = await requireUser(["admin", "lecturer"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  const record = await Attendance.findByIdAndDelete(id);
  if (!record) return fail("Record not found", 404);
  return ok({ success: true });
});
