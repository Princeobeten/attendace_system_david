import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User, Student } from "@/models";
import { signToken, setAuthCookie } from "@/lib/auth";
import { ok, fail, handler } from "@/lib/api";

const PORTAL_NAMES = { admin: "Administrator", lecturer: "Lecturer", student: "Student" };

export const POST = handler(async (req) => {
  const { email, password, portal } = await req.json();
  if (!email || !password) return fail("Enter your sign-in details and password");

  await connectDB();

  if (portal === "student") return studentLogin(email, password);

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    "+password"
  );
  if (!user) {
    // A matric number typed into the staff form is a student on the wrong tab.
    if (email.includes("/")) return fail("Students sign in on the Student tab.", 403);
    return fail("Invalid email or password", 401);
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return fail("Invalid email or password", 401);

  // Each role signs in through its own portal.
  if (portal && portal !== user.role) {
    const other = PORTAL_NAMES[user.role];
    return fail(`This is ${user.role === "admin" ? "an" : "a"} ${other.toLowerCase()} account. Use the ${other} sign-in tab.`, 403);
  }

  const token = await signToken({
    sub: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  });
  await setAuthCookie(token);

  return ok({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

/** Students sign in with their matriculation number. */
async function studentLogin(matricNo, password) {
  const student = await Student.findOne({ matricNo: matricNo.toUpperCase().trim() }).select(
    "+password"
  );
  if (!student) {
    if (await User.exists({ email: matricNo.toLowerCase().trim() })) {
      return fail("This is a staff account. Use the Lecturer or Administrator tab.", 403);
    }
    return fail("Invalid matric number or password", 401);
  }
  if (!student.password) {
    return fail("This record has no online account yet. Please visit the admin office.", 403);
  }
  if (!(await bcrypt.compare(password, student.password))) {
    return fail("Invalid matric number or password", 401);
  }
  if (!student.isActive) return fail("This student record has been deactivated", 403);

  await setAuthCookie(
    await signToken({
      sub: student._id.toString(),
      name: student.fullName,
      matricNo: student.matricNo,
      role: "student",
    })
  );
  return ok({ user: { id: student._id, name: student.fullName, role: "student" } });
}
