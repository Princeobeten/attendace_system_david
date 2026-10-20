import { requireRole } from "@/lib/roles";

/** Student records are maintained by the administrator only. */
export default async function StudentsLayout({ children }) {
  await requireRole("admin");
  return children;
}
