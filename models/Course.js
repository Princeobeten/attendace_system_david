import mongoose from "mongoose";

const CourseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    title: { type: String, required: true, trim: true },
    level: { type: String, trim: true },
    semester: { type: String, trim: true },
    unit: { type: Number, default: 3 },
    department: { type: String, trim: true },
    lecturer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
    // Minimum attendance percentage required to sit for the exam.
    requiredAttendance: { type: Number, default: 75 },
  },
  { timestamps: true }
);

export default mongoose.models.Course || mongoose.model("Course", CourseSchema);
