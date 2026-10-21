"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const PORTALS = {
  student: {
    label: "Student",
    title: "Student sign in",
    blurb: "See your registration status, register your courses and check your attendance.",
    idLabel: "Matric number",
    idType: "text",
    placeholder: "CSC/2021/001",
  },
  lecturer: {
    label: "Lecturer",
    title: "Lecturer sign in",
    blurb: "Start your lecture sessions, take attendance by face and view your course reports.",
    idLabel: "Email address",
    idType: "email",
    placeholder: "lecturer@example.edu",
  },
  admin: {
    label: "Administrator",
    title: "Administrator sign in",
    blurb: "Verify students, enrol faces, set up courses and manage staff accounts.",
    idLabel: "Email address",
    idType: "email",
    placeholder: "admin@example.edu",
  },
};

export default function LoginForm() {
  const router = useRouter();
  const [portal, setPortal] = useState("student");
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, portal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign in failed");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 lg:hidden">
        <div className="flex items-center gap-2 text-lg font-bold text-brand-700">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            ◎
          </span>
          FaceTrack
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
        {Object.entries(PORTALS).map(([key, p]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={portal === key}
            onClick={() => {
              setPortal(key);
              setError("");
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              portal === key
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <h2 className="text-2xl font-bold text-slate-900">{PORTALS[portal].title}</h2>
      <p className="mt-1 text-sm text-slate-500">{PORTALS[portal].blurb}</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="label" htmlFor="email">
            {PORTALS[portal].idLabel}
          </label>
          <input
            id="email"
            type={PORTALS[portal].idType}
            required
            autoComplete="username"
            className="input"
            placeholder={PORTALS[portal].placeholder}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            className="input"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Signing in…" : `Sign in as ${PORTALS[portal].label.toLowerCase()}`}
        </button>
      </form>

      {portal === "student" && (
        <p className="mt-6 text-center text-sm text-slate-600">
          New student?{" "}
          <Link href="/register" className="font-semibold text-brand-600 hover:underline">
            Create your account
          </Link>
        </p>
      )}

      <p className="mt-6 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
        Demo accounts are created by <code className="font-mono">npm run seed</code>.
      </p>
    </div>
  );
}
