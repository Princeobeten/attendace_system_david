import { requireRole } from "@/lib/roles";

/** Only lecturers take attendance; an admin is sent to the read-only register. */
export default async function CaptureLayout({ children, params }) {
  const { id } = await params;
  await requireRole("lecturer", `/sessions/${id}`);
  return children;
}
