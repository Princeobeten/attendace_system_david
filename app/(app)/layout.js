import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar
        user={{ name: user.name, email: user.email, role: user.role }}
      />
      <main className="min-w-0 flex-1 px-5 py-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
