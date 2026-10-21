import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Student, Attendance, Course } from "@/models";
import { ok, fail, handler, requireUser } from "@/lib/api";

export const GET = handler(async (_req, { params }) => {
  const auth = await requireUser(["admin"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return fail("Student not found", 404);

  // Project the number of stored templates instead of the templates
  // themselves — the face vectors never leave the server.
  const [student] = await Student.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    {
      $lookup: {
        from: "users",
        localField: "identityCheck.verifiedBy",
        foreignField: "_id",
        as: "verifier",
        pipeline: [{ $project: { name: 1 } }],
      },
    },
    {
      $project: {
        matricNo: 1, fullName: 1, email: 1, phone: 1, gender: 1, faculty: 1,
        department: 1, level: 1, entryYear: 1, jambRegNo: 1, passportPhoto: 1,
        photo: 1, isActive: 1, registeredOnline: 1, createdAt: 1, identityCheck: 1,
        verifiedByName: { $first: "$verifier.name" },
        hasPassword: { $gt: [{ $strLenCP: { $ifNull: ["$password", ""] } }, 0] },
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

const EDITABLE = [
  "matricNo", "fullName", "email", "phone", "gender", "faculty",
  "department", "level", "entryYear", "jambRegNo", "isActive",
];

/** Correct a student's details. Faces are enrolled through ./enrol instead. */
export const PATCH = handler(async (req, { params }) => {
  const auth = await requireUser(["admin"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const update = {};

  for (const field of EDITABLE) {
    if (body[field] !== undefined) update[field] = body[field];
  }
  if (update.matricNo !== undefined && !String(update.matricNo).trim()) {
    return fail("Matriculation number cannot be empty");
  }
  if (update.fullName !== undefined && !String(update.fullName).trim()) {
    return fail("Full name cannot be empty");
  }
  // Lets the admin office reset a forgotten password.
  if (body.newPassword) {
    if (String(body.newPassword).length < 6) return fail("Password must be at least 6 characters");
    update.password = await bcrypt.hash(String(body.newPassword), 10);
  }

  const student = await Student.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  });
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
