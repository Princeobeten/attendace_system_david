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
 * (Students -> Register student) using the webcam.
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

const STUDENTS = [
  ["CSC/2021/001", "Adaeze Okonkwo"],
  ["CSC/2021/002", "Bello Musa"],
  ["CSC/2021/003", "Chidinma Eze"],
  ["CSC/2021/004", "Daniel Ogundipe"],
  ["CSC/2021/005", "Fatima Abubakar"],
  ["CSC/2021/006", "Gbenga Adewale"],
  ["CSC/2021/007", "Halima Yusuf"],
  ["CSC/2021/008", "Ibrahim Salisu"],
  ["CSC/2021/009", "Joy Nwachukwu"],
  ["CSC/2021/010", "Kelechi Obi"],
].map(([matricNo, fullName]) => ({
  matricNo,
  fullName,
  email: `${fullName.split(" ")[0].toLowerCase()}@example.edu`,
  department: "Computer Science",
  level: "400",
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
  console.log(`  ${students.length} students`);

  // --- courses ----------------------------------------------------------
  const COURSES = [
    { code: "CSC 401", title: "Software Engineering", unit: 3 },
    { code: "CSC 415", title: "Artificial Intelligence", unit: 3 },
  ];

  const courses = [];
  for (const c of COURSES) {
    const doc = await Course.findOneAndUpdate(
      { code: c.code },
      {
        ...c,
        level: "400",
        department: "Computer Science",
        lecturer: staff.lecturer._id,
        requiredAttendance: 75,
        students: students.map((s) => s._id),
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
  console.log("\nNext: Students -> open a student -> Re-enrol face to capture templates.");

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("Seed failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
