import mongoose from "mongoose";
import { Student, Attendance, Course } from "@/models";
import { ok, fail, handler, requireUser } from "@/lib/api";
import { isValidDescriptor } from "@/lib/face";

export const GET = handler(async (_req, { params }) => {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return fail("Student not found", 404);

  // Project the number of stored templates instead of the templates
  // themselves — the face vectors never leave the server.
  const [student] = await Student.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    {
      $project: {
        matricNo: 1,
        fullName: 1,
        email: 1,
        department: 1,
        level: 1,
        photo: 1,
        isActive: 1,
        createdAt: 1,
        faceSamples: { $size: { $ifNull: ["$faceDescriptors", []] } },
      },
    },
  ]);
  if (!student) return fail("Student not found", 404);

  const [courses, attendance] = await Promise.all([
    Course.find({ students: id }).select("code title").lean(),
    Attendance.find({ student: id })
      .populate("course", "code title")
      .populate("session", "startedAt title")
      .sort({ markedAt: -1 })
      .limit(50)
      .lean(),
  ]);

  return ok({ student, courses, attendance });
});

export const PATCH = handler(async (req, { params }) => {
  const auth = await requireUser(["admin"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const update = {};

  for (const field of ["fullName", "email", "department", "level", "isActive", "photo"]) {
    if (body[field] !== undefined) update[field] = body[field];
  }

  // Re-enrolling replaces the stored templates outright rather than appending,
  // so a bad enrolment can always be corrected.
  if (body.faceDescriptors) {
    if (!body.faceDescriptors.every(isValidDescriptor)) {
      return fail("One of the face samples is malformed — please recapture");
    }
    update.faceDescriptors = body.faceDescriptors;
  }

  const student = await Student.findByIdAndUpdate(id, update, { new: true });
  if (!student) return fail("Student not found", 404);
  return ok({ success: true });
});

export const DELETE = handler(async (_req, { params }) => {
  const auth = await requireUser(["admin"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  await Promise.all([
    Student.findByIdAndDelete(id),
    Attendance.deleteMany({ student: id }),
    Course.updateMany({ students: id }, { $pull: { students: id } }),
  ]);
  return ok({ success: true });
});
