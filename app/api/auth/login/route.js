import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models";
import { signToken, setAuthCookie } from "@/lib/auth";
import { ok, fail, handler } from "@/lib/api";

export const POST = handler(async (req) => {
  const { email, password, portal } = await req.json();
  if (!email || !password) return fail("Email and password are required");

  await connectDB();

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    "+password"
  );
  if (!user) return fail("Invalid email or password", 401);

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return fail("Invalid email or password", 401);

  // Admins and lecturers sign in through separate portals.
  if (portal && portal !== user.role) {
    const other = user.role === "admin" ? "Administrator" : "Lecturer";
    return fail(`This is ${user.role === "admin" ? "an" : "a"} ${other.toLowerCase()} account. Use the ${other} sign-in tab.`, 403);
  }

  const token = await signToken({
    sub: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  });
  await setAuthCookie(token);

  return ok({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});
