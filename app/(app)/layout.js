import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import { UserProvider } from "@/components/UserProvider";

export default async function AppLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = { name: user.name, email: user.email, role: user.role };

  return (
    <UserProvider user={profile}>
      <div className="flex min-h-screen">
        <Sidebar user={profile} />
        <main className="min-w-0 flex-1 px-5 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </UserProvider>
  );
}
