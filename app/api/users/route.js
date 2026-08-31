import bcrypt from "bcryptjs";
import { User } from "@/models";
import { ok, fail, handler, requireUser } from "@/lib/api";

export const GET = handler(async () => {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const users = await User.find({}).select("name email role staffId department").lean();
  return ok({ users });
});

export const POST = handler(async (req) => {
  const auth = await requireUser(["admin"]);
  if (auth.response) return auth.response;

  const { name, email, password, role, staffId, department } = await req.json();
  if (!name || !email || !password) {
    return fail("Name, email and password are required");
  }
  if (password.length < 6) return fail("Password must be at least 6 characters");

  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 10),
    role: role === "admin" ? "admin" : "lecturer",
    staffId,
    department,
  });

  return ok({ user: { id: user._id, name, email } }, { status: 201 });
});
