import { Course, Session, Attendance } from "@/models";
import { ok, fail, handler, requireUser } from "@/lib/api";

/**
 * Attendance register for a course: every registered student against every
 * session held, plus the percentage used for exam eligibility.
 */
export const GET = handler(async (_req, { params }) => {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { id } = await params;
  const course = await Course.findById(id)
    .populate("students", "matricNo fullName level department")
    .populate("lecturer", "name")
    .lean();
  if (!course) return fail("Course not found", 404);

  const sessions = await Session.find({ course: id }).sort({ startedAt: 1 }).lean();
  const records = await Attendance.find({ course: id }).lean();

  // key: "studentId:sessionId" -> "present" | "late"
  const grid = new Map();
  for (const r of records) {
    grid.set(`${r.student}:${r.session}`, r.status);
  }

  const held = sessions.length;
  const rows = (course.students || []).map((student) => {
    const marks = sessions.map(
      (s) => grid.get(`${student._id}:${s._id}`) || "absent"
    );
    const attended = marks.filter((m) => m !== "absent").length;
    const percentage = held ? Math.round((attended / held) * 100) : 0;
    return {
      student,
      marks,
      attended,
      percentage,
      eligible: percentage >= (course.requiredAttendance ?? 75),
    };
  });

  rows.sort((a, b) => b.percentage - a.percentage);

  return ok({
    course: {
      _id: course._id,
      code: course.code,
      title: course.title,
      lecturer: course.lecturer,
      requiredAttendance: course.requiredAttendance ?? 75,
    },
    sessions: sessions.map((s) => ({
      _id: s._id,
      title: s.title,
      startedAt: s.startedAt,
      status: s.status,
    })),
    rows,
    summary: {
      sessionsHeld: held,
      registered: rows.length,
      averageAttendance: rows.length
        ? Math.round(rows.reduce((a, r) => a + r.percentage, 0) / rows.length)
        : 0,
      atRisk: rows.filter((r) => !r.eligible).length,
    },
  });
});
