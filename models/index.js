// Importing from this barrel guarantees every schema is registered with
// mongoose before any `.populate()` call needs it.
export { default as User } from "./User";
export { default as Student } from "./Student";
export { default as Course } from "./Course";
export { default as Session } from "./Session";
export { default as Attendance } from "./Attendance";
