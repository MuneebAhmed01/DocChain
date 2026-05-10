# Requirements Document

## Introduction

This document captures six targeted improvements to the DocChain doctor appointment platform. The changes span the patient-facing frontend (`clientside`), the doctor/admin panel (`admin`), and the Node.js backend. The improvements address UI correctness (decorative icons), concurrency safety (race conditions), data completeness (doctor mobile number), user account recovery (forgot password), data presentation (appointment sorting), and content seeding (blog system).

---

## Glossary

- **DocChain**: The full-stack telemedicine and appointment booking platform.
- **Header_Component**: The `clientside/src/components/Header.jsx` hero section rendered at the top of the home page.
- **Decorative_Icon**: A visual element in the Header_Component (camera 📷, phone 📞, microphone 🎤) that conveys aesthetic context and carries no interactive function.
- **Action_Lock**: A frontend state flag that prevents duplicate async operations from being initiated while one is already in progress.
- **Loading_Spinner**: A visual indicator rendered inside or alongside a button to communicate that an async operation is in progress.
- **DoctorAppointments_Page**: The `admin/src/pages/Doctor/DoctorAppointments.jsx` page where a doctor reviews and acts on their appointments.
- **AllAppointments_Page**: The `admin/src/pages/Admin/AllAppointments.jsx` page where an admin reviews all platform appointments.
- **DoctorDashboard_Page**: The `admin/src/pages/Doctor/DoctorDashboard.jsx` page showing a doctor's recent appointments summary.
- **PaymentSuccess_Page**: The `clientside/src/pages/PaymentSuccess.jsx` page that verifies a Stripe payment session after redirect.
- **MyAppointments_Page**: The `clientside/src/pages/MyAppointments.jsx` page where a patient manages their appointments.
- **JoinDoctor_Form**: The `clientside/src/pages/JoinDoctor.jsx` registration form submitted by prospective doctors.
- **PendingDoctor_Model**: The `backend/models/pendingDoctorModel.js` Mongoose schema for unreviewed doctor applications.
- **Doctor_Model**: The `backend/models/doctorModel.js` Mongoose schema for approved, active doctors.
- **EmailOTP_Model**: The `backend/models/emailOtpModel.js` Mongoose schema storing email-based OTPs with a 5-minute TTL.
- **Login_Page**: The `clientside/src/pages/Login.jsx` page handling both login and signup flows.
- **ForgotPassword_Flow**: A multi-step UI flow (email entry → OTP verification → new password entry) accessible from the Login_Page.
- **OTP_Utility**: The `backend/utils/otpUtils.js` module providing `generateOTP`, `storeOTP`, `verifyOTP`, and `isEmailVerified` functions.
- **createdAt**: The MongoDB document creation timestamp automatically added by Mongoose `{ timestamps: true }` or the `date` field (Unix ms) on the appointment document.
- **Seed_Script**: A standalone Node.js script in `backend/scripts/` that connects to MongoDB and inserts seed data, following the pattern of `createDemoBlogs.js`.
- **Blog_Model**: The `backend/models/Blog.js` Mongoose schema for blog posts, supporting `doctorId` reference, `tags`, `imageUrl`, `slug`, `status`, and `isDemo` fields.
- **BlogDetail_Page**: The `clientside/src/pages/Blogs/BlogDetail.jsx` page that renders a single blog post including author attribution.
- **SeedDoctor**: One of the pre-seeded doctors in the platform (e.g., Dr. Richard James) used as reference data.
- **WhatsApp_Reminder_Service**: The backend service (`backend/services/whapiAppointmentService.js`) that sends appointment reminders to doctors via WhatsApp using the `phone_number` field on the Doctor_Model.
- **Pakistani_Mobile_Number**: A mobile number conforming to the format `+923XXXXXXXXX` (E.164), where the subscriber number begins with `3` and is 9 digits long.

---

## Requirements

---

### Requirement 1: Decorative Icons — Remove Interactive Behavior

**User Story:** As a patient visiting the home page, I want the floating action bar icons (camera, phone, microphone) in the hero section to be purely decorative, so that I am not misled into thinking they are clickable features.

#### Acceptance Criteria

1. THE Header_Component SHALL render the camera, phone, and microphone icons without a `cursor: pointer` or `cursor: grab` CSS property; the only acceptable cursor values are `cursor: default` or no cursor declaration.
2. THE Header_Component SHALL render the camera, phone, and microphone icons without `onClick` event handlers.
3. THE Header_Component SHALL render the camera, phone, and microphone icons without `role="button"`, `tabIndex`, or any other attribute that implies interactivity to assistive technologies, AND SHALL add `aria-hidden="true"` to each Decorative_Icon element so screen readers skip them entirely.
4. WHILE a user's pointer is positioned over any Decorative_Icon, THE Header_Component SHALL display `cursor: default` (the arrow cursor), not a pointer or hand cursor.
5. THE Header_Component SHALL preserve all existing animations, background colors, shadow styles, and layout of the floating action bar containing the Decorative_Icons.
6. THE Header_Component SHALL preserve the existing responsive visibility behavior (hidden on mobile, visible on desktop) of the floating action bar.

---

### Requirement 2: Race Condition Prevention for Appointment Actions

**User Story:** As a doctor or patient, I want appointment action buttons to be disabled immediately when I click them, so that I cannot accidentally trigger conflicting or duplicate operations.

#### Acceptance Criteria

1. WHEN a doctor clicks the "Complete" or "Cancel" button on an appointment in the DoctorAppointments_Page, THE DoctorAppointments_Page SHALL disable both the "Complete" and "Cancel" buttons for that specific appointment row within the same synchronous render cycle as the click event, before the async API call is dispatched.
2. WHILE an appointment action API call is in progress for a given appointment, THE DoctorAppointments_Page SHALL render a Loading_Spinner inside the button that was clicked for that appointment row; the spinner SHALL be co-located with the button label, not in a separate area of the page.
3. WHEN an admin clicks the "Cancel" button on an appointment in the AllAppointments_Page, THE AllAppointments_Page SHALL disable the cancel button for that specific appointment row within the same synchronous render cycle as the click event, before the async API call is dispatched.
4. WHEN a patient clicks "Yes, Cancel Appointment" in the cancellation confirmation modal on the MyAppointments_Page, THE MyAppointments_Page SHALL disable the confirmation button within the same synchronous render cycle as the click event and render a Loading_Spinner on that button until the API call resolves or rejects.
5. WHEN the PaymentSuccess_Page begins Stripe payment verification, THE PaymentSuccess_Page SHALL disable all in-app navigation links (navbar, sidebar, back buttons) rendered within the application shell and SHALL display a blocking overlay or message preventing the user from navigating away; IF verification has not completed within 30 seconds, THE PaymentSuccess_Page SHALL display an error state and re-enable navigation.
6. THE DoctorAppointments_Page SHALL use a per-appointment Action_Lock (keyed by appointment ID) so that locking one appointment row does not disable action buttons on other appointment rows.
7. IF a doctor clicks "Complete" and then immediately clicks "Cancel" on the same appointment before the first API call resolves, THEN THE DoctorAppointments_Page SHALL ignore the second click because the Action_Lock is already engaged for that appointment.
8. THE backend appointment completion endpoint SHALL verify that the appointment's current `appointmentStatus` is not already `COMPLETED` or matches the pattern `CANCELLED_*` before processing; IF the appointment is already in the target state, THE endpoint SHALL return HTTP 200 with a success body identical in shape to a normal completion response, without re-executing side effects such as email sending.
9. THE backend appointment cancellation endpoint SHALL verify that the appointment's current `appointmentStatus` is not already a cancelled state before processing; IF the appointment is already cancelled, THE endpoint SHALL return HTTP 200 with a success body identical in shape to a normal cancellation response, without re-executing side effects.
10. WHERE a reusable Action_Lock utility is implemented, THE Action_Lock utility SHALL expose a hook or function that accepts an async callback and returns a wrapped version that is a no-op (does not invoke the callback) while the lock is held for the same key.

---

### Requirement 3: Doctor Mobile Number in Join Doctor Form

**User Story:** As a prospective doctor, I want to provide my Pakistani mobile number during registration, so that the platform can send me WhatsApp appointment reminders after I am approved.

#### Acceptance Criteria

1. THE JoinDoctor_Form SHALL include a mobile number input field with a fixed, non-editable `+92` country code prefix displayed visually alongside the editable subscriber number input.
2. WHEN a prospective doctor submits the JoinDoctor_Form, THE JoinDoctor_Form SHALL validate that the subscriber number entered matches the Pakistani mobile pattern: starts with `3` and is exactly 9 digits long (regex: `^3[0-9]{9}$`).
3. IF the subscriber number does not match the Pakistani mobile pattern, THEN THE JoinDoctor_Form SHALL display the error message: "Enter a valid Pakistani mobile number (e.g. 3001234567)".
4. WHEN the subscriber number begins with `0` followed by 10 digits (format `0XXXXXXXXXX`), THE JoinDoctor_Form SHALL automatically strip the leading `0` to produce a 10-digit candidate, and SHALL then re-validate that candidate against the Pakistani mobile pattern (`^3[0-9]{9}$`); IF the stripped candidate does not match, THE form SHALL display the validation error from Criterion 3.
5. WHEN the subscriber number is exactly 10 digits starting with `3` (format `3XXXXXXXXX`), THE JoinDoctor_Form SHALL accept it as valid without modification.
6. WHEN the JoinDoctor_Form is submitted with a valid mobile number, THE JoinDoctor_Form SHALL send the normalized number in E.164 format (`+92XXXXXXXXX`) to the `/api/pending-doctor/join` endpoint.
7. THE PendingDoctor_Model SHALL include an optional `phone_number` field of type String to store the submitted mobile number; the field SHALL NOT be required so that existing pending doctor documents without a phone number remain valid.
8. WHEN an admin approves a pending doctor application that includes a `phone_number`, THE backend approval handler SHALL copy the `phone_number` value to the `phone_number` field on the newly created Doctor_Model document.
9. THE WhatsApp_Reminder_Service SHALL use the `phone_number` field from the Doctor_Model when sending appointment reminders to doctors.
10. THE SeedDoctor record for "Dr. Richard James" SHALL have its `phone_number` field set to `+923345001289` in the seed data or via a migration script.
11. IF the `phone_number` field is absent or null on a Doctor_Model document, THEN THE WhatsApp_Reminder_Service SHALL skip sending the doctor reminder without throwing an error.

---

### Requirement 4: Forgot Password Flow

**User Story:** As a registered patient, I want to reset my password from the login page using an OTP sent to my email, so that I can regain access to my account if I forget my password.

#### Acceptance Criteria

1. WHEN a user clicks "Forgot password?" on the Login_Page, THE Login_Page SHALL display a ForgotPassword_Flow modal or inline panel without navigating away from the page.
2. THE ForgotPassword_Flow SHALL consist of three sequential steps: (1) email entry, (2) OTP verification, and (3) new password entry.
3. WHEN a user submits their email in step 1 of the ForgotPassword_Flow, THE Login_Page SHALL first validate that the input is a syntactically valid email address; IF valid, THE Login_Page SHALL call the backend endpoint to send a 6-digit OTP to the provided email address using the existing OTP_Utility and EmailOTP_Model with purpose `password_reset`.
4. IF the submitted email does not correspond to an existing user account, THEN THE Login_Page SHALL display the error: "No account found with this email address."
5. WHEN the OTP is sent successfully, THE ForgotPassword_Flow SHALL advance to step 2 and display an OTP input field with a 60-second resend cooldown timer and a note that the OTP expires in 5 minutes, consistent with the existing signup OTP UI pattern.
6. WHEN a user submits a 6-digit OTP in step 2, THE Login_Page SHALL call the backend OTP verification endpoint with purpose `password_reset` and advance to step 3 only if verification succeeds.
7. IF the OTP is incorrect, expired, or the maximum of 3 verification attempts has been reached, THEN THE Login_Page SHALL display the error returned by the backend without advancing to step 3.
8. WHEN a user submits a new password in step 3 of the ForgotPassword_Flow, THE Login_Page SHALL validate that: (a) the password is at least 8 characters long and contains at least one uppercase letter, consistent with the existing signup password policy, AND (b) the confirm-password field value matches the new password field value exactly.
9. IF the new password fails validation in step 3, THEN THE Login_Page SHALL display the specific validation error inline and SHALL NOT call the backend reset endpoint.
10. WHEN the new password passes validation, THE Login_Page SHALL call a backend endpoint to update the user's hashed password and mark the used OTP record as verified (`isVerified: true`) so it cannot be reused.
11. WHEN the password reset completes successfully, THE Login_Page SHALL display a success message and close the ForgotPassword_Flow, returning the user to the login form.
12. THE EmailOTP_Model SHALL support a `password_reset` value in its `purpose` enum field in addition to the existing `signup` value.
13. THE backend SHALL expose a `POST /api/user/send-otp-reset` endpoint that sends a password-reset OTP only to emails that correspond to existing user accounts.
14. THE backend SHALL expose a `POST /api/user/reset-password` endpoint that accepts `{ email, otp, newPassword }`, verifies the OTP with purpose `password_reset`, hashes the new password, and updates the user document.
15. WHILE any step of the ForgotPassword_Flow is submitting data, THE Login_Page SHALL disable all interactive controls within the flow and render a Loading_Spinner on the active submit button.
16. THE ForgotPassword_Flow UI SHALL be responsive and render correctly on screens 320px wide and above.

---

### Requirement 5: Appointments Sorted by Creation Time

**User Story:** As a doctor or admin, I want appointment lists to show the most recently booked appointments at the top, so that I can quickly see new bookings without scrolling.

#### Acceptance Criteria

1. WHEN the DoctorAppointments_Page loads appointments, THE page SHALL display appointments ordered from most recently booked to least recently booked, using the booking timestamp as the sort key.
2. WHEN the AllAppointments_Page loads appointments, THE page SHALL display appointments ordered from most recently booked to least recently booked, using the booking timestamp as the sort key.
3. WHEN the DoctorDashboard_Page displays a recent appointments list, THE list SHALL show the 5 most recently booked appointments, ordered from most recently booked to least recently booked.
4. WHEN a doctor or admin applies a search filter or specialty filter on the DoctorAppointments_Page or AllAppointments_Page, THE filtered results SHALL remain ordered from most recently booked to least recently booked within the filtered set.
5. WHEN a doctor or admin navigates to a subsequent page on the DoctorAppointments_Page or AllAppointments_Page, THE appointments on that page SHALL continue the descending booking-time order from where the previous page ended.
6. THE MyAppointments_Page patient-side appointment list SHALL display appointments ordered from most recently booked to least recently booked as the primary sort key; WHERE two appointments have the same booking timestamp, the appointment with the later scheduled slot datetime SHALL appear first as a secondary sort key.

---

### Requirement 6: Seed Blog System with Doctor-Linked Authors

**User Story:** As a platform administrator, I want to run a seed script that populates the blog system with realistic, medically relevant blog posts linked to seeded doctors, so that the platform has production-quality content from launch.

#### Acceptance Criteria

1. THE Seed_Script SHALL be a standalone Node.js ESM script located at `backend/scripts/seedBlogs.js` that follows the same structure as `backend/scripts/createDemoBlogs.js`.
2. THE Seed_Script SHALL insert a minimum of 6 blog posts, each with a unique `slug`, non-empty `title`, non-empty `excerpt`, detailed HTML `content` whose visible text (excluding HTML tags) is at least 150 words, a valid `imageUrl` from Unsplash, at least one `tag`, and `status` set to `approved`.
3. WHEN the Seed_Script runs, THE Seed_Script SHALL look up seeded doctors by email from the database and assign each blog's `doctorId` field to a valid seeded doctor ObjectId, and set `author` to that doctor's `name`.
4. WHEN the Seed_Script runs and a seeded doctor email is not found in the database, THE Seed_Script SHALL log a warning message to stdout and skip assigning that blog to a doctor rather than throwing an error.
5. THE Seed_Script SHALL set `authorRole` to `"doctor"` for all seeded blogs.
6. THE Seed_Script SHALL set `isDemo` to `true` on all inserted documents so they can be identified and removed separately from user-created content.
7. THE Seed_Script SHALL use `Blog.insertMany` with `ordered: false` to allow partial success if some slugs already exist; IF any documents are skipped due to duplicate key errors, THE Seed_Script SHALL log the count of skipped documents to stdout.
8. WHEN the BlogDetail_Page renders a blog whose `authorRole` is `"doctor"` and `doctorId` is non-null, THE BlogDetail_Page SHALL render the author name as an `<a>` or `<Link>` element whose `href` resolves to `/doctors/` followed by the string value of the blog's `doctorId` field.
9. WHEN the BlogDetail_Page renders a blog whose `authorRole` is `"admin"` or `doctorId` is null, THE BlogDetail_Page SHALL render the author name as a plain `<span>` element with no `href`, `onClick`, or other interactive attribute.
10. THE blog content in the Seed_Script SHALL cover distinct medical specialties represented by the seeded doctors (e.g., General Physician, Gynecologist, Dermatologist, Pediatrician, Neurologist, Orthopedic) and SHALL NOT contain lorem ipsum or placeholder text.
11. THE Seed_Script SHALL exit with code `0` on success and code `1` on fatal error, consistent with the existing script pattern.
12. THE Seed_Script SHALL disconnect from MongoDB in a `finally` block regardless of success or failure.
