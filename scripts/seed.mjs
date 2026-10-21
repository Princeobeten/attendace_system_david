/**
 * Seeds the database with staff accounts, courses and student records so the
 * system can be demonstrated immediately.
 *
 *   npm run seed              staff + courses + students
 *   npm run seed -- --demo    also invents past sessions and attendance so the
 *                             report screen has data to show
 *   npm run seed -- --reset   wipe the collections first
 *
 * Face templates are deliberately NOT seeded — a descriptor only means
 * anything if it came from a real face. Enrol students from the UI
 * (Students -> Verify & enrol) using the webcam.
 *
 * Seeded students can sign in on the Student tab with their matric number
 * and the password below. Re-running the seed never overwrites a password
 * or course registration that already exists.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const args = process.argv.slice(2);
const withDemo = args.includes("--demo");
const reset = args.includes("--reset");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is missing. Check your .env file.");
  process.exit(1);
}

// Minimal schemas — the app's own definitions live in /models.
const { Schema, model } = mongoose;
const opts = { timestamps: true, strict: false };
const User = model("User", new Schema({}, opts));
const Student = model("Student", new Schema({}, opts));
const Course = model("Course", new Schema({}, opts));
const Session = model("Session", new Schema({}, opts));
const Attendance = model("Attendance", new Schema({}, opts));

const STAFF = [
  {
    name: "Dr. Grace Adeyemi",
    email: "admin@example.edu",
    password: "admin1234",
    role: "admin",
    staffId: "STF/001",
    department: "Computer Science",
  },
  {
    name: "Mr. Emeka Nwosu",
    email: "lecturer@example.edu",
    password: "lecturer1234",
    role: "lecturer",
    staffId: "STF/014",
    department: "Computer Science",
  },
];

const STUDENT_PASSWORD = "student1234";

const STUDENTS = [
  ["CSC/2021/001", "Adaeze Okonkwo", "Female"],
  ["CSC/2021/002", "Bello Musa", "Male"],
  ["CSC/2021/003", "Chidinma Eze", "Female"],
  ["CSC/2021/004", "Daniel Ogundipe", "Male"],
  ["CSC/2021/005", "Fatima Abubakar", "Female"],
  ["CSC/2021/006", "Gbenga Adewale", "Male"],
  ["CSC/2021/007", "Halima Yusuf", "Female"],
  ["CSC/2021/008", "Ibrahim Salisu", "Male"],
  ["CSC/2021/009", "Joy Nwachukwu", "Female"],
  ["CSC/2021/010", "Kelechi Obi", "Male"],
].map(([matricNo, fullName, gender], i) => ({
  matricNo,
  fullName,
  gender,
  email: `${fullName.split(" ")[0].toLowerCase()}@example.edu`,
  phone: `0803000${String(1000 + i)}`,
  faculty: "Faculty of Science",
  department: "Computer Science",
  level: "400",
  entryYear: "2021",
  jambRegNo: `2021${String(10000000 + i * 7919)}CS`,
  faceDescriptors: [],
  isActive: true,
}));

async function run() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  console.log("Connected to", mongoose.connection.name);

  if (reset) {
    await Promise.all(
      [User, Student, Course, Session, Attendance].map((m) => m.deleteMany({}))
    );
    console.log("Cleared existing data");
  }

  // --- staff ------------------------------------------------------------
  const staff = {};
  for (const s of STAFF) {
    const doc = await User.findOneAndUpdate(
      { email: s.email },
      { ...s, password: await bcrypt.hash(s.password, 10) },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    staff[s.role] = doc;
    console.log(`  staff  ${s.email}  (${s.role})`);
  }

  // --- students ---------------------------------------------------------
  const students = [];
  for (const s of STUDENTS) {
    const doc = await Student.findOneAndUpdate(
      { matricNo: s.matricNo },
      { $setOnInsert: s },
      { upsert: true, returnDocument: "after" }
    );
    students.push(doc);
  }
  // Give existing demo records the newer fields and an online account,
  // without touching anything already filled in.
  const studentHash = await bcrypt.hash(STUDENT_PASSWORD, 10);
  for (const s of STUDENTS) {
    const missing = {};
    const doc = await Student.findOne({ matricNo: s.matricNo }).select("+password").lean();
    for (const k of ["gender", "phone", "faculty", "entryYear", "jambRegNo"]) {
      if (!doc[k]) missing[k] = s[k];
    }
    if (!doc.password) missing.password = studentHash;
    if (Object.keys(missing).length) await Student.updateOne({ _id: doc._id }, { $set: missing });
  }
  console.log(`  ${students.length} students (password ${STUDENT_PASSWORD})`);

  // --- courses ----------------------------------------------------------
  // The first two start with the whole class registered; the others are
  // left for students to register themselves from the Student portal.
  const COURSES = [
    { code: "CSC 401", title: "Software Engineering", unit: 3, semester: "First", enrolAll: true },
    { code: "CSC 415", title: "Artificial Intelligence", unit: 3, semester: "First", enrolAll: true },
    { code: "CSC 405", title: "Computer Networks", unit: 3, semester: "First" },
    { code: "CSC 423", title: "Compiler Construction", unit: 2, semester: "Second" },
  ];

  const courses = [];
  for (const { enrolAll, ...c } of COURSES) {
    const doc = await Course.findOneAndUpdate(
      { code: c.code },
      {
        $set: {
          ...c,
          level: "400",
          department: "Computer Science",
          lecturer: staff.lecturer._id,
          requiredAttendance: 75,
        },
        // Never overwrite registrations students have made since.
        $setOnInsert: { students: enrolAll ? students.map((s) => s._id) : [] },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    courses.push(doc);
    console.log(`  course ${c.code} — ${c.title}`);
  }

  // --- optional demo history -------------------------------------------
  if (withDemo) {
    const course = courses[0];
    await Session.deleteMany({ course: course._id });
    await Attendance.deleteMany({ course: course._id });

    for (let week = 5; week >= 1; week--) {
      const startedAt = new Date(Date.now() - week * 7 * 24 * 3600 * 1000);
      startedAt.setHours(10, 0, 0, 0);

      const session = await Session.create({
        course: course._id,
        lecturer: staff.lecturer._id,
        title: `${course.code} lecture — week ${6 - week}`,
        venue: "LT1",
        startedAt,
        closedAt: new Date(startedAt.getTime() + 2 * 3600 * 1000),
        status: "closed",
        lateAfterMinutes: 15,
      });

      for (const student of students) {
        if (Math.random() < 0.18) continue; // absent
        const late = Math.random() < 0.15;
        await Attendance.create({
          session: session._id,
          course: course._id,
          student: student._id,
          status: late ? "late" : "present",
          method: "face",
          matchDistance: Number((0.28 + Math.random() * 0.15).toFixed(3)),
          markedAt: new Date(startedAt.getTime() + (late ? 20 : 5) * 60000),
          markedBy: staff.lecturer._id,
        });
      }
      console.log(`  demo session ${session.title}`);
    }
  }

  console.log("\nSeed complete. Sign in with:");
  for (const s of STAFF) console.log(`  ${s.email} / ${s.password}   (${s.role})`);
  console.log(`  ${STUDENTS[0].matricNo} / ${STUDENT_PASSWORD}   (student — any seeded matric number)`);
  console.log("\nNext: Students -> Verify & enrol to capture each student's face.");

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("Seed failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
