import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";

export function ok(data, init) {
  return NextResponse.json(data, init);
}

export function fail(message, status = 400, extra = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

const STAFF = ["admin", "lecturer"];

/**
 * Guard for API route handlers: connects to the database and resolves the
 * signed-in user. Returns `{ user }` on success or `{ response }` to return
 * straight back to the client.
 *
 *   const auth = await requireUser(["admin"]);
 *   if (auth.response) return auth.response;
 *
 * With no roles given, only staff are allowed — student routes must ask for
 * ["student"] explicitly.
 */
export async function requireUser(roles = STAFF) {
  const user = await getCurrentUser();
  if (!user) return { response: fail("Not signed in", 401) };
  if (!roles.includes(user.role)) {
    return { response: fail("You do not have access to this action", 403) };
  }
  try {
    await connectDB();
  } catch (err) {
    return { response: fail(`Database connection failed: ${err.message}`, 503) };
  }
  return { user };
}

/**
 * True when the user teaches this course. Admins manage records but do not
 * take attendance, so this is the check for lecturer-only actions.
 */
export function teaches(user, course) {
  return Boolean(course?.lecturer) && String(course.lecturer._id ?? course.lecturer) === user.sub;
}

/** Admins can view every course; lecturers only the ones they teach. */
export function canView(user, course) {
  return user.role === "admin" || teaches(user, course);
}

const FIELD_LABELS = { matricNo: "matric number", code: "course code", email: "email address" };

/** Wraps a handler so unexpected errors become clean JSON instead of HTML. */
export function handler(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err?.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0] || "value";
        return fail(`That ${FIELD_LABELS[field] || field} is already in use`, 409);
      }
      if (err?.name === "CastError") return fail("Record not found", 404);
      if (err?.name === "ValidationError") {
        return fail(Object.values(err.errors)[0]?.message || "Invalid data", 422);
      }
      console.error(err);
      return fail(err.message || "Something went wrong", 500);
    }
  };
}
