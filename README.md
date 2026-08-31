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
| Eliminate proxy attendance | Attendance requires a live face that matches a stored template. Naming a student is not enough — matching happens on the server |
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

## 2. Getting started

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

Open <http://localhost:3000> and sign in with a seeded account:

| Email | Password | Role |
|---|---|---|
| `admin@example.edu` | `admin1234` | Administrator |
| `lecturer@example.edu` | `lecturer1234` | Lecturer |

> Change these before showing the system to anyone outside your defence.

### Seed options

```bash
npm run seed              # staff, 10 students, 2 courses
npm run seed -- --demo    # also invents 5 past lectures so reports have data
npm run seed -- --reset   # wipe every collection first
```

Face templates are **not** seeded — a descriptor only means something if it came
from a real face. Enrol students from the UI.

### Camera permissions

Browsers only expose a camera on a *secure context*: `https://` or
`http://localhost`. Opening the app over a LAN IP such as
`http://192.168.1.56:3000` will fail to start the camera. Either run it on the
lecturer's own machine, or put it behind HTTPS.

---

## 3. Using the system

1. **Register a student** — *Students → Register student*. Fill in the matric
   number and name, turn on the camera and capture **3 samples** (straight on,
   slightly left, slightly right). Multiple samples make recognition far more
   tolerant of head pose in a real lecture hall.
2. **Create a course** — *Courses → New course*, then open it and
   **Add students**. Only registered students are recognition candidates.
3. **Start a lecture session** — *Lecture sessions*, choose the course, set the
   venue and how many minutes late counts as "late", then start. This opens the
   live capture screen.
4. **Capture attendance** — press **Start capture**. The camera scans every
   ~0.9 s and draws a box around each face:
   - **green** — recognised and just marked
   - **blue** — recognised, already marked in this session
   - **red** — not recognised
   The register on the right updates live. Students the camera cannot pick up
   (bad lighting, a student at the back) can be marked with **Mark manually**;
   those records are tagged `manual` so they are distinguishable in reports.
5. **Close the session** — this locks the register. Recognition against a closed
   session is rejected, so attendance cannot be added after the lecture.
6. **Read the report** — *Attendance report* shows every student against every
   session held, their attendance percentage, and whether they meet the
   course's requirement (75% by default). Export to CSV for records.

---

## 4. How recognition works

1. **Detection** — the browser runs *SSD MobileNet V1* (enrolment, accurate) or
   *Tiny Face Detector* (live capture, fast) to find faces in the frame.
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

### Why match on the server

Detection has to happen in the browser — that is where the camera is. Matching
does not, and putting it on the server means:

- stored templates never reach the client, so they cannot be harvested;
- a modified client cannot mark a student present by simply naming them — it has
  to produce a descriptor that actually matches;
- session rules (open/closed, late cut-off, course registration) are enforced in
  one place that the client cannot skip.

---

## 5. Data model

| Collection | Purpose | Notable fields |
|---|---|---|
| `users` | Staff who sign in | `role: admin \| lecturer`, hashed `password` |
| `students` | Student records and biometrics | `matricNo` (unique), `faceDescriptors: [[Number]]` (`select: false`) |
| `courses` | Courses and their class list | `code` (unique), `students: [ObjectId]`, `requiredAttendance` |
| `sessions` | One lecture sitting | `status: open \| closed`, `startedAt`, `lateAfterMinutes` |
| `attendances` | One record per student per session | unique index on `(session, student)`, `method: face \| manual`, `matchDistance` |

Two constraints carry most of the integrity guarantees:

- **`attendances` unique `(session, student)`** — the database itself refuses a
  duplicate, so a face sitting in front of the camera for ten minutes still
  produces exactly one record.
- **`sessions.status`** — attendance can only be written while a session is
  open, which is what ties a record to a real lecture.

---

## 6. Project structure

```
app/
  (app)/                 authenticated screens (sidebar shell)
    dashboard/           overview and statistics
    students/            list, registration + face enrolment, student profile
    courses/             course list, class list, session launcher
    sessions/            session list, register, and …
      [id]/capture/      ← the live recognition screen
    reports/             per-course register, percentages, CSV export
    staff/               staff account management (admin only)
  api/                   REST endpoints (see below)
  login/                 staff sign-in
components/              Sidebar, FaceEnroll, shared UI primitives
lib/
  db.js                  cached Mongoose connection
  auth.js                JWT signing/verification, cookie handling
  api.js                 route guards and error handling
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
| `POST` | `/api/auth/login` · `/logout`, `GET /me` | Staff session |
| `GET/POST` | `/api/students` | List / register a student with face templates |
| `GET/PATCH/DELETE` | `/api/students/[id]` | Profile, re-enrolment, removal |
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

## 7. Known limitations

Honest boundaries of the prototype, matching Chapter 1.5 and the gaps
identified in Chapter 2.4:

- **Lighting still matters.** In a dim hall the detector finds fewer faces. The
  manual marking fallback exists precisely for this.
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

## 8. Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint
npm run seed     # seed the database (see options above)
```
