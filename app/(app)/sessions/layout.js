import { requireRole } from "@/lib/roles";

/** Lecture sessions are staff-only. */
export default async function SessionsLayout({ children }) {
  await requireRole(["admin", "lecturer"]);
  return children;
}
