import mongoose from "mongoose";
import { Student, Course, Session, Attendance } from "@/models";
import { ok, fail, handler, requireUser } from "@/lib/api";

/** The signed-in student's record, registration progress and attendance per course. */
export const GET = handler(async () => {
  const auth = await requireUser(["student"]);
  if (auth.response) return auth.response;

  const id = new mongoose.Types.ObjectId(auth.user.sub);
  const [student] = await Student.aggregate([
    { $match: { _id: id } },
    {
      $project: {
        matricNo: 1, fullName: 1, email: 1, phone: 1, gender: 1, faculty: 1,
        department: 1, level: 1, entryYear: 1, jambRegNo: 1, passportPhoto: 1,
        photo: 1, identityCheck: 1, createdAt: 1,
        faceSamples: { $size: { $ifNull: ["$faceDescriptors", []] } },
      },
    },
  ]);
  if (!student) return fail("Student record not found", 404);

  const courses = await Course.find({ students: id })
    .select("code title unit level semester requiredAttendance lecturer")
    .populate("lecturer", "name")
    .sort({ code: 1 })
    .lean();
  const courseIds = courses.map((c) => c._id);

  const [held, attended] = await Promise.all([
    Session.aggregate([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: "$course", total: { $sum: 1 } } },
    ]),
    Attendance.aggregate([
      { $match: { course: { $in: courseIds }, student: id } },
      { $group: { _id: "$course", total: { $sum: 1 }, late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } } } },
    ]),
  ]);
  const heldBy = Object.fromEntries(held.map((h) => [String(h._id), h.total]));
  const attendedBy = Object.fromEntries(attended.map((a) => [String(a._id), a]));

  return ok({
    student,
    courses: courses.map((c) => {
      const sessionsHeld = heldBy[String(c._id)] || 0;
      const present = attendedBy[String(c._id)]?.total || 0;
      const percentage = sessionsHeld ? Math.round((present / sessionsHeld) * 100) : null;
      const required = c.requiredAttendance ?? 75;
      return {
        ...c,
        sessionsHeld,
        attended: present,
        late: attendedBy[String(c._id)]?.late || 0,
        percentage,
        required,
        eligible: percentage === null ? null : percentage >= required,
      };
    }),
  });
});
