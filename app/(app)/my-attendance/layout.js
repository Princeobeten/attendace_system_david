import { requireRole } from "@/lib/roles";

/** A student's own attendance history. */
export default async function MyAttendanceLayout({ children }) {
  await requireRole("student");
  return children;
}
