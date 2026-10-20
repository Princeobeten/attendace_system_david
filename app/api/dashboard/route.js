import { Student, Course, Session, Attendance, User } from "@/models";
import { ok, handler, requireUser } from "@/lib/api";

/**
 * Admins get a department-wide overview (records to maintain); lecturers get
 * only their own courses and classes (attendance to take).
 */
export const GET = handler(async () => {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const sinceMidnight = new Date();
  sinceMidnight.setHours(0, 0, 0, 0);

  if (auth.user.role === "admin") return ok(await adminDashboard(sinceMidnight));
  return ok(await lecturerDashboard(auth.user.sub, sinceMidnight));
});

async function adminDashboard(sinceMidnight) {
  const [students, enrolledStudents, courses, unassignedCourses, lecturers, openSessions] =
    await Promise.all([
      Student.countDocuments({}),
      Student.countDocuments({ "faceDescriptors.0": { $exists: true } }),
      Course.countDocuments({}),
      Course.countDocuments({ lecturer: { $exists: false } }),
      User.countDocuments({ role: "lecturer" }),
      Session.find({ status: "open" })
        .populate("course", "code title")
        .populate("lecturer", "name")
        .sort({ startedAt: -1 })
        .lean(),
    ]);

  const [markedToday, recent] = await Promise.all([
    Attendance.countDocuments({ markedAt: { $gte: sinceMidnight } }),
    recentAttendance({}),
  ]);

  return {
    role: "admin",
    stats: {
      students,
      enrolledStudents,
      courses,
      unassignedCourses,
      lecturers,
      openSessions: openSessions.length,
      markedToday,
    },
    openSessions,
    recent,
  };
}

async function lecturerDashboard(userId, sinceMidnight) {
  const courses = await Course.find({ lecturer: userId })
    .select("code title level students requiredAttendance")
    .sort({ code: 1 })
    .lean();
  const courseIds = courses.map((c) => c._id);

  const [openSessions, sessionsHeld, markedToday, byMethod, recent] = await Promise.all([
    Session.find({ course: { $in: courseIds }, status: "open" })
      .populate("course", "code title")
      .sort({ startedAt: -1 })
      .lean(),
    Session.countDocuments({ course: { $in: courseIds } }),
    Attendance.countDocuments({
      course: { $in: courseIds },
      markedAt: { $gte: sinceMidnight },
    }),
    Attendance.aggregate([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: "$method", total: { $sum: 1 } } },
    ]),
    recentAttendance({ course: { $in: courseIds } }),
  ]);

  return {
    role: "lecturer",
    stats: {
      courses: courses.length,
      students: new Set(courses.flatMap((c) => c.students.map(String))).size,
      sessionsHeld,
      openSessions: openSessions.length,
      markedToday,
      faceMarked: byMethod.find((m) => m._id === "face")?.total || 0,
      manualMarked: byMethod.find((m) => m._id === "manual")?.total || 0,
    },
    courses: courses.map(({ students, ...c }) => ({ ...c, studentCount: students.length })),
    openSessions,
    recent,
  };
}

function recentAttendance(filter) {
  return Attendance.find(filter)
    .populate("student", "fullName matricNo photo")
    .populate("course", "code")
    .sort({ markedAt: -1 })
    .limit(8)
    .lean();
}
