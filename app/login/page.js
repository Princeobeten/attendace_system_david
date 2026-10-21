import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-brand-700 p-12 text-white lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            ◎
          </span>
          FaceTrack
        </div>

        <div>
          <h1 className="text-4xl font-bold leading-tight">
            Attendance that cannot be signed for.
          </h1>
          <p className="mt-4 max-w-md text-brand-100">
            A face recognition based attendance system for tertiary institutions.
            Students are identified by their own face, so proxy attendance and lost
            registers stop being a problem.
          </p>

          <ul className="mt-8 space-y-3 text-sm text-brand-100">
            {[
              "Students register online — faces are enrolled in person after an ID check",
              "Contactless recognition — no queues, no roll call",
              "One record per student per lecture, enforced by the database",
              "Attendance percentage and exam eligibility computed for you",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span className="text-white">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-brand-200">
          Final year project · Design and implementation of a student attendance
          system using face recognition techniques
        </p>
      </section>

      <section className="flex items-center justify-center p-6">
        <LoginForm />
      </section>
    </main>
  );
}
