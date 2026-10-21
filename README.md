# FaceTrack — Face Recognition Based Classroom Attendance System

A working prototype of the system described in *"Design and Implementation of a
Student Attendance System in the Classroom Using Face Recognition Techniques"*.
Students are identified by their own face, so attendance is recorded in seconds
and cannot be signed for by somebody else.

Built with **Next.js (App Router)**, **MongoDB + Mongoose**, and
**face-api.js / TensorFlow.js** running in the browser.

---

## 1. What the prototype does

| Objective (Chapter 1.3) | How the prototype meets it |
|---|---|
| Reduce time spent taking attendance | The camera scans the room continuously; a face is recognised and recorded in under a second, with no roll call |
| Eliminate proxy attendance | Attendance requires a live face that matches a stored template. Naming a student is not enough — matching happens on the server. Faces are enrolled only in person after an ID check, and one face can never be enrolled under two matric numbers |
| Record attendance reliably | A unique index on `(session, student)` makes a student's record idempotent: repeated recognition of the same face never duplicates or overwrites |
| Manage large classes | Every face in a frame is detected and matched in one pass; the candidate set is narrowed to students registered on that course |
| Secure storage and easy retrieval | Records live in MongoDB behind signed-cookie authentication, with per-course reports, attendance percentages and CSV export |

Deliberately matching the three-layer high-level model in Figure 3.5:

```
 INPUT LAYER            PROCESSING LAYER                 DATA & OUTPUT LAYER
┌──────────────┐      ┌───────────────────────┐        ┌────────────────────┐
│ Classroom    │      │ Browser (TensorFlow)  │        │  MongoDB           │
│ camera       │─────▶│  · face detection     │        │   · students       │
│ (webcam)     │      │  · landmarks          │        │   · face templates │
└──────────────┘      │  · 128-d descriptor   │        │   · courses        │
                      └──────────┬────────────┘        │   · sessions       │
                                 │ descriptor only     │   · attendance     │
                                 ▼                     └─────────┬──────────┘
                      ┌───────────────────────┐                  │
                      │ Next.js API (server)  │◀─────────────────┘
                      │  · nearest-neighbour  │
                      │    match              │        ┌────────────────────┐
                      │  · session rules      │───────▶│ Lecturer dashboard │
                      │  · attendance write   │        │ register · reports │
                      └───────────────────────┘        └────────────────────┘
```

**Camera frames never leave the machine.** Only the resulting 128-number
descriptor is sent to the server, and the stored templates never reach the
browser. A descriptor is not reversible into a photograph, which keeps the
biometric data far safer than storing face images.

---

## 2. Live deployment & user guide

- **Live application:** <https://attendace-system-david.vercel.app/>
- **User guide (PDF):** [`docs/FaceTrack-User-Guide.pdf`](docs/FaceTrack-User-Guide.pdf) —
  a step-by-step walkthrough with screenshots, user flows, use cases,
  sign-in credentials and troubleshooting. Its source is in
  [`docs/user-guide-source/`](docs/user-guide-source/).

---

## 3. Getting started

### Requirements
- Node.js 18.18 or newer (developed on Node 22)
- A MongoDB database — MongoDB Atlas free tier is fine
- A webcam, and a browser that can use it (Chrome, Edge or Safari)

### Install

```bash
npm install
cp .env.example .env      # then fill in MONGODB_URI and JWT_SECRET
npm run seed -- --demo    # staff accounts, students, courses, sample history
npm run dev
```

Open <http://localhost:3000>, pick the **Student**, **Lecturer** or
**Administrator** tab on the sign-in screen, and use the matching seeded account:

| Sign in with | Password | Sign-in tab |
|---|---|---|
| `CSC/2021/001` … `CSC/2021/010` (matric number) | `student1234` | Student |
| `lecturer@example.edu` | `lecturer1234` | Lecturer |
| `admin@example.edu` | `admin1234` | Administrator |

An account can only sign in through its own tab. New students create their own
account at **/register** (the *Create your account* link on the Student tab).

> Change these before showing the system to anyone outside your defence.

### Seed options

```bash
npm run seed              # staff, 10 students, 4 courses
npm run seed -- --demo    # also invents 5 past lectures so reports have data
npm run seed -- --reset   # wipe every collection first
```

Face templates are **not** seeded — a descriptor only means something if it came
from a real face. Enrol students from the UI (*Students → Verify & enrol*).
Re-running the seed fills in missing demo fields and passwords but never
overwrites existing passwords or course registrations.

### Camera permissions

Browsers only expose a camera on a *secure context*: `https://` or
`http://localhost`. Opening the app over a LAN IP such as
`http://192.168.1.56:3000` will fail to start the camera. Either run it on the
lecturer's own machine, or put it behind HTTPS.

---

## 4. Using the system

The system has three portals with separate duties. The server enforces them, so
hiding a button is never the only protection.

| | Student | Administrator (department officer) | Lecturer |
|---|---|---|---|
| Registration | Registers online: details, passport photo, password | Verifies identity in person, captures the face | — |
| Student records | Views own record | Edits details, resets passwords, re-enrols, deletes | — |
| Courses | Registers / drops own courses | Creates, edits, assigns lecturer, manages class lists | Views courses assigned to them |
| Staff accounts | — | Creates lecturer and admin accounts | — |
| Lecture sessions | — | Monitors every session (read-only) | Starts, captures, marks manually, closes — own courses only |
| Attendance | Own attendance and exam eligibility | Reports for every course | Reports for own courses |

### Why students cannot enrol their own face

Self-service registration saves the admin office typing hundreds of records,
but a face enrolled at home could belong to anyone — a student could enrol a
friend's face and send the friend to every lecture. So the biometric step is
done **only in person by an administrator**, who:

1. compares the student with the passport photo they uploaded and the photograph
   on their **JAMB result slip or admission letter**, and records which document
   was checked;
2. captures the face — the camera stays locked until step 1 is ticked;
3. is refused automatically if that face is **already enrolled under another
   matric number**, so one person can never hold two identities.

### The workflow

**Student** (from anywhere):

1. **Register** at */register* — every academic field is a dropdown (faculty →
   department, level, year of entry); the matric number is assembled from the
   department code and entry year, so only its final digits are typed.
2. **Register courses** — *Course registration*, filtered to their department
   and level.

**Administrator** (admin office):

3. **Verify & enrol** — *Students → Awaiting verification → Verify & enrol*.
   Check the document, tick the confirmation, press **Start face capture**.
   Three samples are taken **automatically** as soon as a face is in view —
   no button per sample — typically in under 2 seconds. Mistakes in a
   student's details are fixed with **Edit details**; templates and history are
   kept.
4. **Set up courses** — *Courses → New course* (code prefix, units, level,
   semester, lecturer and attendance requirement are all dropdowns).

**Lecturer** (in class):

5. **Start a lecture session** — *My lecture sessions*, choose the course, venue
   and late cut-off from the dropdowns, then start. This opens the live capture
   screen.
6. **Capture attendance** — press **Start capture**. The camera scans every
   ~0.9 s and draws a box around each face:
   - **green** — recognised and just marked
   - **blue** — recognised, already marked in this session
   - **red** — not recognised
   Students the camera cannot pick up can be marked with **Mark manually**;
   those records are tagged `manual` so they are distinguishable in reports.
7. **Close the session** — this locks the register. Recognition against a closed
   session is rejected, so attendance cannot be added after the lecture.
8. **Read the report** — every student against every session held, their
   attendance percentage, and whether they meet the course's requirement (75% by
   default). Students see the same figures for themselves on their dashboard.

---

## 5. How recognition works

1. **Detection** — the browser runs the fast *Tiny Face Detector* on every frame,
   falling back to the more thorough *SSD MobileNet V1* when it finds nothing.
   Before detection each frame's brightness is measured, and a dim or
   over-exposed frame is corrected automatically.
2. **Landmarks** — 68 facial landmarks are located and used to align the face,
   which is what makes the next step robust to head tilt.
3. **Description** — a ResNet-style recognition network maps the aligned face to
   a **128-dimension descriptor**. The same person produces nearby vectors; two
   different people produce distant ones.
4. **Matching** — the server compares the live descriptor against every stored
   template for students on that course using **euclidean distance**, and takes
   the nearest one. A match is only accepted if the distance is within the
   threshold (`FACE_MATCH_THRESHOLD`, default **0.5**).

```
distance = √( Σ (liveᵢ − storedᵢ)² )      for i = 1 … 128

distance ≤ 0.5  → same person, mark attendance
distance >  0.5 → unknown face, do nothing
```

Lowering the threshold makes the system stricter: fewer wrong students marked,
but more genuine students rejected. Raising it does the opposite. `lib/face.js`
holds this logic and is the single place to change it.

### Why capture is fast

TensorFlow.js compiles its GPU programs the first time each network runs, which
can take tens of seconds on a modest PC. The app runs every network once on a
blank image while the screen still says *Preparing the camera engine*, so that
cost is never paid when someone is waiting to be captured. The capture screens
also report whether the engine is GPU-accelerated; on a PC with hardware
acceleration switched off it falls back to the CPU (slower, about 7 s for an
enrolment instead of under 2 s) and says so on screen.

### Why match on the server

Detection has to happen in the browser — that is where the camera is. Matching
does not, and putting it on the server means:

- stored templates never reach the client, so they cannot be harvested;
- a modified client cannot mark a student present by simply naming them — it has
  to produce a descriptor that actually matches;
- session rules (open/closed, late cut-off, course registration) are enforced in
  one place that the client cannot skip.

---

## 6. Data model

| Collection | Purpose | Notable fields |
|---|---|---|
| `users` | Staff who sign in | `role: admin \| lecturer`, hashed `password` |
| `students` | Student records, online accounts and biometrics | `matricNo` (unique), `jambRegNo`, hashed `password`, `passportPhoto`, `identityCheck` (document, verifier, date), `faceDescriptors: [[Number]]` (`select: false`) |
| `courses` | Courses and their class list | `code` (unique), `semester`, `students: [ObjectId]`, `requiredAttendance` |
| `sessions` | One lecture sitting | `status: open \| closed`, `startedAt`, `lateAfterMinutes` |
| `attendances` | One record per student per session | unique index on `(session, student)`, `method: face \| manual`, `matchDistance` |

Two constraints carry most of the integrity guarantees:

- **`attendances` unique `(session, student)`** — the database itself refuses a
  duplicate, so a face sitting in front of the camera for ten minutes still
  produces exactly one record.
- **`sessions.status`** — attendance can only be written while a session is
  open, which is what ties a record to a real lecture.

---

## 7. Project structure

```
app/
  (app)/                 authenticated screens (sidebar shell)
    dashboard/           admin, lecturer and student dashboards
    students/            roll, verification + automatic face enrolment, profile
    my-courses/          student course registration
    my-attendance/       student's own attendance history
    courses/             course list, class list, session launcher
    sessions/            session list, register, and …
      [id]/capture/      ← the live recognition screen
    reports/             per-course register, percentages, CSV export
    staff/               staff account management (admin only)
  api/                   REST endpoints (see below)
  login/                 sign-in with Student / Lecturer / Administrator tabs
  register/              public student self-registration
components/              Sidebar, FaceEnroll, CourseForm, dropdown fields, UI primitives
lib/
  db.js                  cached Mongoose connection
  auth.js                JWT signing/verification, cookie handling
  api.js                 route guards and error handling
  catalog.js             faculties, departments, venues… behind every dropdown
  face.js                euclidean distance and nearest-neighbour matching
  faceapi.js             browser-side model loading and detection
  useWebcam.js           camera hook
models/                  Mongoose schemas
public/models/           TensorFlow.js model weights (~12 MB)
scripts/seed.mjs         database seeding
```

### API endpoints

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/auth/login` · `/logout`, `GET /me` | Sign-in for all three portals |
| `POST` | `/api/auth/register` | Student self-registration (public) |
| `GET` | `/api/student/overview` · `/attendance` | Student's own record and attendance |
| `GET/POST/DELETE` | `/api/student/courses` | Student course registration |
| `GET` | `/api/students` | Student roll (admin) |
| `GET/PATCH/DELETE` | `/api/students/[id]` | Profile, corrections, password reset, removal |
| `POST` | `/api/students/[id]/enrol` | Identity check + face enrolment, with duplicate-face refusal |
| `GET/POST` | `/api/courses` | List / create courses |
| `GET/PATCH/DELETE` | `/api/courses/[id]` | Course detail |
| `POST/DELETE` | `/api/courses/[id]/students` | Register / remove students on a course |
| `GET/POST` | `/api/sessions` | List / start a lecture session |
| `GET/PATCH/DELETE` | `/api/sessions/[id]` | Register, close/reopen, delete |
| **`POST`** | **`/api/attendance/recognize`** | **Match descriptors and mark attendance** |
| `POST` | `/api/attendance/manual` | Fallback manual marking |
| `DELETE` | `/api/attendance/[id]` | Correct a wrong record |
| `GET` | `/api/reports/course/[id]` | Full register with percentages |
| `GET` | `/api/dashboard` | Summary statistics |

---

## 8. Known limitations

Honest boundaries of the prototype, matching Chapter 1.5 and the gaps
identified in Chapter 2.4:

- **Lighting still matters at the extremes.** Frames are brightness-corrected
  automatically, which handles dim rooms and washed-out light, but a face in near
  darkness or strongly backlit can still be missed. Manual marking exists for
  exactly this.
- **Distance and angle.** Faces need to be reasonably large in the frame. A
  single camera at the front of a 300-seat hall will not reach the back rows;
  a demonstration works best with students filing past the camera.
- **No liveness detection.** A printed photograph or a phone screen held up to
  the camera would pass. Defeating that needs a liveness check (blink or depth
  sensing), which is out of scope here.
- **Threshold is a trade-off, not a certainty.** 0.5 is a sensible default, not
  a guarantee; it should be tuned against your own enrolled population.
- **Recognition scales linearly.** Matching compares against every template on
  the course. That is fine for classes of tens or low hundreds; a
  campus-wide deployment would want a vector index.
- **Demo credentials are weak** and are seeded on purpose. Replace them before
  any real use.

---

## 9. Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint
npm run seed     # seed the database (see options above)
```
