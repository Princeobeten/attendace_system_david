import mongoose from "mongoose";
import { Student } from "@/models";
import { ok, fail, handler, requireUser } from "@/lib/api";
import { isValidDescriptor, findBestMatch, euclideanDistance } from "@/lib/face";
import { ID_DOCUMENTS } from "@/lib/catalog";

/** Samples of one enrolment further apart than this are not the same person. */
const SAME_PERSON_DISTANCE = 0.6;

/**
 * Enrol (or re-enrol) a student's face. Admin only, in person.
 *
 * Three checks stand between a face and the register:
 *   1. The admin records which identity document was inspected and confirms
 *      the student matches its photograph (and the uploaded passport).
 *   2. All captured samples must be of the same person.
 *   3. The face must not already be enrolled under another matric number —
 *      one person can never hold two identities in the system.
 *
 * Body: { faceDescriptors: number[][], photo?, document, documentNo?, confirmed: true }
 */
export const POST = handler(async (req, { params }) => {
  const auth = await requireUser(["admin"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return fail("Student not found", 404);

  const { faceDescriptors, photo, document, documentNo, confirmed } = await req.json();

  if (!ID_DOCUMENTS.includes(document)) return fail("Select the identity document you checked");
  if (confirmed !== true) {
    return fail("Confirm that the student matches the photograph on their document");
  }
  if (!Array.isArray(faceDescriptors) || !faceDescriptors.length) {
    return fail("Capture the student's face first");
  }
  if (!faceDescriptors.every(isValidDescriptor)) {
    return fail("One of the face samples is malformed — please recapture");
  }
  for (let i = 1; i < faceDescriptors.length; i++) {
    if (euclideanDistance(faceDescriptors[0], faceDescriptors[i]) > SAME_PERSON_DISTANCE) {
      return fail("The captured samples are not all of the same person — please recapture", 422);
    }
  }

  const student = await Student.findById(id);
  if (!student) return fail("Student not found", 404);

  const others = await Student.find({ _id: { $ne: student._id }, "faceDescriptors.0": { $exists: true } })
    .select("+faceDescriptors matricNo fullName")
    .lean();
  for (const sample of faceDescriptors) {
    const match = findBestMatch(sample, others);
    if (match) {
      return fail(
        `This face is already enrolled for ${match.student.fullName} (${match.student.matricNo}). ` +
          "One person cannot be enrolled under two matric numbers.",
        409,
        { duplicateOf: { id: match.student._id, matricNo: match.student.matricNo } }
      );
    }
  }

  student.faceDescriptors = faceDescriptors;
  if (typeof photo === "string" && photo.startsWith("data:image/")) student.photo = photo;
  student.identityCheck = {
    document,
    documentNo: String(documentNo || student.jambRegNo || "").trim(),
    verifiedBy: auth.user.sub,
    verifiedAt: new Date(),
  };
  await student.save();

  return ok({ success: true });
});
