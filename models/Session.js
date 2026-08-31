import mongoose from "mongoose";

/**
 * A single lecture sitting. Attendance can only be captured while a session
 * is `open`, which is what stops students from being marked outside class.
 */
const SessionSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    lecturer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: { type: String, trim: true },
    venue: { type: String, trim: true },
    startedAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    // Students recognised after this many minutes are marked "late".
    lateAfterMinutes: { type: Number, default: 15 },
  },
  { timestamps: true }
);

SessionSchema.index({ course: 1, startedAt: -1 });

export default mongoose.models.Session || mongoose.model("Session", SessionSchema);
