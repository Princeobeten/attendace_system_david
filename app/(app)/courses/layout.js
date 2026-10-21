import { requireRole } from "@/lib/roles";

/** Course management and teaching are staff-only. */
export default async function CoursesLayout({ children }) {
  await requireRole(["admin", "lecturer"]);
  return children;
}
