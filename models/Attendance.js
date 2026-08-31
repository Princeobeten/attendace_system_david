import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    status: { type: String, enum: ["present", "late"], default: "present" },
    method: { type: String, enum: ["face", "manual"], default: "face" },
    // Euclidean distance of the winning match — lower means a stronger match.
    matchDistance: { type: Number },
    confidence: { type: Number },
    markedAt: { type: Date, default: Date.now },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// One record per student per session — this is what makes repeated captures
// of the same face idempotent instead of duplicating attendance.
AttendanceSchema.index({ session: 1, student: 1 }, { unique: true });

export default mongoose.models.Attendance ||
  mongoose.model("Attendance", AttendanceSchema);
