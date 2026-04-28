# DocChain Appointment Booking System - API Documentation

## Overview

This document describes the new appointment booking flow with HOLD state, token payment, and cancellation policies.

---

## Key Changes

### Appointment Model Fields

```javascript
// Appointment Status (NEW)
appointmentStatus: {
  HOLD,                    // Temporary reservation (expires in 10 min)
  CONFIRMED,               // Confirmed after payment
  CANCELLED_BY_ADMIN,      // Cancelled by clinic/doctor
  CANCELLED_BY_USER,       // Cancelled by patient
  NO_SHOW,                 // Patient didn't show up
  COMPLETED                // Appointment completed
}

// Payment Status (NEW)
paymentStatus: {
  NOT_PAID,               // No payment made
  PARTIAL,                // 10% token paid (CASH option)
  PAID,                   // Full payment (ONLINE option)
  REFUNDED                // Payment refunded
}

// Payment Method (NEW)
paymentMethod: {
  ONLINE,                 // Card payment via Stripe
  CASH                    // 10% token online, 90% at clinic
}

// New Fields
tokenAmount: Number,       // 10% of full amount (for CASH option)
tokenPaid: Boolean,        // Token payment status
holdExpiry: Date,          // When HOLD expires if no payment
confirmationTime: Date,    // When appointment was confirmed
cancellationReason: String,// Why it was cancelled
cancelledBy: String,       // "ADMIN" or "USER"
refundStatus: String,      // "NONE", "PENDING", "COMPLETED", "FAILED"
refundAmount: Number,      // Amount to be refunded
```

---

## Appointment Booking Flow

### Phase 1: Create Hold (When User Selects Slot)

**Endpoint:** `POST /api/user/book-appointment`

**Request:**
```json
{
  "docId": "doctor_id",
  "slotDate": "2024-04-25",
  "slotTime": "10:00 - 10:30"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Slot reserved in HOLD state",
  "appointmentId": "apt_123",
  "appointment": {
    "_id": "apt_123",
    "status": "HOLD",
    "fullAmount": 5000,
    "tokenAmount": 500,
    "holdExpiry": "2024-04-25T10:15:00Z",
    "slotDate": "2024-04-25",
    "slotTime": "10:00 - 10:30"
  }
}
```

**What Happens:**
- ✅ Appointment created in `HOLD` state
- ✅ Slot NOT locked (other users can also book same slot in HOLD)
- ✅ HOLD expires in 10 minutes
- ✅ User shown payment options

---

### Phase 2: Payment Options

User chooses between two payment methods:

#### Option A: Full Online Payment (10% discount)

**Endpoint:** `POST /api/stripe/create-checkout-session`

**Request:**
```json
{
  "appointmentId": "apt_123"
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://checkout.stripe.com/..."
}
```

**After Payment Completion:**

**Endpoint:** `POST /api/stripe/verify-payment`

**Request:**
```json
{
  "sessionId": "cs_test_..."
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Payment verified and appointment confirmed",
  "appointment": {
    "_id": "apt_123",
    "status": "CONFIRMED",
    "paymentStatus": "PAID"
  }
}
```

**What Happens:**
- ✅ Atomic transaction: slot checked & locked simultaneously
- ✅ If another user already confirmed same slot → "Slot no longer available"
- ✅ Appointment status → `CONFIRMED`
- ✅ Payment status → `PAID`
- ✅ Slot added to doctor's `slots_booked`
- ✅ Confirmation email sent

---

#### Option B: Cash Payment (10% Token Required)

**Endpoint:** `POST /api/stripe/create-token-payment-session`

**Request:**
```json
{
  "appointmentId": "apt_123"
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://checkout.stripe.com/..."
}
```

**After Token Payment Completion:**

**Endpoint:** `POST /api/stripe/verify-token-payment`

**Request:**
```json
{
  "sessionId": "cs_test_..."
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Token payment confirmed. Appointment confirmed. Remaining amount due at clinic.",
  "appointment": {
    "_id": "apt_123",
    "status": "CONFIRMED",
    "paymentStatus": "PARTIAL",
    "remainingAmount": 4500
  }
}
```

**What Happens:**
- ✅ Atomic transaction: slot checked & locked simultaneously
- ✅ Appointment status → `CONFIRMED`
- ✅ Payment status → `PARTIAL`
- ✅ Token marked as `PAID`
- ✅ Confirmation email with remaining balance sent
- ✅ Patient pays Rs. 4500 at clinic on appointment day

---

## Cancellation Flow

### User Cancellation

**Endpoint:** `POST /api/user/cancel-appointment`

**Request:**
```json
{
  "appointmentId": "apt_123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment cancelled successfully",
  "refundStatus": "PENDING"
}
```

**For CONFIRMED Appointments:**
- ✅ Status → `CANCELLED_BY_USER`
- ✅ Slot released
- ✅ Refund marked as `PENDING`
- ✅ Cancellation email sent

**For HOLD Appointments:**
- ✅ Just cancelled (no slot to release)
- ✅ Email sent

---

### Admin/Doctor Cancellation

**Endpoint:** `POST /api/admin/cancel-appointment`

**Request:**
```json
{
  "appointmentId": "apt_123",
  "cancellationReason": "Doctor emergency"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment cancelled successfully",
  "refundStatus": "PENDING",
  "refundAmount": 5000
}
```

**What Happens:**
- ✅ Status → `CANCELLED_BY_ADMIN`
- ✅ Slot released
- ✅ Refund calculated and marked as `PENDING`
- ✅ Patient receives email: "Your appointment was cancelled due to an emergency. Your advance payment has been refunded."
- ✅ Doctor receives notification

---

## HOLD Expiry Cleanup

### Automatic Cleanup (Runs Every 5 Minutes)

The background task automatically:
- Finds all HOLD appointments where `holdExpiry < now`
- Cancels them to free up slots
- No action needed from admin

### Manual Cleanup (Admin Trigger)

**Endpoint:** `POST /api/admin/trigger-hold-cleanup`

**Request:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "message": "Cleanup completed. 3 expired HOLD appointments were cancelled.",
  "cleaned": 3
}
```

---

## Slot Availability Logic

### Key Rule: Only CONFIRMED appointments block slots

```javascript
// ✅ Multiple users can HOLD the same slot
const conflictingHolds = await appointmentModel.countDocuments({
  docId, slotDate, slotTime,
  appointmentStatus: APPOINTMENT_STATUS.HOLD
});
// Multiple HOLD = OK, slot still available

// ❌ Only one CONFIRMED appointment per slot
const conflictingConfirmed = await appointmentModel.countDocuments({
  docId, slotDate, slotTime,
  appointmentStatus: APPOINTMENT_STATUS.CONFIRMED
});
// If > 0, slot is BOOKED and unavailable
```

---

## Race Condition Handling

**Scenario:** Two users attempting to book and pay for the same slot simultaneously

**Solution:** Atomic MongoDB Transaction

```javascript
// 1. Start transaction
// 2. Lock appointment record
// 3. Check if still HOLD status
// 4. Check if another CONFIRMED appointment exists
// 5. If conflicts found → ABORT
// 6. Update appointment to CONFIRMED
// 7. Update doctor slots_booked
// 8. Commit transaction
```

**User 1 Result:** ✅ Appointment confirmed
**User 2 Result:** ❌ "Slot no longer available - another user booked it"

---

## Patient History Display

### Appointment Card Shows:

```
Dr. Ahmed Khan (Cardiologist)
📅 April 25, 2024 | 10:00 - 10:30

Status: Confirmed
Payment: Paid (Rs. 5000 @ 10% discount)
Cancellation: Cancelled by clinic due to emergency
Refund: Rs. 5000 (Pending)
```

### Status Messages

| Status | Message |
|--------|---------|
| HOLD | Pending Payment |
| CONFIRMED | Confirmed |
| CANCELLED_BY_ADMIN | Cancelled by Clinic |
| CANCELLED_BY_USER | Cancelled by You |
| NO_SHOW | No Show |
| COMPLETED | Completed |

---

## Migration

### Run Migration Script Once

Before deploying, update existing appointments:

```bash
cd backend
node scripts/migrateAppointments.js
```

**What it does:**
- Adds new fields to all existing appointments
- Converts old `cancelled`/`payment` flags to new `appointmentStatus`
- Sets appropriate `paymentStatus`
- Logs summary of changes

---

## Email Templates Updated

The following email templates now include:

1. **Appointment Booked (Patient)**
   - Shows slot details
   - Payment options
   - Hold expiry time

2. **Payment Accepted**
   - Confirms payment
   - Shows amount paid
   - If CASH: shows remaining balance

3. **Appointment Cancelled (Patient)**
   - Cancellation reason
   - Refund amount & status
   - Timeline for refund

4. **Appointment Cancelled (Doctor)**
   - Patient name
   - Cancellation reason
   - Affected slot

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Slot not available" | CONFIRMED appointment exists | User blocked from booking |
| "Slot no longer available - another user booked it" | Race condition (payment verified on locked slot) | Retry booking with different slot |
| "Appointment is no longer available for payment" | HOLD expired or already confirmed | Start new booking |
| "Cannot cancel this appointment" | Appointment already completed/cancelled | No further action needed |

---

## Database Indexes

Added for performance:

```javascript
appointmentSchema.index({ holdExpiry: 1, appointmentStatus: 1 });
appointmentSchema.index({ userId: 1, appointmentStatus: 1 });
appointmentSchema.index({ docId: 1, slotDate: 1, appointmentStatus: 1 });
```

These ensure:
- Fast cleanup of expired HOLDs
- Quick user appointment queries
- Quick slot availability checks

---

## Backward Compatibility

Legacy fields retained:

```javascript
cancelled: Boolean,      // Old field, kept for compatibility
payment: Boolean,        // Old field, kept for compatibility
isCompleted: Boolean,    // Old field, kept for compatibility
isRated: Boolean,        // Old field, kept for compatibility
```

New code uses new fields (`appointmentStatus`, `paymentStatus`) exclusively.

---

## Testing Checklist

- [ ] Create HOLD appointment (slot not locked)
- [ ] Multiple users can book same slot while HOLD
- [ ] First user pays → CONFIRMED, others get "slot unavailable"
- [ ] HOLD expires after 10 minutes
- [ ] Admin can manually trigger cleanup
- [ ] Token payment works (PARTIAL status)
- [ ] Full payment works with discount (PAID status)
- [ ] User can cancel CONFIRMED appointment
- [ ] Admin can cancel with refund
- [ ] Cancellation emails sent correctly
- [ ] Migration script updates existing appointments
- [ ] Refund status tracking works
- [ ] Patient history shows all statuses correctly

---

## Frontend Integration Points

### 1. After Booking (HOLD state)
- Show 2 payment buttons: "Pay Online" vs "Pay Token (10%)"
- Show countdown timer: "Payment required in 10 minutes"
- Display token amount vs full amount

### 2. After Payment
- Show "Appointment Confirmed"
- For Token: show "Remaining Rs. XXXX due at clinic"

### 3. Patient History
- Show appointment status with styling
- Show cancellation reason if cancelled
- Show refund status if applicable

### 4. Admin Dashboard
- Show count of expired HOLDs
- Manual cleanup button
- Show appointments by status

---
