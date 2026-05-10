# Tasks

## Task 1: Fix decorative icons in Header component
Remove interactive cursor and add aria-hidden to the three floating action bar icons in the Header component.

**Files to modify:**
- `clientside/src/components/Header.jsx`

**Sub-tasks:**
- [x] 1.1 — Find the three icon `<div>` elements (📷, 📞, 🎤) inside the `hidden md:flex` floating action bar
- [x] 1.2 — Replace `cursor-pointer` Tailwind class with `cursor-default` on each icon div
- [x] 1.3 — Add `aria-hidden="true"` attribute to each icon div
- [x] 1.4 — Verify no `onClick`, `role`, or `tabIndex` attributes are present on any icon div
- [x] 1.5 — Confirm the outer floating bar wrapper (`hidden md:flex`) and all other styles (bg, shadow, rounded, animations) are unchanged

**Acceptance criteria:** Req 1 — criteria 1–6

---

## Task 2: Add idempotency guards to backend appointment endpoints
Prevent duplicate side effects when complete/cancel is called on an already-processed appointment.

**Files to modify:**
- `backend/controllers/doctorController.js`
- `backend/controllers/adminController.js`

**Sub-tasks:**
- [x] 2.1 — In the doctor appointment **complete** handler: after fetching the appointment, check if `appointmentStatus === "COMPLETED"` or matches `/^CANCELLED_/`; if so, return `{ success: true, message: "Appointment already in target state" }` immediately without running side effects
- [x] 2.2 — In the doctor appointment **cancel** handler: after fetching the appointment, check if `appointmentStatus` matches `/^CANCELLED_/`; if so, return `{ success: true, message: "Appointment already cancelled" }` immediately
- [x] 2.3 — In the admin appointment **cancel** handler: apply the same cancelled-state guard as 2.2
- [x] 2.4 — Confirm the guard runs before any email sending, slot-release, or other side-effect code

**Acceptance criteria:** Req 2 — criteria 8, 9

---

## Task 3: Add race condition prevention to DoctorAppointments page
Add per-appointment action lock and inline loading spinner to the doctor appointments page.

**Files to modify:**
- `admin/src/pages/Doctor/DoctorAppointments.jsx`

**Sub-tasks:**
- [x] 3.1 — Add `loadingMap` state (`{}`) and `lockRef` ref (`{}`) at the top of the component
- [x] 3.2 — Create a `handleAction(appointmentId, action, apiFn)` function: check `lockRef.current[appointmentId]`, set lock + `loadingMap` entry synchronously, call `apiFn`, clear both in `finally`
- [x] 3.3 — Add an inline `Spinner` component (SVG `animate-spin`) or import from a shared location
- [x] 3.4 — Wire the "Complete" button: `disabled={!!loadingMap[item._id]}`, `onClick` calls `handleAction(item._id, "complete", completeAppointment)`, renders `<Spinner />` when `loadingMap[item._id] === "complete"`
- [x] 3.5 — Wire the "Cancel" button: same pattern with `"cancel"` action key
- [ ] 3.6 — Verify that locking appointment A does not disable buttons on appointment B (per-ID isolation)

**Acceptance criteria:** Req 2 — criteria 1, 2, 6, 7

---

## Task 4: Add race condition prevention to AllAppointments page
Add per-appointment action lock to the admin all-appointments page.

**Files to modify:**
- `admin/src/pages/Admin/AllAppointments.jsx`

**Sub-tasks:**
- [~] 4.1 — Add `loadingMap` state and `lockRef` ref at the top of the component
- [~] 4.2 — Create `handleCancel(appointmentId)` using the same lock pattern as Task 3
- [~] 4.3 — Wire the "Cancel" button: `disabled={!!loadingMap[item._id]}`, `onClick` calls `handleCancel(item._id)`, renders spinner while loading
- [~] 4.4 — Confirm other rows' cancel buttons remain enabled while one row is loading

**Acceptance criteria:** Req 2 — criterion 3

---

## Task 5: Add race condition prevention to MyAppointments page
Disable the cancel confirmation button and show a spinner while the cancellation API call is in progress.

**Files to modify:**
- `clientside/src/pages/MyAppointments.jsx`

**Sub-tasks:**
- [~] 5.1 — Add `isCancelling` boolean state (default `false`)
- [~] 5.2 — In the cancel handler: set `isCancelling(true)` synchronously before the API call, set `false` in `finally`
- [~] 5.3 — Disable the "Yes, Cancel Appointment" modal button when `isCancelling` is true
- [~] 5.4 — Render an inline spinner on the button while `isCancelling` is true

**Acceptance criteria:** Req 2 — criterion 4

---

## Task 6: Add navigation block to PaymentSuccess page
Prevent the user from navigating away while Stripe payment verification is in progress, with a 30-second timeout fallback.

**Files to modify:**
- `clientside/src/pages/PaymentSuccess.jsx`

**Sub-tasks:**
- [~] 6.1 — Add `isVerifying` state (default `true`) and `isTimedOut` state (default `false`)
- [~] 6.2 — Set `isVerifying = false` in the `finally` block of `verifyPayment`
- [~] 6.3 — Start a `setTimeout` of 30 000 ms when verification begins; if it fires before `finally`, set `isTimedOut = true` and `isVerifying = false`
- [~] 6.4 — While `isVerifying` is true, render a full-screen overlay `<div>` with `fixed inset-0 z-50 bg-black/40 flex items-center justify-center` containing a "Verifying payment, please wait…" message
- [~] 6.5 — When `isTimedOut` is true, display an error state message and ensure the overlay is removed (navigation re-enabled)
- [~] 6.6 — Clear the timeout in a cleanup function to avoid state updates on unmounted component

**Acceptance criteria:** Req 2 — criterion 5

---

## Task 7: Add phone number field to JoinDoctor form
Add a Pakistani mobile number input with +92 prefix, normalization, and validation to the doctor registration form.

**Files to modify:**
- `clientside/src/pages/JoinDoctor.jsx`

**Sub-tasks:**
- [~] 7.1 — Add `phone_number: ""` to the `formData` state initial value
- [~] 7.2 — Render a composite input: non-editable `+92` prefix span + editable subscriber number `<input type="tel">`
- [~] 7.3 — On form submit, run normalization: if value starts with `0` and is 11 chars, strip the leading `0`
- [~] 7.4 — Validate the normalized value against `/^3[0-9]{9}$/`; if invalid, set error `"Enter a valid Pakistani mobile number (e.g. 3001234567)"` and abort submit
- [~] 7.5 — If valid, include `phone_number: "+92" + normalized` in the FormData sent to `/api/pending-doctor/join`
- [~] 7.6 — Display the validation error message inline below the phone input field

**Acceptance criteria:** Req 3 — criteria 1–6

---

## Task 8: Add phone_number field to PendingDoctor model
Add an optional phone_number field to the Mongoose schema for pending doctor applications.

**Files to modify:**
- `backend/models/pendingDoctorModel.js`

**Sub-tasks:**
- [~] 8.1 — Add `phone_number: { type: String, default: null }` to `pendingDoctorSchema` (no `required: true`)
- [~] 8.2 — Confirm existing documents without this field remain valid (optional field, default null)

**Acceptance criteria:** Req 3 — criterion 7

---

## Task 9: Copy phone_number through doctor approval flow
Update the pending doctor approval controller to copy phone_number to the new Doctor document.

**Files to modify:**
- `backend/controllers/pendingDoctorController.js`

**Sub-tasks:**
- [~] 9.1 — In `approvePendingDoctor`, add `phone_number: pendingDoctor.phone_number || null` to the `Doctor.create({...})` call
- [~] 9.2 — Confirm the field is only set if present; null is acceptable and won't break the WhatsApp service

**Acceptance criteria:** Req 3 — criteria 8, 11

---

## Task 10: Set Dr. Richard James phone number in seed data
Ensure the seeded Dr. Richard James doctor document has the correct WhatsApp phone number.

**Files to modify:**
- `backend/scripts/seedDoctors.js` (or equivalent seed file — locate by searching for "Richard James")

**Sub-tasks:**
- [~] 10.1 — Search the backend scripts/seed files for the Dr. Richard James entry
- [~] 10.2 — Set `phone_number: "+923345001289"` on that doctor entry
- [~] 10.3 — If no seed script exists for doctors, create a one-off migration script `backend/scripts/updateDoctorPhones.js` that does `Doctor.findOneAndUpdate({ name: /richard james/i }, { phone_number: "+923345001289" })` and exits

**Acceptance criteria:** Req 3 — criterion 10

---

## Task 11: Extend EmailOTP model to support password_reset purpose
Add `password_reset` to the purpose enum in the EmailOTP Mongoose schema.

**Files to modify:**
- `backend/models/emailOtpModel.js`

**Sub-tasks:**
- [~] 11.1 — Change `enum: ['signup']` to `enum: ['signup', 'password_reset']` in the `purpose` field
- [~] 11.2 — Confirm the default remains `'signup'` so existing OTP documents are unaffected

**Acceptance criteria:** Req 4 — criterion 12

---

## Task 12: Add forgot password backend endpoints
Add POST /api/user/send-otp-reset and POST /api/user/reset-password routes to the user router.

**Files to modify:**
- `backend/routes/userRoute.js`

**Sub-tasks:**
- [~] 12.1 — Add `POST /send-otp-reset` route: validate email format, look up user by email, return 400 with `"No account found with this email address."` if not found, otherwise call `generateOTP()` → `storeOTP(email, otp, 'password_reset')` → `sendOTPEmail(email, otp)` → return `{ success: true }`
- [~] 12.2 — Add `POST /reset-password` route: accept `{ email, otp, newPassword }`, call `verifyOTP(email, otp, 'password_reset')`, return error if fails, validate `newPassword` (min 8 chars, at least one uppercase), `bcrypt.hash`, `userModel.findOneAndUpdate({ email }, { password: hashedPassword })`, return `{ success: true, message: "Password reset successfully" }`
- [~] 12.3 — Confirm both routes are added before `export default router`

**Acceptance criteria:** Req 4 — criteria 13, 14

---

## Task 13: Implement ForgotPassword flow in Login page
Wire up the "Forgot password?" button and implement the 3-step modal flow in Login.jsx.

**Files to modify:**
- `clientside/src/pages/Login.jsx`

**Sub-tasks:**
- [~] 13.1 — Add state variables: `showForgotPassword`, `fpStep` (1|2|3), `fpEmail`, `fpOtp`, `fpNewPassword`, `fpConfirmPassword`, `fpError`, `fpLoading`, `fpOtpCooldown`
- [~] 13.2 — Wire the existing "Forgot password?" button `onClick` to `setShowForgotPassword(true)` and reset fp state
- [~] 13.3 — Render a modal overlay when `showForgotPassword` is true, with a close button that resets all fp state
- [~] 13.4 — **Step 1** (email entry): email input + submit button → `POST /api/user/send-otp-reset`; on success advance to step 2 and start 60s cooldown timer; on error show `fpError`
- [~] 13.5 — **Step 2** (OTP verification): 6-digit OTP input + submit → `POST /api/user/verify-otp` with `purpose: 'password_reset'`; resend button disabled while cooldown > 0; "OTP expires in 5 minutes" note; on success advance to step 3; on error show `fpError`
- [~] 13.6 — **Step 3** (new password): `newPassword` + `confirmPassword` inputs; client-side validate (min 8 chars, 1 uppercase, passwords match) before calling `POST /api/user/reset-password`; on success show success message and close modal; on error show `fpError`
- [~] 13.7 — While `fpLoading` is true, disable all inputs and the active submit button, show inline spinner on the button
- [~] 13.8 — Ensure the modal is responsive (`w-full max-w-sm mx-auto px-4`) and renders correctly at 320px width

**Acceptance criteria:** Req 4 — criteria 1–11, 15, 16

---

## Task 14: Fix appointment sorting in DoctorContext
Replace the slot-date sort with a booking-timestamp sort in the doctor context.

**Files to modify:**
- `admin/src/context/DoctorContext.jsx`

**Sub-tasks:**
- [~] 14.1 — In `getAppointments`, replace the existing `createDateTime`-based sort with a sort on `a.date` (booking timestamp, Unix ms): `[...data.appointments].sort((a, b) => Number(b.date) - Number(a.date))`
- [~] 14.2 — Confirm the sorted array is passed to `setAppointments`

**Acceptance criteria:** Req 5 — criteria 1, 4, 5

---

## Task 15: Fix appointment sorting in AdminContext
Add booking-timestamp sort to the admin context appointments fetch.

**Files to modify:**
- `admin/src/context/AdminContext.jsx`

**Sub-tasks:**
- [~] 15.1 — In `getAllAppointments`, after receiving `data.appointments`, sort by `a.date` descending: `[...data.appointments].sort((a, b) => Number(b.date) - Number(a.date))`
- [~] 15.2 — Pass the sorted array to `setAppointments`

**Acceptance criteria:** Req 5 — criteria 2, 4, 5

---

## Task 16: Fix recent appointments list in DoctorDashboard
Ensure the dashboard shows the 5 most recently booked appointments using the context's sorted array.

**Files to modify:**
- `admin/src/pages/Doctor/DoctorDashboard.jsx`

**Sub-tasks:**
- [~] 16.1 — Locate where the dashboard renders its "Latest Bookings" / recent appointments list
- [~] 16.2 — Replace any existing sort or slice logic with `appointments.slice(0, 5)` (context is already sorted by booking date after Task 14)
- [~] 16.3 — Confirm the list renders at most 5 items in descending booking-date order

**Acceptance criteria:** Req 5 — criterion 3

---

## Task 17: Create seedBlogs.js script
Create a new ESM seed script that inserts 6 doctor-linked, specialty-specific blog posts.

**Files to create:**
- `backend/scripts/seedBlogs.js`

**Sub-tasks:**
- [~] 17.1 — Set up the script following `createDemoBlogs.js` structure: `import "dotenv/config"`, `import mongoose`, `import Doctor from "../models/doctorModel.js"`, `import Blog from "../models/Blog.js"`, `import slugify from "slugify"`
- [~] 17.2 — Define an array of 6 blog entries, one per specialty (General Physician, Gynecologist, Dermatologist, Pediatrician, Neurologist, Orthopedic), each with: `title`, `excerpt`, `content` (HTML, 150+ visible words, no lorem ipsum), `imageUrl` (Unsplash), `tags` (array), `doctorEmail`
- [~] 17.3 — Look up each doctor by `doctorEmail` using `Doctor.findOne({ email })`. If not found, log a warning and set `doctorId: null`, `author: "DocChain Editorial Team"`; if found, set `doctorId: doc._id`, `author: doc.name`
- [~] 17.4 — Build unique slugs using the same `buildUniqueSlug` helper pattern from `createDemoBlogs.js` (check existing slugs first)
- [~] 17.5 — Set `authorRole: "doctor"`, `status: "approved"`, `published: true`, `isDemo: true` on all documents
- [~] 17.6 — Call `Blog.insertMany(docs, { ordered: false })`; catch `writeErrors` to log skipped duplicate count without throwing
- [~] 17.7 — Wrap DB operations in try/finally with `mongoose.disconnect()` in finally
- [~] 17.8 — Exit `process.exit(0)` on success, `process.exit(1)` on fatal error
- [~] 17.9 — Add `"seed:doctor-blogs": "node scripts/seedBlogs.js"` to `backend/package.json` scripts

**Acceptance criteria:** Req 6 — criteria 1–7, 10–12

---

## Task 18: Update BlogDetail author attribution
Add conditional doctor link vs plain span for author attribution in the BlogDetail page.

**Files to modify:**
- `clientside/src/pages/Blogs/BlogDetail.jsx`

**Sub-tasks:**
- [~] 18.1 — Import `Link` from `react-router-dom` (add to existing import if not present)
- [~] 18.2 — Replace the current `By {blog.author || "Admin"}` text with a conditional: if `blog.authorRole === "doctor" && blog.doctorId`, render `<Link to={"/doctors/" + blog.doctorId}>` wrapping the author name; otherwise render `<span>` with the author name
- [~] 18.3 — Confirm the `<Link>` has no `onClick` or other interactive attributes beyond `to`
- [~] 18.4 — Confirm the `<span>` has no `href`, `onClick`, `role`, or `tabIndex`

**Acceptance criteria:** Req 6 — criteria 8, 9
