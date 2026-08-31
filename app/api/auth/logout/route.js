import { clearAuthCookie } from "@/lib/auth";
import { ok, handler } from "@/lib/api";

export const POST = handler(async () => {
  await clearAuthCookie();
  return ok({ success: true });
});
