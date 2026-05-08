# Appointment Reminder Bugfix Design

## Overview

Two related defects exist in the DocChain reminder infrastructure:

1. **Missing manual trigger** — `sendWhapiReminderForAppointment()` in `whapiAppointmentService.js` is fully implemented but is never exposed via any HTTP route. Doctors have no way to send an on-demand WhatsApp reminder from the appointment card in the Doctor panel.

2. **Missing schema fields** — `processWhapiAutoReminders()` queries `whapi_auto_reminder_sent_patient` and `whapi_auto_reminder_sent_doctor` on every scheduler tick, but those fields are absent from `appointmentModel.js`. MongoDB returns `undefined` for missing fields, so the `$ne: true` filter always matches, causing the auto-reminder to fire on every 5-minute tick instead of exactly once per appointment.

**Fix strategy (strictly additive):**
- Add the two missing Boolean fields to `appointmentModel.js` with `default: false`.
- Add a new controller function `triggerReminder` to `doctorController.js`.
- Register a new route `POST /api/doctor/appointments/:id/trigger-reminder` in `doctorRoute.js`.
- Add a `triggerReminder` context function to `DoctorContext.jsx`.
- Render a "Trigger Reminder" button on active (non-cancelled, non-completed) appointment cards in `DoctorAppointments.jsx`.

No existing function, route, model field, hook, index, payment flow, or cancellation flow is modified.

---

## Glossary

- **Bug_Condition (C)**: The set of inputs that trigger defective behavior — either (a) a doctor attempts to send a manual reminder but no endpoint exists, or (b) the auto-reminder scheduler runs and reads fields absent from the schema.
- **Property (P)**: The desired correct behavior — manual reminders are sent immediately on button click; auto-reminders are sent exactly once per appointment.
- **Preservation**: All existing booking, cancellation, payment, completion, and notification flows remain byte-for-byte identical.
- **`sendWhapiReminderForAppointment(appointmentId)`**: Existing function in `backend/services/whapiAppointmentService.js` that sends a WhatsApp reminder to both patient and doctor for a given appointment. Already fully implemented; only needs to be wired to a route.
- **`processWhapiAutoReminders()`**: Existing scheduler function in `whapiAppointmentService.js` that runs every 5 minutes and sends reminders for appointments 25–35 minutes away. Reads `whapi_auto_reminder_sent_patient` / `whapi_auto_reminder_sent_doctor` to avoid re-sending.
- **`authDoctor` middleware**: Reads the `dtoken` header, verifies the JWT, and injects `req.body.docId` with the authenticated doctor's ID.
- **`whapi_auto_reminder_sent_patient`**: New Boolean field on the appointment document. Set to `true` after the auto-reminder is sent to the patient. Prevents duplicate sends.
- **`whapi_auto_reminder_sent_doctor`**: New Boolean field on the appointment document. Set to `true` after the auto-reminder is sent to the doctor. Prevents duplicate sends.

---

## Bug Details

### Bug Condition

**Bug A — No manual trigger endpoint:**

The bug manifests when a doctor views an active appointment card and wants to send a WhatsApp reminder. The `sendWhapiReminderForAppointment` service function exists and works, but no HTTP route calls it, so the frontend has no endpoint to hit.

**Formal Specification:**
```
FUNCTION isBugCondition_A(request)
  INPUT: request of type HTTP POST
  OUTPUT: boolean

  RETURN request.path MATCHES "/api/doctor/appointments/:id/trigger-reminder"
         AND no route handler is registered for that path
END FUNCTION
```

**Bug B — Auto-reminder fires on every tick:**

The bug manifests when `processWhapiAutoReminders()` runs. It queries `{ whapi_auto_reminder_sent_patient: { $ne: true } }`, but because the field does not exist in the schema, MongoDB stores no value for it, and `undefined !== true` evaluates to `true` — so every CONFIRMED appointment in the 25–35 minute window is matched on every scheduler tick.

**Formal Specification:**
```
FUNCTION isBugCondition_B(appointment)
  INPUT: appointment of type AppointmentDocument
  OUTPUT: boolean

  RETURN "whapi_auto_reminder_sent_patient" NOT IN appointment.schema.paths
         OR "whapi_auto_reminder_sent_doctor" NOT IN appointment.schema.paths
END FUNCTION
```

### Examples

**Bug A:**
- Doctor clicks "Trigger Reminder" → frontend calls `POST /api/doctor/appointments/abc123/trigger-reminder` → Express returns 404 (no route registered) → patient and doctor receive no WhatsApp message.

**Bug B:**
- Appointment is CONFIRMED at 9:00 AM. Scheduler runs at 8:28 AM (within window). Reminder sent. Scheduler runs again at 8:33 AM. Because `whapi_auto_reminder_sent_patient` is not in the schema, the `$ne: true` filter still matches. Reminder sent again. This repeats every 5 minutes until the appointment time passes.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `POST /api/user/book-appointment` — booking flow, payment processing, and booking confirmation WhatsApp notification are completely unaffected.
- `POST /api/doctor/cancel-appointment` — cancellation flow, refund processing, and cancellation WhatsApp notification are completely unaffected.
- `POST /api/doctor/complete-appointment` — completion flow, wallet crediting, and completion email are completely unaffected.
- `processWhapiAppointmentRemindersSimple()` — the existing 30-minute reminder job using `whapi_reminder_sent_patient` / `whapi_reminder_sent_doctor` continues to run unchanged.
- `cleanupExpiredHolds()` and `finalizeExpiredOnlineSessions()` — continue on their 5-minute interval unchanged.
- `POST /api/whatsapp/appointment-reminder` — the existing Twilio-based reminder endpoint in `whatsappController.js` is completely independent and unchanged.
- The `syncLegacyFields` pre-save hook, the `unique_confirmed_slot` partial index, and all other existing schema indexes are untouched.
- The "Trigger Reminder" button does NOT appear on cancelled or completed appointment cards.

**Scope:**
All inputs that do NOT involve the new `POST /api/doctor/appointments/:id/trigger-reminder` endpoint or the two new schema fields are completely unaffected by this fix.

---

## Hypothesized Root Cause

**Bug A — No route registered:**
The `sendWhapiReminderForAppointment` function was implemented in the service layer but the developer did not add the corresponding route and controller handler. The route file `doctorRoute.js` has no entry for `trigger-reminder`, and `doctorController.js` has no `triggerReminder` export.

**Bug B — Schema fields missing:**
The `processWhapiAutoReminders` function was written to use `whapi_auto_reminder_sent_patient` and `whapi_auto_reminder_sent_doctor` as deduplication flags, but the corresponding field definitions were never added to `appointmentSchema` in `appointmentModel.js`. The existing `whapi_reminder_sent_patient` / `whapi_reminder_sent_doctor` fields (used by `processWhapiAppointmentRemindersSimple`) are present, but the `_auto_` variants are not. MongoDB silently treats absent fields as `undefined`, which always satisfies `$ne: true`, causing unbounded re-sends.

---

## Correctness Properties

Property 1: Bug Condition A — Manual Reminder Endpoint Responds

_For any_ authenticated doctor HTTP request to `POST /api/doctor/appointments/:id/trigger-reminder` where the appointment exists and belongs to the authenticated doctor, the fixed system SHALL invoke `sendWhapiReminderForAppointment(id)` and return `{ success: true }` (or a structured error if the Whapi call fails), without modifying the appointment's `appointmentStatus`, `cancelled`, `isCompleted`, `paymentStatus`, or any other existing field.

**Validates: Requirements 2.1, 2.3**

Property 2: Bug Condition B — Auto-Reminder Sent Exactly Once

_For any_ CONFIRMED appointment document where `whapi_auto_reminder_sent_patient` and `whapi_auto_reminder_sent_doctor` are both `true`, the fixed `processWhapiAutoReminders()` SHALL NOT include that appointment in its processing batch, regardless of how many times the scheduler runs.

**Validates: Requirements 2.2**

Property 3: Preservation — Existing Flows Unchanged

_For any_ input that does NOT involve the new `trigger-reminder` route or the two new schema fields, the fixed system SHALL produce exactly the same behavior as the original system, preserving all booking, cancellation, payment, completion, and notification flows.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

---

## High-Level Design

### System Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Doctor Panel (React)                         │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  DoctorAppointments.jsx                                      │   │
│  │                                                              │   │
│  │  [Cancel ✕] [Complete ✓] [Trigger Reminder 🔔]  ← NEW       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  DoctorContext.jsx                                           │   │
│  │  + triggerReminder(appointmentId)  ← NEW                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ POST /api/doctor/appointments/:id/trigger-reminder
                               │ Header: dToken
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Express Backend                              │
│                                                                     │
│  doctorRoute.js                                                     │
│  POST /appointments/:id/trigger-reminder  ← NEW ROUTE              │
│       │                                                             │
│       ▼ authDoctor middleware (existing, unchanged)                 │
│       │                                                             │
│       ▼                                                             │
│  doctorController.js                                                │
│  triggerReminder(req, res)  ← NEW CONTROLLER FUNCTION              │
│       │                                                             │
│       ▼                                                             │
│  whapiAppointmentService.js                                         │
│  sendWhapiReminderForAppointment(appointmentId)  ← EXISTING        │
│       │                                                             │
│       ▼                                                             │
│  whapiService.js                                                    │
│  sendWhapiTextMessage({ to, body })  ← EXISTING, UNCHANGED         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ WhatsApp API call
                               ▼
                        Whapi Gateway → Patient & Doctor phones

┌─────────────────────────────────────────────────────────────────────┐
│                   Background Scheduler (every 5 min)                │
│                                                                     │
│  backgroundTasks.js → processWhapiAutoReminders()  ← EXISTING      │
│       │                                                             │
│       ▼                                                             │
│  appointmentModel.js                                                │
│  Query: { appointmentStatus: "CONFIRMED",                           │
│           $or: [                                                    │
│             { whapi_auto_reminder_sent_patient: { $ne: true } },    │
│             { whapi_auto_reminder_sent_doctor:  { $ne: true } }     │
│           ]}                                                        │
│       │                                                             │
│       │  whapi_auto_reminder_sent_patient: Boolean  ← NEW FIELD    │
│       │  whapi_auto_reminder_sent_doctor:  Boolean  ← NEW FIELD    │
│       ▼                                                             │
│  whapiService.js → Whapi Gateway                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Model Changes

Two new fields are added to `appointmentSchema`. All existing fields, hooks, and indexes are untouched.

| Field | Type | Default | Purpose |
|---|---|---|---|
| `whapi_auto_reminder_sent_patient` | Boolean | `false` | Deduplication flag for `processWhapiAutoReminders` — patient side |
| `whapi_auto_reminder_sent_doctor` | Boolean | `false` | Deduplication flag for `processWhapiAutoReminders` — doctor side |

Existing reminder flags for reference (unchanged):

| Field | Used by | Status |
|---|---|---|
| `whapi_reminder_sent_patient` | `processWhapiAppointmentRemindersSimple` | Already in schema ✓ |
| `whapi_reminder_sent_doctor` | `processWhapiAppointmentRemindersSimple` | Already in schema ✓ |
| `whapi_auto_reminder_sent_patient` | `processWhapiAutoReminders` | **Missing → being added** |
| `whapi_auto_reminder_sent_doctor` | `processWhapiAutoReminders` | **Missing → being added** |

### API Contract

#### New Endpoint

```
POST /api/doctor/appointments/:id/trigger-reminder
```

**Authentication:** `dToken` header (existing `authDoctor` middleware — unchanged)

**URL Parameter:**
| Param | Type | Description |
|---|---|---|
| `id` | string (MongoDB ObjectId) | The appointment's `_id` |

**Request Body:** none (the `authDoctor` middleware injects `docId` into `req.body`)

**Success Response — 200 OK:**
```json
{
  "success": true,
  "message": "Reminder sent successfully",
  "result": {
    "sent": true,
    "patient": { "sent": true },
    "doctor":  { "sent": true }
  }
}
```

**Partial Success — 200 OK (one side failed):**
```json
{
  "success": true,
  "message": "Reminder sent (partial)",
  "result": {
    "sent": true,
    "patient": { "sent": true },
    "doctor":  { "sent": false, "error": "No phone number on file" }
  }
}
```

**Error Responses:**
| Status | Condition | Body |
|---|---|---|
| 200 | Appointment not found | `{ "success": false, "message": "Appointment not found" }` |
| 200 | Doctor not authorized for this appointment | `{ "success": false, "message": "Not authorized" }` |
| 200 | Appointment is cancelled or completed | `{ "success": false, "message": "Cannot send reminder for a cancelled or completed appointment" }` |
| 200 | Whapi call failed entirely | `{ "success": false, "message": "<error detail>" }` |

> Note: The project uses `res.json({ success: false, ... })` with HTTP 200 for business-logic errors, consistent with all other endpoints in the codebase.

---

## Fix Implementation

### Changes Required

#### 1. `backend/models/appointmentModel.js` — Add two schema fields

**Location:** Inside `appointmentSchema`, after the existing `whapi_reminder_sent_doctor` field (line ~130 in the current file).

**Specific Change:** Add the two new Boolean fields with `default: false`. No other lines are touched.

```javascript
// WhatsApp auto-reminder tracking (for processWhapiAutoReminders scheduler)
whapi_auto_reminder_sent_patient: { type: Boolean, default: false },
whapi_auto_reminder_sent_doctor:  { type: Boolean, default: false },
```

#### 2. `backend/controllers/doctorController.js` — Add `triggerReminder` function

**Location:** Add after the `appointmentCancel` function. Add the import for `sendWhapiReminderForAppointment` at the top of the file.

**Specific Change:** New export `triggerReminder`. No existing function is modified.

#### 3. `backend/routes/doctorRoute.js` — Register new route

**Location:** Add one line after the existing `doctorRouter.post("/cancel-appointment", ...)` line.

**Specific Change:** Import `triggerReminder` from the controller and register the route.

#### 4. `admin/src/context/DoctorContext.jsx` — Add `triggerReminder` context function

**Location:** Add after the `cancelAppointment` function. Expose via the `value` object.

**Specific Change:** New async function `triggerReminder(appointmentId)`. No existing function is modified.

#### 5. `admin/src/pages/Doctor/DoctorAppointments.jsx` — Add "Trigger Reminder" button

**Location:** Inside the actions `<div>` in the appointment row, alongside the existing cancel and complete buttons.

**Specific Change:** Add a new `<button>` that calls `triggerReminder(item._id)`. The button is only rendered when `!item.cancelled && !item.isCompleted` (same guard as the existing cancel/complete buttons). No existing button is modified.

---

## Low-Level Design

### 1. Schema Field Additions (appointmentModel.js)

```javascript
// Existing fields (unchanged, shown for context):
whapi_reminder_sent_patient:  { type: Boolean, default: false },
whapi_reminder_sent_doctor:   { type: Boolean, default: false },
reminder_sent:                { type: Boolean, default: false },
reminder_sent_doctor:         { type: Boolean, default: false },
checkin_sent_patient:         { type: Boolean, default: false },
checkin_sent_doctor:          { type: Boolean, default: false },

// NEW — required by processWhapiAutoReminders():
whapi_auto_reminder_sent_patient: { type: Boolean, default: false },
whapi_auto_reminder_sent_doctor:  { type: Boolean, default: false },
```

**Why this fixes Bug B:**
Before the fix, `appointment.whapi_auto_reminder_sent_patient` is `undefined`. The query `{ whapi_auto_reminder_sent_patient: { $ne: true } }` matches because `undefined !== true`. After the fix, new appointments get `false` by default, and the field is set to `true` after the first send. Existing appointments in the database will have `undefined` for these fields (MongoDB does not backfill), so they will still match the `$ne: true` filter once — which is the correct behavior (send the reminder once for appointments that haven't had it yet). No migration script is needed.

### 2. Controller Function (doctorController.js)

```javascript
/**
 * POST /api/doctor/appointments/:id/trigger-reminder
 * Manually sends a WhatsApp reminder for a specific appointment.
 * Only the owning doctor can trigger this. Does not modify appointment status.
 */
const triggerReminder = async (req, res) => {
  try {
    // req.params.id  — appointment ObjectId from URL
    // req.body.docId — injected by authDoctor middleware
    const { id: appointmentId } = req.params;
    const { docId } = req.body;

    // 1. Load appointment
    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    // 2. Ownership check — doctor must own this appointment
    if (String(appointment.docId) !== String(docId)) {
      return res.json({ success: false, message: "Not authorized" });
    }

    // 3. Guard — do not send reminders for cancelled or completed appointments
    if (appointment.cancelled || appointment.isCompleted) {
      return res.json({
        success: false,
        message: "Cannot send reminder for a cancelled or completed appointment",
      });
    }

    // 4. Delegate to existing service function (no changes to that function)
    const result = await sendWhapiReminderForAppointment(appointmentId);

    if (!result.sent && result.error) {
      return res.json({ success: false, message: result.error });
    }

    return res.json({
      success: true,
      message: result.sent ? "Reminder sent successfully" : "Reminder sent (partial)",
      result,
    });
  } catch (error) {
    console.error("[TRIGGER-REMINDER] Error:", error);
    return res.json({ success: false, message: error.message });
  }
};
```

**Function signature:**
```
triggerReminder(req: express.Request, res: express.Response): Promise<void>
```

**Dependencies (all existing, unchanged):**
- `appointmentModel` — already imported in `doctorController.js`
- `sendWhapiReminderForAppointment` — imported from `../services/whapiAppointmentService.js`

### 3. Route Registration (doctorRoute.js)

```javascript
// New import added to existing import block:
import {
  // ... existing imports ...
  triggerReminder,           // ← ADD
} from "../controllers/doctorController.js";

// New route — add after existing cancel-appointment route:
doctorRouter.post("/appointments/:id/trigger-reminder", authDoctor, triggerReminder);
```

**Route pattern:** `POST /api/doctor/appointments/:id/trigger-reminder`
- `:id` is the appointment's MongoDB `_id`
- `authDoctor` middleware runs first (existing, unchanged) — verifies `dToken` header and injects `req.body.docId`

### 4. Context Function (DoctorContext.jsx)

```javascript
/**
 * Sends a WhatsApp reminder for the given appointment via the new backend endpoint.
 * Shows a toast on success or failure.
 */
const triggerReminder = async (appointmentId) => {
  try {
    const { data } = await axios.post(
      `${backendUrl}/api/doctor/appointments/${appointmentId}/trigger-reminder`,
      {},                          // empty body — docId is injected server-side by authDoctor
      { headers: { dToken } },
    );

    if (data.success) {
      toast.success(data.message || "Reminder sent");
    } else {
      toast.error(data.message || "Failed to send reminder");
    }
  } catch (error) {
    console.error("[triggerReminder]", error);
    toast.error(error.message);
  }
};

// Add to value object:
const value = {
  // ... existing values ...
  triggerReminder,   // ← ADD
};
```

**Function signature:**
```
triggerReminder(appointmentId: string): Promise<void>
```

### 5. Frontend Button (DoctorAppointments.jsx)

The button is added inside the existing actions `<div>` that already contains the cancel and complete buttons. It is rendered only when `!item.cancelled && !item.isCompleted` — the same condition that gates the existing buttons.

```jsx
// Destructure triggerReminder from context (alongside existing destructured values):
const {
  dToken,
  appointments,
  getAppointments,
  completeAppointment,
  cancelAppointment,
  joinOnlineAppointment,
  triggerReminder,   // ← ADD
} = useContext(DoctorContext);

// Inside the actions <div>, after the complete button:
<button
  onClick={() => triggerReminder(item._id)}
  title="Send WhatsApp Reminder"
  className="transition-transform p-1 hover:bg-yellow-50 rounded-full hover:scale-110 active:scale-95"
>
  {/* Bell emoji — no new asset required */}
  <span className="text-lg leading-none" role="img" aria-label="Send reminder">
    🔔
  </span>
</button>
```

**Placement in the action cell:**
```
[Join Call (online only)] [Cancel ✕] [Complete ✓] [Reminder 🔔]
```

The button uses a bell emoji (🔔) so no new SVG asset is needed. The `title` attribute provides a tooltip. The `aria-label` ensures screen-reader accessibility.

**Grid column impact:** The existing action column is `100px` wide on desktop. Adding a small icon button (≈32px) alongside the existing two icon buttons (each ≈48px) fits within the column. On mobile the actions are in a flex row that wraps naturally.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate both bugs BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan for Bug A**: Make an HTTP POST to `/api/doctor/appointments/:id/trigger-reminder` with a valid `dToken` and a real appointment ID on the unfixed codebase. Expect a 404 response, confirming no route is registered.

**Test Plan for Bug B**: Insert a CONFIRMED appointment with `slotTime` 30 minutes in the future into the test database (without `whapi_auto_reminder_sent_patient` / `whapi_auto_reminder_sent_doctor` fields). Call `processWhapiAutoReminders()` twice. Observe that the reminder is sent on both calls, confirming the deduplication flag is not working.

**Test Cases:**
1. **No route registered (Bug A)**: `POST /api/doctor/appointments/validId/trigger-reminder` → expect 404 on unfixed code.
2. **Auto-reminder re-fires (Bug B)**: Call `processWhapiAutoReminders()` twice for the same in-window appointment → expect `sendWhapiTextMessage` called twice on unfixed code.
3. **Schema field absent**: Query `appointmentModel.schema.paths` for `whapi_auto_reminder_sent_patient` → expect `undefined` on unfixed code.

**Expected Counterexamples:**
- Bug A: Express returns `Cannot POST /api/doctor/appointments/:id/trigger-reminder`.
- Bug B: `sendWhapiTextMessage` is called on every scheduler tick for the same appointment.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed system produces the expected behavior.

**Pseudocode:**
```
-- Bug A fix check:
FOR ALL (doctorToken, appointmentId) WHERE isBugCondition_A(request) DO
  response := POST /api/doctor/appointments/{appointmentId}/trigger-reminder
              WITH header dToken = doctorToken
  ASSERT response.status = 200
  ASSERT response.body.success = true
  ASSERT sendWhapiTextMessage WAS CALLED with patient phone
  ASSERT sendWhapiTextMessage WAS CALLED with doctor phone
  ASSERT appointment.appointmentStatus IS UNCHANGED
END FOR

-- Bug B fix check:
FOR ALL appointment WHERE isBugCondition_B(appointment) DO
  CALL processWhapiAutoReminders() TWICE
  ASSERT sendWhapiTextMessage CALL COUNT = 1 (not 2)
  ASSERT appointment.whapi_auto_reminder_sent_patient = true AFTER first call
  ASSERT appointment.whapi_auto_reminder_sent_doctor  = true AFTER first call
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed system produces the same result as the original system.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition_A(input) AND NOT isBugCondition_B(input) DO
  ASSERT fixedSystem(input) = originalSystem(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain.
- It catches edge cases that manual unit tests might miss.
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs.

**Test Cases:**
1. **Booking flow preservation**: Book an appointment end-to-end → verify `whapi_booking_sent_patient` / `whapi_booking_sent_doctor` are set, new fields are `false`, no extra messages sent.
2. **Cancellation flow preservation**: Cancel an appointment → verify `cancelled = true`, `whapi_auto_reminder_sent_*` fields are not touched.
3. **Completion flow preservation**: Complete an appointment → verify `isCompleted = true`, wallet credited, no reminder sent.
4. **`processWhapiAppointmentRemindersSimple` preservation**: Run the existing reminder job → verify it still uses `whapi_reminder_sent_patient` / `whapi_reminder_sent_doctor` and is unaffected by the new fields.
5. **Trigger Reminder on cancelled appointment**: Call `POST /api/doctor/appointments/:id/trigger-reminder` for a cancelled appointment → expect `{ success: false, message: "Cannot send reminder for a cancelled or completed appointment" }`.
6. **Trigger Reminder unauthorized**: Call endpoint with a `dToken` belonging to a different doctor → expect `{ success: false, message: "Not authorized" }`.

### Unit Tests

- Test `triggerReminder` controller with a valid appointment owned by the authenticated doctor → expect `sendWhapiReminderForAppointment` called once, response `{ success: true }`.
- Test `triggerReminder` controller with a cancelled appointment → expect `{ success: false }`, `sendWhapiReminderForAppointment` not called.
- Test `triggerReminder` controller with an appointment owned by a different doctor → expect `{ success: false, message: "Not authorized" }`.
- Test `triggerReminder` controller with a non-existent appointment ID → expect `{ success: false, message: "Appointment not found" }`.
- Test `processWhapiAutoReminders` with the two new fields present and set to `true` → expect the appointment is skipped (not re-sent).
- Test `processWhapiAutoReminders` with the two new fields present and set to `false` → expect the appointment is processed and fields set to `true`.

### Property-Based Tests

- Generate random appointment documents with `appointmentStatus: "CONFIRMED"` and `whapi_auto_reminder_sent_patient: true` → verify `processWhapiAutoReminders` never calls `sendWhapiTextMessage` for those appointments.
- Generate random appointment documents with `appointmentStatus` values other than `"CONFIRMED"` → verify `processWhapiAutoReminders` never processes them.
- Generate random valid `(doctorToken, appointmentId)` pairs where the doctor does not own the appointment → verify `triggerReminder` always returns `{ success: false }`.
- Generate random appointment states (cancelled, completed, active) → verify the "Trigger Reminder" button is only rendered for active (non-cancelled, non-completed) appointments.

### Integration Tests

- Full flow: book appointment → wait for auto-reminder window → verify reminder sent exactly once → verify second scheduler tick does not re-send.
- Full flow: doctor clicks "Trigger Reminder" button in UI → verify WhatsApp message received by patient and doctor → verify appointment record unchanged.
- Full flow: cancel appointment → verify "Trigger Reminder" button is absent from the card → verify clicking the endpoint directly returns `{ success: false }`.
- Full flow: complete appointment → verify "Trigger Reminder" button is absent → verify existing completion flow (wallet, email) is unaffected.
