import { Student, Course, Session, Attendance } from "@/models";
import { ok, handler, requireUser } from "@/lib/api";

export const GET = handler(async () => {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const courseFilter = auth.user.role === "admin" ? {} : { lecturer: auth.user.sub };

  const [students, enrolledStudents, courses, openSessions] = await Promise.all([
    Student.countDocuments({}),
    Student.countDocuments({ "faceDescriptors.0": { $exists: true } }),
    Course.countDocuments(courseFilter),
    Session.find({ status: "open" })
      .populate("course", "code title")
      .sort({ startedAt: -1 })
      .lean(),
  ]);

  const sinceMidnight = new Date();
  sinceMidnight.setHours(0, 0, 0, 0);

  const [markedToday, recent, byMethod] = await Promise.all([
    Attendance.countDocuments({ markedAt: { $gte: sinceMidnight } }),
    Attendance.find({})
      .populate("student", "fullName matricNo photo")
      .populate("course", "code")
      .sort({ markedAt: -1 })
      .limit(8)
      .lean(),
    Attendance.aggregate([{ $group: { _id: "$method", total: { $sum: 1 } } }]),
  ]);

  return ok({
    stats: {
      students,
      enrolledStudents,
      courses,
      openSessions: openSessions.length,
      markedToday,
      faceMarked: byMethod.find((m) => m._id === "face")?.total || 0,
      manualMarked: byMethod.find((m) => m._id === "manual")?.total || 0,
    },
    openSessions,
    recent,
  });
});
