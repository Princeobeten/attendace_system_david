import mongoose from "mongoose";

/**
 * A student and their enrolled face templates.
 *
 * `faceDescriptors` holds one or more 128-dimension vectors produced by the
 * face-recognition network at enrolment time. Recognition compares a live
 * descriptor against these using euclidean distance. The raw face image is
 * never needed for matching — only the vector — which keeps the biometric
 * data non-reversible.
 */
const StudentSchema = new mongoose.Schema(
  {
    matricNo: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    department: { type: String, trim: true },
    level: { type: String, trim: true },
    photo: { type: String }, // base64 thumbnail, for display only
    faceDescriptors: {
      type: [[Number]],
      default: [],
      select: false, // large; only loaded when matching
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

StudentSchema.virtual("isEnrolledForFace").get(function () {
  return Array.isArray(this.faceDescriptors) && this.faceDescriptors.length > 0;
});

StudentSchema.set("toJSON", { virtuals: true });

export default mongoose.models.Student ||
  mongoose.model("Student", StudentSchema);
