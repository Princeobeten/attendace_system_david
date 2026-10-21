import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/**
 * Server-side page guard for layouts. Sends anyone whose role is not allowed
 * back to their own dashboard; the API enforces the same rules.
 *
 * @param {string|string[]} roles  allowed role(s)
 */
export async function requireRole(roles, fallback = "/dashboard") {
  const allowed = Array.isArray(roles) ? roles : [roles];
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!allowed.includes(user.role)) redirect(fallback);
  return user;
}
