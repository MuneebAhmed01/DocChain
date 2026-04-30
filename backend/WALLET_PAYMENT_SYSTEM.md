# Doctor Wallet & Token Payment System - Complete Implementation Guide

## Overview

This document explains the complete wallet payment system for the doctor appointment booking flow, including:

- Token payment crediting on appointment confirmation
- Remaining amount crediting on appointment completion
- Token reversal on doctor cancellation
- Atomic operations with idempotency checks
- Transaction auditing and tracking

---

## Data Models

### 1. Appointment Model Updates

[backend/models/appointmentModel.js](backend/models/appointmentModel.js)

**New Fields:**

```javascript
remainingAmountCredited: { type: Boolean, default: false }
remainingAmountCreditedAmount: { type: Number, default: 0 }
completionTime: { type: Date, default: null }
```

**Existing Tracking Fields:**

```javascript
walletCredited: Boolean; // Token/Full payment credited
walletCreditedAmount: Number; // Amount credited during payment
walletReversed: Boolean; // Payment reversed (doctor cancel)
walletReversedAmount: Number; // Amount reversed
```

### 2. Wallet Transaction Model (NEW)

[backend/models/walletTransactionModel.js](backend/models/walletTransactionModel.js)

**Purpose:** Atomic audit trail for all wallet operations

**Fields:**

```javascript
docId: ObjectId; // Doctor who owns the transaction
transactionType: Enum; // TOKEN_CREDIT | REMAINING_CREDIT |
// TOKEN_REVERSAL | REFUND_DEBIT |
// MANUAL_ADJUSTMENT
amount: Number; // Transaction amount (positive or negative)
status: Enum; // PENDING | COMPLETED | FAILED | REVERSED
appointmentId: ObjectId; // Related appointment
reason: String; // Transaction reason
balanceAfter: Number; // Balance snapshot after transaction
idempotencyKey: String; // Prevents duplicate operations
metadata: Object; // Additional context
```

---

## Service Layer

### Wallet Service

[backend/services/walletService.js](backend/services/walletService.js)

All wallet operations are managed through this service, ensuring:

- Atomic operations with idempotency
- Prevention of double-crediting/debiting
- Transaction logging
- Balance consistency

**Core Methods:**

#### 1. `creditTokenPayment(appointmentId, docId, tokenAmount, session)`

Called when appointment is confirmed with TOKEN payment

- Credits token amount to doctor's wallet
- Creates transaction record with idempotency key
- Returns success/failure with transaction details

#### 2. `creditRemainingAmount(appointmentId, docId, remainingAmount, session)`

Called when appointment is marked COMPLETED (for TOKEN payments only)

- Calculates and credits remaining amount (total - token)
- Prevents double crediting with idempotency check
- Returns success/failure

#### 3. `reverseTokenOnDoctorCancel(appointmentId, docId, tokenAmount, session)`

Called when doctor cancels appointment

- Reverses token amount from wallet
- Negative amount debit operation
- Prevents double reversal

#### 4. `debitFullRefund(appointmentId, docId, refundAmount, cancelledBy, session)`

Called when user/admin cancels appointment

- Debits full or token amount based on payment type
- Tracks who initiated cancellation
- Prevents negative wallet balance

**Helper Methods:**

- `getTransactionHistory(docId, options)` - Audit trail with pagination
- `hasTransactionBeenProcessed(appointmentId, transactionType)` - Idempotency check
- `getWalletSummary(docId)` - Summary of balance and recent transactions

---

## Appointment Service Helpers

[backend/services/appointmentService.js](backend/services/appointmentService.js)

**New Helper Functions:**

```javascript
canCompleteAppointment(appointment); // True if CONFIRMED
shouldCreditRemainingAmount(appointment); // True if TOKEN + not credited
calculateRemainingAmount(appointment); // Returns: total - paid
```

---

## Controller Updates

### 1. Doctor Controller

[backend/controllers/doctorController.js](backend/controllers/doctorController.js)

#### `appointmentComplete` (UPDATED)

**Flow:**

```
1. Get appointment by ID
2. Verify status is CONFIRMED
3. Check if already completed (idempotency)
4. If TOKEN payment and not credited:
   - Calculate remaining amount
   - Call WalletService.creditRemainingAmount()
   - Handle success/failure
5. Mark appointment as COMPLETED
6. Set completionTime and remainingAmountCredited flags
7. Send completion email
```

**Idempotency:** Safe to call multiple times - checks if already completed

**Error Handling:** Returns 400 if wallet crediting fails

#### `appointmentCancel` (UPDATED)

**Flow:**

```
1. Verify doctor authorization
2. Check appointment status is HOLD or CONFIRMED
3. If paidAmount > 0:
   - Call WalletService.debitFullRefund()
   - Prevents duplicate refunds with idempotency
4. Update appointment status to CANCELLED_BY_DOCTOR
5. Release slot from schedule
6. Return refund status and amount
```

**Atomic:** Wallet operation is atomic with transaction tracking

#### `appointmentsDoctor` (SORTING FIXED)

**Change:** Added proper sorting

```javascript
.sort({ slotDate: -1, slotTime: -1 })  // Newest appointments first
```

#### `doctorDashboard` (SORTING FIXED)

**Change:**

- Sort appointments before slicing
- Remove `.reverse()` in favor of database-level sorting
- Latest appointments now correctly show newest first

### 2. Admin Controller

[backend/controllers/adminController.js](backend/controllers/adminController.js)

#### `appointmentCancel` (UPDATED)

**Changes:**

- Now uses WalletService.debitFullRefund() for atomic operations
- Prevents race conditions
- Tracks in transaction log

#### New Admin Endpoints:

**`getDoctorWalletSummary`**

- Returns current wallet balance
- Shows earnings total
- Lists recent 10 transactions
- Calculates totals by transaction type

**`getDoctorTransactionHistory`**

- Paginated transaction audit trail
- Supports filtering by date range
- Shows transaction details and reasons

### 3. Admin Routes

[backend/routes/adminRoute.js](backend/routes/adminRoute.js)

**New Routes:**

```
POST /api/admin/doctor-wallet-summary
  Body: { docId: string }
  Response: { walletBalance, totalEarnings, recentTransactions, summary }

POST /api/admin/doctor-transaction-history
  Body: { docId: string, limit: number, skip: number }
  Response: { transactions, pagination }
```

---

## Payment Flow Integration

### When Token Payment is Confirmed

**File:** [backend/routes/stripeRoutes.js](backend/routes/stripeRoutes.js) - `finalizeAppointmentPayment`

**Current Behavior:**

1. Appointment status → CONFIRMED
2. walletCredited → true
3. Doctor wallet increased by paidAmount
4. Slot locked in schedule

**Note:** This uses direct MongoDB operations during Stripe webhook. Token amount is already credited here.

### When Appointment is Completed

**File:** [backend/controllers/doctorController.js](backend/controllers/doctorController.js) - `appointmentComplete`

**New Behavior:**

1. Check if TOKEN payment and remaining amount not credited
2. Calculate remaining = total - paidAmount
3. Call `WalletService.creditRemainingAmount()`
4. Atomic operation with transaction tracking
5. Update appointment: remainingAmountCredited = true

### When Doctor Cancels

**File:** [backend/controllers/doctorController.js](backend/controllers/doctorController.js) - `appointmentCancel`

**New Behavior:**

1. Get paid amount (token or full payment)
2. Call `WalletService.debitFullRefund()`
3. Operation is idempotent - safe to retry
4. Prevents double deductions with idempotencyKey
5. Updates appointment: walletReversed = true
6. Release slot from schedule

### When User/Admin Cancels

**File:** [backend/controllers/adminController.js](backend/controllers/adminController.js) - `appointmentCancel`

**Behavior:**

1. Similar to doctor cancellation
2. Calls `WalletService.debitFullRefund()` with cancelledBy="USER/ADMIN"
3. Atomic with transaction tracking
4. Prevents race conditions

---

## Example Scenarios

### Scenario 1: TOKEN Payment → Completion

```
1. User books appointment - HOLD created
2. User pays 500 PKR token (10% of 5000)
   → Appointment status = CONFIRMED
   → Doctor wallet + 500
   → walletCredited = true, walletCreditedAmount = 500

3. Appointment date: doctor completes appointment
   → appointmentComplete() called
   → Remaining = 5000 - 500 = 4500
   → WalletService.creditRemainingAmount(4500)
   → Doctor wallet + 4500 (total 5000)
   → remainingAmountCredited = true, remainingAmountCreditedAmount = 4500

Result: Doctor earned 5000 total (500 + 4500)
```

### Scenario 2: TOKEN Payment → Doctor Cancels

```
1. User books, pays 500 token
   → Doctor wallet + 500

2. Doctor cancels before appointment
   → appointmentCancel() called
   → WalletService.debitFullRefund(500, "DOCTOR")
   → Doctor wallet - 500
   → walletReversed = true, walletReversedAmount = 500
   → Transaction logged with idempotencyKey

3. If cancelled again:
   → idempotencyKey check prevents double deduction
   → Returns isDuplicate = true

Result: Doctor wallet unchanged (500 - 500 = 0)
```

### Scenario 3: FULL Payment → User Cancels

```
1. User books, pays 5000 full
   → Doctor wallet + 5000

2. User cancels within refund window
   → Admin calls appointmentCancel()
   → WalletService.debitFullRefund(5000, "ADMIN")
   → Doctor wallet - 5000
   → walletReversed = true

Result: Doctor wallet unchanged (5000 - 5000 = 0)
```

---

## Race Condition Protection

### Idempotency Keys

Each wallet operation uses: `idempotencyKey = ${appointmentId}-${transactionType}`

**Examples:**

- `"apt_123-TOKEN_CREDIT"`
- `"apt_123-REMAINING_CREDIT"`
- `"apt_123-TOKEN_REVERSAL"`

**Benefits:**

- Prevents duplicate crediting from repeated API calls
- Prevents double deductions from network retries
- Can safely retry failed operations

### MongoDB Atomic Operations

- Wallet Service uses MongoDB sessions for atomic transactions
- Falls back to non-transactional writes on replica set errors
- Doctor wallet update and transaction creation are grouped together
- No race conditions between operations

### Status-Based Guards

- Completion only works for CONFIRMED appointments
- Cancellation only works for HOLD or CONFIRMED appointments
- Previous completion/cancellation checks prevent repeated operations

---

## Admin Audit Trail

### Transaction History

Every wallet operation creates a record:

```javascript
{
  docId: ObjectId,
  transactionType: "TOKEN_CREDIT",      // or REMAINING_CREDIT, REFUND_DEBIT, etc.
  amount: 500,
  status: "COMPLETED",
  appointmentId: ObjectId,
  reason: "Token payment received for appointment",
  balanceAfter: 5500,                   // Balance after transaction
  idempotencyKey: "apt_123-TOKEN_CREDIT",
  metadata: {
    paymentType: "TOKEN",
    appointmentStatus: "CONFIRMED"
  },
  createdAt: Date,
  processedAt: Date
}
```

### Admin Dashboard Endpoints

1. **View wallet summary** - current balance, earnings, summary of transactions
2. **View transaction history** - paginated audit trail with reasons
3. **Identify issues** - filter transactions by type or date range

---

## Appointment Sorting

### Frontend Display - Doctor Panel

**Endpoint:** `POST /api/doctor/appointments`

**Sorting:**

```javascript
.sort({ slotDate: -1, slotTime: -1 })
```

**Result:** Appointments ordered:

1. Newest date first (descending)
2. Within same date, latest time first

**Example Output:**

```
- April 30, 2024 - 18:00 (Latest)
- April 30, 2024 - 15:00
- April 29, 2024 - 19:00
- April 29, 2024 - 14:00 (Oldest)
```

### Dashboard Widget

**Endpoint:** `GET /api/doctor/dashboard`

**Sorting:**

```javascript
appointments.sort({ slotDate: -1, slotTime: -1 });
latestAppointments = appointments.slice(0, 5);
```

**Result:** Top 5 newest appointments shown

---

## Deployment Checklist

- [ ] Update MongoDB models (new fields)
- [ ] Create walletTransactionModel
- [ ] Create walletService.js
- [ ] Update appointmentService.js with new helpers
- [ ] Update doctorController.js functions
- [ ] Update adminController.js functions
- [ ] Update admin routes
- [ ] No database migration needed (new fields are optional)
- [ ] Test token payment flow
- [ ] Test completion flow
- [ ] Test cancellation flow
- [ ] Test doctor cancellation on same appointment twice (idempotency)
- [ ] Verify wallet balance consistency
- [ ] Check admin audit trail endpoints

---

## Testing Scenarios

### 1. Token Payment Completion

```bash
# Create appointment → TOKEN payment → Complete
1. POST /api/user/book-appointment
2. POST /api/stripe/create-token-payment-session
3. POST /api/stripe/verify-token-payment (wallet +500)
4. POST /api/doctor/appointment-complete (wallet +4500)
Verify: Wallet = +5000 total
```

### 2. Doctor Cancellation Idempotency

```bash
1. POST /api/doctor/cancel-appointment (wallet -500)
2. POST /api/doctor/cancel-appointment (same ID)
Verify: isDuplicate = true, wallet still -500 (no double deduction)
```

### 3. Admin Transaction Audit

```bash
1. POST /api/admin/doctor-wallet-summary
2. POST /api/admin/doctor-transaction-history
Verify: All transactions logged with reasons and amounts
```

---

## Error Handling

### Insufficient Wallet Balance

Returns 400:

```json
{
  "success": false,
  "message": "Insufficient wallet balance. Current: 500, Required: 5000"
}
```

### Duplicate Transaction

Returns success with isDuplicate flag:

```json
{
  "success": false,
  "message": "Transaction already processed",
  "isDuplicate": true,
  "transaction": { ... }
}
```

### Invalid Appointment Status

Returns 400:

```json
{
  "success": false,
  "message": "Cannot complete appointment with status: CANCELLED_BY_DOCTOR"
}
```

---

## Configuration Constants

**File:** [backend/config/payment.js](backend/config/payment.js)

```javascript
TOKEN_PERCENTAGE = 10; // 10% of total amount
HOLD_EXPIRY_MINUTES = 10; // 10 minute hold before auto-cancel
PAYMENT_CURRENCY = "pkr"; // Default currency
```

---

## Future Enhancements

1. **Stripe Refund Automation** - Auto-refund users via Stripe API
2. **No-Show Handling** - Deduct amount for no-shows
3. **Withdrawal Requests** - Let doctors withdraw earnings
4. **Reconciliation Reports** - Admin reconciliation tool
5. **Wallet Notifications** - Alert doctors on earnings
6. **Bulk Operations** - Admin bulk refund/adjustment tool

---

## Support & Debugging

### Check Transaction Status

```bash
GET /api/admin/doctor-transaction-history
- docId: doctor_id
- Filter by transactionType to find specific operations
```

### Verify Wallet Consistency

```bash
GET /api/admin/doctor-wallet-summary
- Compare walletBalance with sum of transactions
```

### Identify Race Conditions

```bash
- Check for multiple transactions with same appointmentId
- Look for status = "FAILED" transactions
- Review idempotencyKey usage
```
