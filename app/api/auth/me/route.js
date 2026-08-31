import { getCurrentUser } from "@/lib/auth";
import { ok, fail, handler } from "@/lib/api";

export const GET = handler(async () => {
  const user = await getCurrentUser();
  if (!user) return fail("Not signed in", 401);
  return ok({ user });
});
