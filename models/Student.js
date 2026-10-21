import mongoose from "mongoose";

/**
 * A student and their enrolled face templates.
 *
 * Students create their own account online (personal details, passport
 * photograph, course registration). Their face is enrolled only in person by
 * an administrator, after checking them against the photograph on their JAMB
 * result or admission letter — so nobody can enrol a face for someone else.
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
    phone: { type: String, trim: true },
    gender: { type: String, trim: true },
    faculty: { type: String, trim: true },
    department: { type: String, trim: true },
    level: { type: String, trim: true },
    entryYear: { type: String, trim: true },
    jambRegNo: { type: String, uppercase: true, trim: true },
    // Uploaded at online registration; the admin compares it with the person.
    passportPhoto: { type: String, select: false },
    password: { type: String, select: false },
    photo: { type: String }, // thumbnail from face enrolment, for display only
    faceDescriptors: {
      type: [[Number]],
      default: [],
      select: false, // large; only loaded when matching
    },
    // Who checked the student's identity before their face was enrolled.
    identityCheck: {
      document: { type: String },
      documentNo: { type: String },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      verifiedAt: { type: Date },
    },
    registeredOnline: { type: Boolean, default: false },
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
