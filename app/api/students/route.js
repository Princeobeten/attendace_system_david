import { Student } from "@/models";
import { ok, fail, handler, requireUser } from "@/lib/api";
import { isValidDescriptor } from "@/lib/face";

export const GET = handler(async (req) => {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const q = req.nextUrl.searchParams.get("q");
  const filter = q
    ? {
        $or: [
          { fullName: { $regex: q, $options: "i" } },
          { matricNo: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  // Count the stored templates in the database rather than shipping every
  // 128-number vector to the browser just to display "3 samples".
  const students = await Student.aggregate([
    { $match: filter },
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
    { $sort: { fullName: 1 } },
  ]);

  return ok({ students });
});

export const POST = handler(async (req) => {
  const auth = await requireUser(["admin"]);
  if (auth.response) return auth.response;

  const body = await req.json();
  const { matricNo, fullName, email, department, level, photo } = body;
  const descriptors = body.faceDescriptors || [];

  if (!matricNo || !fullName) {
    return fail("Matriculation number and full name are required");
  }
  if (!Array.isArray(descriptors) || descriptors.length === 0) {
    return fail("Capture at least one face sample before saving");
  }
  if (!descriptors.every(isValidDescriptor)) {
    return fail("One of the face samples is malformed — please recapture");
  }

  const student = await Student.create({
    matricNo,
    fullName,
    email,
    department,
    level,
    photo,
    faceDescriptors: descriptors,
  });

  return ok({ student: { id: student._id, matricNo, fullName } }, { status: 201 });
});
