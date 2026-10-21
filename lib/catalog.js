/**
 * Reference data behind every dropdown in the system, kept in one place so
 * forms offer choices instead of free typing and records stay consistent.
 * Adjust these lists to match the institution.
 */

export const FACULTIES = [
  {
    name: "Faculty of Science",
    departments: [
      { name: "Computer Science", code: "CSC" },
      { name: "Mathematics", code: "MTH" },
      { name: "Physics", code: "PHY" },
      { name: "Chemistry", code: "CHM" },
      { name: "Biochemistry", code: "BCH" },
      { name: "Microbiology", code: "MCB" },
    ],
  },
  {
    name: "Faculty of Engineering",
    departments: [
      { name: "Computer Engineering", code: "CPE" },
      { name: "Electrical/Electronic Engineering", code: "EEE" },
      { name: "Mechanical Engineering", code: "MEE" },
      { name: "Civil Engineering", code: "CVE" },
    ],
  },
  {
    name: "Faculty of Management Sciences",
    departments: [
      { name: "Accounting", code: "ACC" },
      { name: "Business Administration", code: "BUS" },
    ],
  },
  {
    name: "Faculty of Social Sciences",
    departments: [
      { name: "Economics", code: "ECO" },
      { name: "Political Science", code: "POL" },
      { name: "Mass Communication", code: "MAC" },
    ],
  },
];

export const DEPARTMENTS = FACULTIES.flatMap((f) =>
  f.departments.map((d) => ({ ...d, faculty: f.name }))
);

export function findDepartment(name) {
  return DEPARTMENTS.find((d) => d.name === name) || null;
}

export const LEVELS = ["100", "200", "300", "400", "500"];

export const SEMESTERS = ["First", "Second"];

export const GENDERS = ["Female", "Male"];

export const STAFF_TITLES = ["Prof.", "Dr.", "Engr.", "Mr.", "Mrs.", "Ms."];

export const CREDIT_UNITS = [1, 2, 3, 4, 5, 6];

export const ATTENDANCE_REQUIREMENTS = [50, 60, 65, 70, 75, 80, 90];

export const LATE_AFTER_MINUTES = [5, 10, 15, 20, 30, 45];

export const VENUES = [
  "LT1 (Lecture Theatre 1)",
  "LT2 (Lecture Theatre 2)",
  "LT3 (Lecture Theatre 3)",
  "Science Auditorium",
  "ICT Centre Hall",
  "Computer Laboratory 1",
  "Computer Laboratory 2",
  "Faculty Seminar Room",
];

/** Documents a student may present when the admin verifies their identity. */
export const ID_DOCUMENTS = [
  "JAMB result slip",
  "JAMB admission letter",
  "School admission letter",
  "Student ID card",
];

/** Entry years offered when building a matriculation number. */
export function entryYears(count = 8) {
  const now = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => String(now - i));
}

/** e.g. ("CSC", "2021", "34") -> "CSC/2021/034" */
export function buildMatricNo(code, year, serial) {
  if (!code || !year || !serial) return "";
  return `${code}/${year}/${String(serial).padStart(3, "0")}`;
}
