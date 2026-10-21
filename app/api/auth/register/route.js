import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { Student } from "@/models";
import { signToken, setAuthCookie } from "@/lib/auth";
import { ok, fail, handler } from "@/lib/api";
import { findDepartment, LEVELS, GENDERS, entryYears, buildMatricNo } from "@/lib/catalog";

const MAX_PHOTO_CHARS = 400_000; // ~300 KB image; the browser resizes before upload

/**
 * Student self-registration, done from anywhere. It creates the record and
 * signs the student in, but does NOT enrol a face: that happens in person at
 * the admin office after an identity check.
 */
export const POST = handler(async (req) => {
  const b = await req.json();

  const fullName = String(b.fullName || "").trim().replace(/\s+/g, " ");
  if (fullName.length < 3) return fail("Enter your full name");

  const dept = findDepartment(b.department);
  if (!dept) return fail("Choose your department from the list");
  if (!LEVELS.includes(b.level)) return fail("Choose your level");
  if (!GENDERS.includes(b.gender)) return fail("Choose your gender");
  if (!entryYears().includes(b.entryYear)) return fail("Choose your year of entry");

  const serial = String(b.matricSerial || "").trim();
  if (!/^\d{1,4}$/.test(serial)) return fail("The last part of your matric number must be 1–4 digits");
  const matricNo = buildMatricNo(dept.code, b.entryYear, serial);

  const jambRegNo = String(b.jambRegNo || "").toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9]{8,16}$/.test(jambRegNo)) {
    return fail("Enter your JAMB registration number as printed on your result slip");
  }

  const email = String(b.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email address");

  const phone = String(b.phone || "").replace(/[\s-]/g, "");
  if (!/^\+?\d{10,14}$/.test(phone)) return fail("Enter a valid phone number");

  const photo = String(b.passportPhoto || "");
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(photo)) {
    return fail("Upload a passport photograph");
  }
  if (photo.length > MAX_PHOTO_CHARS) return fail("The passport photograph is too large");

  if (String(b.password || "").length < 6) return fail("Password must be at least 6 characters");

  await connectDB();

  if (await Student.exists({ matricNo })) {
    return fail(`Matric number ${matricNo} is already registered. Sign in instead, or visit the admin office if this is not you.`, 409);
  }
  if (await Student.exists({ jambRegNo })) {
    return fail("That JAMB registration number is already registered", 409);
  }

  const student = await Student.create({
    matricNo,
    fullName,
    gender: b.gender,
    email,
    phone,
    faculty: dept.faculty,
    department: dept.name,
    level: b.level,
    entryYear: b.entryYear,
    jambRegNo,
    passportPhoto: photo,
    password: await bcrypt.hash(b.password, 10),
    registeredOnline: true,
  });

  await setAuthCookie(
    await signToken({
      sub: student._id.toString(),
      name: student.fullName,
      matricNo: student.matricNo,
      role: "student",
    })
  );

  return ok({ student: { id: student._id, matricNo } }, { status: 201 });
});
