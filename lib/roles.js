import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/**
 * Server-side page guard for layouts. Sends staff whose role is not allowed
 * back to their own dashboard; the API enforces the same rules.
 */
export async function requireRole(role, fallback = "/dashboard") {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== role) redirect(fallback);
  return user;
}
