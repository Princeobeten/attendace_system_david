import { Session, Course, Student, Attendance } from "@/models";
import { ok, fail, handler, requireUser, teaches } from "@/lib/api";
import { findBestMatch, isValidDescriptor, MATCH_THRESHOLD } from "@/lib/face";

/**
 * Recognise faces and mark attendance.
 *
 * The browser does the vision work (detect faces in the video frame and turn
 * each one into a 128-number descriptor) because that needs the camera. The
 * *matching* deliberately happens here on the server: the enrolled face
 * templates never leave the database, and a client cannot mark a student
 * present simply by naming them — it has to produce a face that matches.
 *
 * Body: { sessionId, descriptors: number[][] }
 */
export const POST = handler(async (req) => {
  const auth = await requireUser(["lecturer"]);
  if (auth.response) return auth.response;

  const { sessionId, descriptors } = await req.json();
  if (!sessionId) return fail("sessionId is required");
  if (!Array.isArray(descriptors) || descriptors.length === 0) {
    return ok({ results: [], marked: 0 });
  }
  if (descriptors.length > 20) return fail("Too many faces in one request");
  if (!descriptors.every(isValidDescriptor)) {
    return fail("Malformed face descriptor received");
  }

  const session = await Session.findById(sessionId);
  if (!session) return fail("Session not found", 404);
  if (session.status !== "open") {
    return fail("This session is closed — attendance can no longer be taken", 409);
  }

  const course = await Course.findById(session.course).lean();
  if (!course) return fail("Course not found", 404);
  if (!teaches(auth.user, course)) {
    return fail("Only the lecturer of this course can take its attendance", 403);
  }

  // Only students registered on THIS course are candidates. This narrows the
  // search (faster and more accurate) and stops an outsider being marked.
  const students = await Student.find({
    _id: { $in: course.students },
    isActive: true,
  })
    .select("+faceDescriptors matricNo fullName photo")
    .lean();

  const enrolled = students.filter((s) => s.faceDescriptors?.length);

  const lateCutoff = new Date(
    new Date(session.startedAt).getTime() + (session.lateAfterMinutes || 0) * 60000
  );

  const results = [];
  const seen = new Set();
  let marked = 0;

  for (const descriptor of descriptors) {
    const match = findBestMatch(descriptor, enrolled);

    if (!match) {
      results.push({ recognised: false, label: "Unknown" });
      continue;
    }

    const studentId = String(match.student._id);

    // The same person can appear twice in one frame's detections; only act once.
    if (seen.has(studentId)) {
      results.push({
        recognised: true,
        studentId,
        name: match.student.fullName,
        matricNo: match.student.matricNo,
        distance: Number(match.distance.toFixed(3)),
        alreadyMarked: true,
      });
      continue;
    }
    seen.add(studentId);

    const now = new Date();
    const status = now > lateCutoff ? "late" : "present";

    // Keyed on (session, student): re-recognising a student who is already
    // marked is a no-op, so a face can stay in frame harmlessly.
    let existing = await Attendance.findOne({
      session: session._id,
      student: studentId,
    }).lean();

    if (!existing) {
      try {
        await Attendance.create({
          session: session._id,
          course: course._id,
          student: studentId,
          status,
          method: "face",
          matchDistance: match.distance,
          confidence: match.confidence,
          markedAt: now,
          markedBy: auth.user.sub,
        });
        marked += 1;
      } catch (err) {
        // Another camera marked this student a moment earlier; the unique
        // index rejected the duplicate, so treat it as already marked.
        if (err?.code !== 11000) throw err;
        existing = await Attendance.findOne({
          session: session._id,
          student: studentId,
        }).lean();
      }
    }

    results.push({
      recognised: true,
      studentId,
      name: match.student.fullName,
      matricNo: match.student.matricNo,
      photo: match.student.photo,
      distance: Number(match.distance.toFixed(3)),
      confidence: Number(match.confidence.toFixed(2)),
      status: existing ? existing.status : status,
      alreadyMarked: Boolean(existing),
    });
  }

  return ok({
    results,
    marked,
    threshold: MATCH_THRESHOLD,
    candidates: enrolled.length,
  });
});
