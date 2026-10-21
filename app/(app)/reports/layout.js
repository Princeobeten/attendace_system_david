import { requireRole } from "@/lib/roles";

/** Course reports are staff-only; students see their own attendance. */
export default async function ReportsLayout({ children }) {
  await requireRole(["admin", "lecturer"]);
  return children;
}
