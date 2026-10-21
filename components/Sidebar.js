"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

// Admins maintain records; lecturers run classes and take attendance.
const NAV = {
  admin: [
    { href: "/dashboard", label: "Dashboard", icon: "▤" },
    { href: "/students", label: "Students", icon: "👥" },
    { href: "/courses", label: "Courses", icon: "📚" },
    { href: "/staff", label: "Staff accounts", icon: "🔑" },
    { href: "/sessions", label: "Session monitor", icon: "🎥" },
    { href: "/reports", label: "Attendance reports", icon: "📊" },
  ],
  lecturer: [
    { href: "/dashboard", label: "Dashboard", icon: "▤" },
    { href: "/courses", label: "My courses", icon: "📚" },
    { href: "/sessions", label: "My lecture sessions", icon: "🎥" },
    { href: "/reports", label: "Attendance reports", icon: "📊" },
  ],
  student: [
    { href: "/dashboard", label: "Dashboard", icon: "▤" },
    { href: "/my-courses", label: "Course registration", icon: "📚" },
    { href: "/my-attendance", label: "My attendance", icon: "📊" },
  ],
};

const PORTAL = {
  admin: "Administrator portal",
  lecturer: "Lecturer portal",
  student: "Student portal",
};

const PORTAL_STYLE = {
  admin: "bg-amber-50 text-amber-800",
  lecturer: "bg-emerald-50 text-emerald-800",
  student: "bg-sky-50 text-sky-800",
};

export default function Sidebar({ user }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const links = NAV[user.role] || NAV.lecturer;

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <span className="font-bold text-brand-700">◎ FaceTrack</span>
        <button
          onClick={() => setOpen((o) => !o)}
          className="btn-ghost px-3 py-1.5"
          aria-label="Toggle navigation"
        >
          ☰
        </button>
      </div>

      <aside
        className={`${
          open ? "flex" : "hidden"
        } fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-slate-200 bg-white pt-16 lg:sticky lg:top-0 lg:flex lg:h-screen lg:pt-0`}
      >
        <div className="hidden items-center gap-2 px-5 py-6 text-lg font-bold text-brand-700 lg:flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            ◎
          </span>
          FaceTrack
        </div>

        <p
          className={`mx-5 mb-3 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
            PORTAL_STYLE[user.role] || PORTAL_STYLE.lecturer
          }`}
        >
          {PORTAL[user.role] || PORTAL.lecturer}
        </p>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {links.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="w-5 text-center">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <p className="truncate text-sm font-semibold text-slate-800">
            {user.name}
          </p>
          <p className="truncate text-xs text-slate-500">
            <span className="capitalize">{user.role}</span> · {user.email}
          </p>
          <button onClick={signOut} className="btn-ghost mt-3 w-full py-1.5 text-xs">
            Sign out
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="h-12 lg:hidden" />
    </>
  );
}
