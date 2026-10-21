import { Student } from "@/models";
import { ok, handler, requireUser } from "@/lib/api";

/**
 * The student roll. Students create their own records online
 * (POST /api/auth/register); the admin verifies and enrols them.
 */
export const GET = handler(async (req) => {
  const auth = await requireUser(["admin"]);
  if (auth.response) return auth.response;

  // Escape the search text so "(" or "*" are matched literally.
  const q = req.nextUrl.searchParams.get("q")?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
        jambRegNo: 1,
        photo: 1,
        isActive: 1,
        registeredOnline: 1,
        createdAt: 1,
        verifiedAt: "$identityCheck.verifiedAt",
        faceSamples: { $size: { $ifNull: ["$faceDescriptors", []] } },
      },
    },
    { $sort: { fullName: 1 } },
  ]);

  return ok({ students });
});
