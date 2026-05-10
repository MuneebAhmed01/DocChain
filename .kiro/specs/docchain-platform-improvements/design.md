# Design Document — DocChain Platform Improvements

## Overview

Six targeted improvements across the `clientside` React app, the `admin` React panel, and the Node.js `backend`. Each section maps directly to one requirement and describes the concrete file changes, data-flow decisions, and component contracts needed to implement it.

---

## 1. Decorative Icons — Remove Interactive Behavior

### Affected File
`clientside/src/components/Header.jsx`

### Current State
The floating action bar contains three emoji icons wrapped in `<div>` elements with the Tailwind class `cursor-pointer`. No `onClick` handlers exist, but the pointer cursor implies interactivity.

```jsx
<div className="p-2 bg-white rounded-full shadow cursor-pointer">📷</div>
<div className="p-2 bg-blue-600 text-white rounded-full shadow cursor-pointer">📞</div>
<div className="p-2 bg-white rounded-full shadow cursor-pointer">🎤</div>
```

### Design Decision
Replace `cursor-pointer` with `cursor-default` and add `aria-hidden="true"` to each icon `<div>`. No other structural changes — animations, colors, shadows, and the `hidden md:flex` responsive wrapper are preserved.

### After Change
```jsx
<div className="p-2 bg-white rounded-full shadow cursor-default" aria-hidden="true">📷</div>
<div className="p-2 bg-blue-600 text-white rounded-full shadow cursor-default" aria-hidden="true">📞</div>
<div className="p-2 bg-white rounded-full shadow cursor-default" aria-hidden="true">🎤</div>
```

No new components, hooks, or utilities are needed.

---

## 2. Race Condition Prevention for Appointment Actions

### Affected Files
- `admin/src/pages/Doctor/DoctorAppointments.jsx`
- `admin/src/pages/Admin/AllAppointments.jsx`
- `clientside/src/pages/MyAppointments.jsx`
- `clientside/src/pages/PaymentSuccess.jsx`
- `backend/controllers/doctorController.js` (complete/cancel endpoints)
- `backend/controllers/adminController.js` (cancel endpoint)

### Design: Per-Appointment Action Lock (Frontend)

A `useRef`-based lock map is used instead of `useState` to avoid triggering re-renders on lock acquisition. A separate `useState` map tracks which appointment ID is currently loading (and which button — `"complete"` or `"cancel"`), so the spinner renders correctly.

```
loadingMap: { [appointmentId]: "complete" | "cancel" | null }
```

**DoctorAppointments.jsx pattern:**
```
const [loadingMap, setLoadingMap] = useState({})   // { id: "complete"|"cancel" }
const lockRef = useRef({})                          // { id: true } — prevents re-entry

const handleAction = async (appointmentId, action, apiFn) => {
  if (lockRef.current[appointmentId]) return        // lock held → no-op
  lockRef.current[appointmentId] = true
  setLoadingMap(prev => ({ ...prev, [appointmentId]: action }))
  try {
    await apiFn(appointmentId)
  } finally {
    lockRef.current[appointmentId] = false
    setLoadingMap(prev => ({ ...prev, [appointmentId]: null }))
  }
}
```

Button rendering:
```jsx
<button
  disabled={!!loadingMap[item._id]}
  onClick={() => handleAction(item._id, "complete", completeAppointment)}
>
  {loadingMap[item._id] === "complete" ? <Spinner /> : "Complete"}
</button>
<button
  disabled={!!loadingMap[item._id]}
  onClick={() => handleAction(item._id, "cancel", cancelAppointment)}
>
  {loadingMap[item._id] === "cancel" ? <Spinner /> : "Cancel"}
</button>
```

**AllAppointments.jsx pattern:** Same `loadingMap` + `lockRef` approach, but only a single "Cancel" button per row. Lock key is appointment ID.

**MyAppointments.jsx pattern:** The existing confirmation modal already gates the cancel. Add `isCancelling` state (boolean), set it `true` before the API call, `false` in `finally`. Disable the "Yes, Cancel Appointment" button and show a spinner while `isCancelling` is true.

**PaymentSuccess.jsx pattern:** The page has no navigation buttons of its own — it renders a single status card. The requirement calls for blocking navigation during verification. Implementation: add `isVerifying` state (default `true`), set `false` in `finally` of `verifyPayment`. Render a full-screen overlay `<div>` with `pointer-events-all` and `z-50` while `isVerifying` is true, preventing clicks on the app shell's navbar. Add a 30-second timeout via `setTimeout` that sets an `isTimedOut` error state and clears `isVerifying`.

### Inline Spinner Component
A small inline SVG spinner is added directly in each file (or extracted to a shared `clientside/src/components/Spinner.jsx` and `admin/src/components/Spinner.jsx`):
```jsx
const Spinner = () => (
  <svg className="animate-spin h-4 w-4 inline-block" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
  </svg>
)
```

### Design: Idempotency Guards (Backend)

**Complete endpoint** (in `doctorController.js`):
```js
if (appointment.appointmentStatus === "COMPLETED" ||
    /^CANCELLED_/.test(appointment.appointmentStatus)) {
  return res.json({ success: true, message: "Appointment already in target state" })
}
```

**Cancel endpoint** (in `doctorController.js` and `adminController.js`):
```js
if (/^CANCELLED_/.test(appointment.appointmentStatus)) {
  return res.json({ success: true, message: "Appointment already cancelled" })
}
```

These guards must be checked **before** any side effects (email sending, slot release, etc.).

---

## 3. Doctor Mobile Number in Join Doctor Form

### Affected Files
- `clientside/src/pages/JoinDoctor.jsx`
- `backend/models/pendingDoctorModel.js`
- `backend/controllers/pendingDoctorController.js` (join handler + approve handler)
- `backend/services/whapiAppointmentService.js`
- `backend/scripts/seedDoctors.js` (or equivalent seed/migration for Dr. Richard James)

### Design: JoinDoctor Form

Add a `phone_number` field to `formData` state (initial value `""`). Render a composite input:

```jsx
<div className="flex items-center border rounded-lg overflow-hidden">
  <span className="px-3 py-2 bg-gray-100 text-gray-600 select-none border-r">+92</span>
  <input
    type="tel"
    placeholder="3001234567"
    value={formData.phone_number}
    onChange={e => handleChange("phone_number", e.target.value)}
    className="flex-1 px-3 py-2 outline-none"
  />
</div>
```

**Normalization logic** (runs on submit, before API call):
```js
const normalizePhone = (raw) => {
  let s = raw.trim()
  if (s.startsWith("0") && s.length === 11) s = s.slice(1)  // strip leading 0
  return s
}

const validatePhone = (normalized) => /^3[0-9]{9}$/.test(normalized)
```

If validation fails → show error `"Enter a valid Pakistani mobile number (e.g. 3001234567)"`.  
If valid → send `phone_number: "+92" + normalized` in the FormData payload.

### Design: PendingDoctor Model

Add one optional field:
```js
phone_number: { type: String, default: null }
```
No `required: true` — existing documents without this field remain valid.

### Design: Approval Controller

In `approvePendingDoctor`, add `phone_number` to the `Doctor.create(...)` call:
```js
const doctor = await Doctor.create({
  // ... existing fields ...
  phone_number: pendingDoctor.phone_number || null,
})
```

### Design: WhatsApp Service

The service already reads `doctor.phone_number` and skips if null. No change needed — the gap is purely in the data pipeline (form → model → approval). Requirement 3.11 is already satisfied by the existing null-check in `whapiAppointmentService.js`.

### Design: Seed Data for Dr. Richard James

Add a migration/update script or update the existing doctor seed to set `phone_number: "+923345001289"` on the Dr. Richard James document. If a seed script exists at `backend/scripts/seedDoctors.js`, update it there. Otherwise, create a one-off migration script `backend/scripts/updateDoctorPhones.js`.

---

## 4. Forgot Password Flow

### Affected Files
- `clientside/src/pages/Login.jsx`
- `backend/models/emailOtpModel.js`
- `backend/routes/userRoute.js`

### Design: EmailOTP Model

Extend the `purpose` enum:
```js
purpose: {
  type: String,
  enum: ['signup', 'password_reset'],
  default: 'signup',
}
```

### Design: Backend Endpoints

Two new routes added to `userRoute.js`:

**POST `/api/user/send-otp-reset`**
```
Body: { email }
1. Validate email format
2. Look up userModel.findOne({ email })
3. If not found → 400 { success: false, message: "No account found with this email address." }
4. generateOTP() → storeOTP(email, otp, 'password_reset') → sendOTPEmail(email, otp)
5. Return { success: true }
```

**POST `/api/user/reset-password`**
```
Body: { email, otp, newPassword }
1. verifyOTP(email, otp, 'password_reset')
2. If fails → 400 with verifyOTP's message
3. Validate newPassword: length >= 8, contains uppercase
4. bcrypt.hash(newPassword, 10)
5. userModel.findOneAndUpdate({ email }, { password: hashedPassword })
6. Return { success: true, message: "Password reset successfully" }
```

### Design: Login.jsx ForgotPassword Flow

State additions:
```js
const [showForgotPassword, setShowForgotPassword] = useState(false)
const [fpStep, setFpStep] = useState(1)          // 1 | 2 | 3
const [fpEmail, setFpEmail] = useState("")
const [fpOtp, setFpOtp] = useState("")
const [fpNewPassword, setFpNewPassword] = useState("")
const [fpConfirmPassword, setFpConfirmPassword] = useState("")
const [fpError, setFpError] = useState("")
const [fpLoading, setFpLoading] = useState(false)
const [fpOtpCooldown, setFpOtpCooldown] = useState(0)
```

**Flow structure** (rendered as a modal overlay when `showForgotPassword` is true):

```
Step 1 — Email Entry
  Input: email
  Submit → POST /api/user/send-otp-reset
  On success → setFpStep(2), start 60s cooldown timer
  On error → show fpError inline

Step 2 — OTP Verification
  Input: 6-digit OTP
  Resend button (disabled while cooldown > 0, shows countdown)
  Note: "OTP expires in 5 minutes"
  Submit → POST /api/user/verify-otp with purpose 'password_reset'
  On success → setFpStep(3)
  On error → show fpError inline

Step 3 — New Password
  Input: newPassword (min 8 chars, 1 uppercase)
  Input: confirmPassword
  Client-side validation before API call
  Submit → POST /api/user/reset-password
  On success → show success message, setShowForgotPassword(false), reset all fp state
  On error → show fpError inline
```

**Loading state:** `fpLoading` disables all inputs and the submit button, shows a spinner on the active button. Matches the existing signup OTP UI pattern in the same file.

**Responsive:** The modal uses `w-full max-w-sm mx-auto` with `px-4` padding, rendering correctly at 320px+.

**"Forgot password?" link** wiring:
```jsx
<button
  type="button"
  onClick={() => { setShowForgotPassword(true); setFpStep(1); setFpError(""); }}
  className="text-primary text-sm hover:underline"
>
  Forgot password?
</button>
```

---

## 5. Appointments Sorted by Creation Time

### Affected Files
- `admin/src/context/DoctorContext.jsx`
- `admin/src/context/AdminContext.jsx`
- `admin/src/pages/Doctor/DoctorDashboard.jsx`

### Current State Analysis

| Location | Current Sort | Required Sort |
|---|---|---|
| `DoctorContext.getAppointments` | Slot date+time descending | Booking timestamp descending |
| `AdminContext.getAllAppointments` | None (raw API order) | Booking timestamp descending |
| `DoctorDashboard` recent list | Derived from context | 5 most recently booked |
| `MyAppointments` | Booking date desc + slot time secondary | Already correct (per code review) |

### Design: Sorting Utility

A shared sort comparator used in both contexts:
```js
// Sort by booking creation timestamp descending
// Uses the `date` field (Unix ms set at booking time) or falls back to ObjectId timestamp
const byBookingDateDesc = (a, b) => {
  const tsA = a.date ? Number(a.date) : 0
  const tsB = b.date ? Number(b.date) : 0
  return tsB - tsA
}
```

### DoctorContext.jsx

Replace the current slot-date sort with `byBookingDateDesc`:
```js
setAppointments([...data.appointments].sort(byBookingDateDesc))
```

### AdminContext.jsx

Add sort after fetch:
```js
setAppointments([...data.appointments].sort(byBookingDateDesc))
```

### DoctorDashboard.jsx

The dashboard's "Latest Bookings" list is derived from the context `appointments` array. Since the context now sorts by booking date, the dashboard just needs to slice the first 5:
```js
const recentAppointments = appointments.slice(0, 5)
```
If the dashboard currently uses a different slice or sort, replace it with this pattern.

### MyAppointments.jsx

Already implements the correct sort (booking date desc, slot time secondary). No change needed.

### Filter/Search Preservation

Sorting is applied to the full array stored in context state. All filter/search operations in the pages work by filtering the already-sorted context array, so filtered results automatically maintain the sort order. No additional changes needed.

---

## 6. Seed Blog System with Doctor-Linked Authors

### Affected Files
- `backend/scripts/seedBlogs.js` (new file)
- `clientside/src/pages/Blogs/BlogDetail.jsx`

### Design: seedBlogs.js Script

Follows the exact structure of `createDemoBlogs.js`:
- ESM (`import`/`export`)
- `dotenv/config` import
- `mongoose.connect` → try/finally with `mongoose.disconnect()`
- `process.exit(0)` on success, `process.exit(1)` on fatal error

**Doctor lookup strategy:**
```js
const SEEDED_DOCTOR_EMAILS = [
  "richard.james@docchain.com",   // General Physician
  "emily.larson@docchain.com",    // Gynecologist
  "sarah.patel@docchain.com",     // Dermatologist
  "michael.chen@docchain.com",    // Pediatrician
  "andrew.williams@docchain.com", // Neurologist
  "christopher.davis@docchain.com" // Orthopedic
]

// Look up each doctor by email; warn and skip if not found
const doctorMap = {}
for (const email of SEEDED_DOCTOR_EMAILS) {
  const doc = await Doctor.findOne({ email }).lean()
  if (!doc) {
    console.warn(`[seedBlogs] Warning: doctor not found for email ${email} — skipping`)
  } else {
    doctorMap[email] = doc
  }
}
```

**Blog data structure** (6 posts, one per specialty):
Each blog entry has:
- `title`, `excerpt`, `content` (HTML, 150+ visible words)
- `imageUrl` (Unsplash URL)
- `tags` (array, at least 1)
- `doctorEmail` (used to look up `doctorId` and `author`)

**insertMany with duplicate handling:**
```js
try {
  const result = await Blog.insertMany(docs, { ordered: false })
  console.log(`[seedBlogs] Inserted ${result.length} blogs`)
} catch (err) {
  if (err.code === 11000 || err.writeErrors) {
    const skipped = err.writeErrors?.length ?? 0
    console.log(`[seedBlogs] Skipped ${skipped} duplicate slugs`)
  } else {
    throw err
  }
}
```

**npm script** added to `backend/package.json`:
```json
"seed:doctor-blogs": "node scripts/seedBlogs.js"
```

### Design: BlogDetail.jsx — Author Attribution

Current rendering:
```jsx
<p className="text-sm text-gray-500 mb-4">
  By {blog.author || "Admin"} • {new Date(blog.createdAt).toLocaleDateString()}
</p>
```

Updated rendering with conditional link:
```jsx
<p className="text-sm text-gray-500 mb-4">
  By{" "}
  {blog.authorRole === "doctor" && blog.doctorId ? (
    <Link
      to={`/doctors/${blog.doctorId}`}
      className="text-primary hover:underline"
    >
      {blog.author || "Doctor"}
    </Link>
  ) : (
    <span>{blog.author || "Admin"}</span>
  )}{" "}
  • {new Date(blog.createdAt).toLocaleDateString()}
</p>
```

`Link` is already imported from `react-router-dom` in the file (via `useNavigate`/`useParams`). If not, add the import.

---

## Component & Data Flow Summary

```
Req 1  Header.jsx
         └─ remove cursor-pointer → cursor-default, add aria-hidden

Req 2  DoctorAppointments.jsx / AllAppointments.jsx / MyAppointments.jsx
         └─ loadingMap + lockRef → disabled buttons + inline spinner
       PaymentSuccess.jsx
         └─ isVerifying overlay + 30s timeout
       doctorController.js / adminController.js
         └─ idempotency guard before side effects

Req 3  JoinDoctor.jsx
         └─ +92 prefix input + normalize/validate on submit
       pendingDoctorModel.js
         └─ add phone_number field (optional)
       pendingDoctorController.js (approvePendingDoctor)
         └─ copy phone_number to Doctor.create()
       updateDoctorPhones.js (migration)
         └─ set Dr. Richard James phone_number

Req 4  emailOtpModel.js
         └─ extend purpose enum to include 'password_reset'
       userRoute.js
         └─ POST /send-otp-reset + POST /reset-password
       Login.jsx
         └─ ForgotPassword modal (3-step: email → OTP → new password)

Req 5  DoctorContext.jsx
         └─ sort by a.date desc (booking timestamp)
       AdminContext.jsx
         └─ sort by a.date desc (booking timestamp)
       DoctorDashboard.jsx
         └─ slice(0, 5) from sorted context array

Req 6  backend/scripts/seedBlogs.js (new)
         └─ 6 doctor-linked blogs, insertMany ordered:false
       BlogDetail.jsx
         └─ conditional <Link> vs <span> for author
```

---

## No New Dependencies

All changes use libraries already present in the project:
- React state/refs (`useState`, `useRef`) — already used throughout
- `react-router-dom` `Link` — already in clientside
- `bcryptjs`, `jsonwebtoken` — already in backend
- `mongoose`, `slugify` — already in backend
- Tailwind CSS — already configured in all three apps
