import { requireRole } from "@/lib/roles";

/** Course registration is for students. */
export default async function MyCoursesLayout({ children }) {
  await requireRole("student");
  return children;
}
