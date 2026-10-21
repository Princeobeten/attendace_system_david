import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import RegisterForm from "./RegisterForm";

export const metadata = { title: "Student registration — FaceTrack" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-bold text-brand-700">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              ◎
            </span>
            FaceTrack
          </div>
          <Link href="/login" className="text-sm font-medium text-brand-600 hover:underline">
            Already registered? Sign in
          </Link>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student registration</h1>
        <p className="mt-1 text-sm text-slate-500">
          Complete this form from anywhere. Your face is <b>not</b> captured online — after
          registering, visit the admin office with your <b>JAMB result slip or admission
          letter</b> so your identity can be checked and your face enrolled.
        </p>

        <ol className="mt-5 grid gap-2 text-xs sm:grid-cols-3">
          {[
            ["1", "Register online", "Details, passport photo, password"],
            ["2", "Register your courses", "From your student dashboard"],
            ["3", "Visit the admin office", "Identity check and face capture"],
          ].map(([n, t, s]) => (
            <li key={n} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                {n}
              </span>
              <span>
                <b className="block text-slate-800">{t}</b>
                <span className="text-slate-500">{s}</span>
              </span>
            </li>
          ))}
        </ol>

        <RegisterForm />
      </div>
    </main>
  );
}
