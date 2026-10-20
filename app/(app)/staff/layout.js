import { requireRole } from "@/lib/roles";

/** Staff accounts are created by the administrator only. */
export default async function StaffLayout({ children }) {
  await requireRole("admin");
  return children;
}
