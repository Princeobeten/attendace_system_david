import mongoose from "mongoose";

/**
 * Staff account: either an `admin` (department officer) or a `lecturer`.
 * Students never log in — they are identified by their face.
 */
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["admin", "lecturer"],
      default: "lecturer",
    },
    staffId: { type: String, trim: true },
    department: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
