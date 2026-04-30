# API Reference - Wallet Payment System

## Doctor Endpoints

### Get Doctor Appointments (with proper sorting)

```
POST /api/doctor/appointments
Request: { docId: string }
Response: {
  success: true,
  appointments: [
    {
      _id: string,
      slotDate: string,
      slotTime: string,
      amount: number,
      paidAmount: number,
      tokenPaid: boolean,
      appointmentStatus: "CONFIRMED" | "COMPLETED" | ...,
      walletCreditedAmount: number,
      remainingAmountCredited: boolean,
      remainingAmountCreditedAmount: number
    }
  ]
}
Note: Sorted by slotDate DESC, slotTime DESC (newest first)
```

### Mark Appointment as Completed

```
POST /api/doctor/appointment-complete
Request: { appointmentId: string }
Response: {
  success: true,
  message: "Appointment completed successfully",
  remainingAmountCredited: boolean,
  remainingAmountCreatedAmount: number
}

Errors:
- 400: Appointment not CONFIRMED
- 400: Wallet crediting failed
- 404: Appointment not found
```

### Cancel Appointment (Doctor)

```
POST /api/doctor/cancel-appointment
Request: {
  docId: string,
  appointmentId: string,
  cancellationReason: string (optional)
}
Response: {
  success: true,
  message: "Appointment cancelled successfully",
  refund_status: boolean,
  refundAmount: number,
  refundStatus: "PENDING" | "COMPLETED" | "FAILED"
}

Errors:
- 400: Cannot cancel (invalid status)
- 400: Wallet reversal failed
- 401: Not authorized
```

### Get Doctor Dashboard

```
GET /api/doctor/dashboard
Request: { docId: string }
Response: {
  success: true,
  dashData: {
    earnings: number (wallet balance),
    appointments: number (total),
    patients: number (unique),
    latestAppointments: [
      {
        _id: string,
        slotDate: string,
        slotTime: string,
        appointmentStatus: string
      }
    ]
  }
}
Note: latestAppointments sorted newest first (top 5)
```

---

## Admin Endpoints

### Cancel Appointment (Admin)

```
POST /api/admin/cancel-appointment
Request: {
  appointmentId: string,
  cancellationReason: string (optional)
}
Response: {
  success: true,
  message: "Appointment cancelled successfully",
  refund_status: boolean,
  refundAmount: number,
  refundStatus: "PENDING" | "COMPLETED" | "FAILED"
}

Uses WalletService for atomic operations
```

### Get Doctor Wallet Summary

```
POST /api/admin/doctor-wallet-summary
Request: { docId: string }
Response: {
  success: true,
  data: {
    walletBalance: number,        // Current balance
    totalEarnings: number,        // Total earned
    recentTransactions: [
      {
        _id: string,
        transactionType: "TOKEN_CREDIT" | "REMAINING_CREDIT" | "REFUND_DEBIT" | "TOKEN_REVERSAL",
        amount: number,
        status: "COMPLETED",
        appointmentId: string,
        reason: string,
        balanceAfter: number,
        createdAt: date
      }
    ],
    summary: {
      totalCredits: number,
      totalDebits: number,
      tokenCredits: number,
      remainingCredits: number,
      reversals: number,
      refunds: number
    }
  }
}
```

### Get Doctor Transaction History

```
POST /api/admin/doctor-transaction-history
Request: {
  docId: string,
  limit: number (default 50, max 100),
  skip: number (default 0)
}
Response: {
  success: true,
  transactions: [
    {
      _id: string,
      docId: string,
      transactionType: "TOKEN_CREDIT" | "REMAINING_CREDIT" | "TOKEN_REVERSAL" | "REFUND_DEBIT" | "MANUAL_ADJUSTMENT",
      amount: number,
      status: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED",
      appointmentId: string,
      reason: string,
      balanceAfter: number,
      idempotencyKey: string,
      metadata: {
        paymentType: "TOKEN" | "FULL" | null,
        appointmentStatus: string,
        cancelledBy: "DOCTOR" | "USER" | "ADMIN" | null
      },
      createdAt: date,
      processedAt: date
    }
  ],
  pagination: {
    total: number,
    limit: number,
    skip: number,
    pages: number
  }
}
```

---

## Wallet Service Internal Methods

### Credit Token Payment

```
WalletService.creditTokenPayment(appointmentId, docId, tokenAmount, session)
Returns: {
  success: true | false,
  message: string,
  transaction: { ... },
  newBalance: number
}
Called by: Stripe payment verification
```

### Credit Remaining Amount

```
WalletService.creditRemainingAmount(appointmentId, docId, remainingAmount, session)
Returns: {
  success: true | false,
  message: string,
  transaction: { ... },
  newBalance: number
}
Called by: appointmentComplete()
```

### Debit Full Refund

```
WalletService.debitFullRefund(appointmentId, docId, refundAmount, cancelledBy, session)
Returns: {
  success: true | false,
  message: string,
  transaction: { ... },
  newBalance: number
}
Called by: appointmentCancel() (both doctor and admin)
```

### Get Transaction History

```
WalletService.getTransactionHistory(docId, options)
Options: {
  limit: number (default 50),
  skip: number (default 0),
  startDate: date (optional),
  endDate: date (optional)
}
Returns: {
  success: true | false,
  transactions: [...],
  pagination: { total, limit, skip, pages }
}
```

### Get Wallet Summary

```
WalletService.getWalletSummary(docId)
Returns: {
  success: true | false,
  walletBalance: number,
  totalEarnings: number,
  recentTransactions: [...],
  summary: { ... }
}
```

---

## Transaction Types

```
TOKEN_CREDIT
  When: Appointment confirmed with TOKEN payment
  Amount: Positive (token amount, e.g., 500)
  Reason: "Token payment received for appointment"

REMAINING_CREDIT
  When: Appointment marked as COMPLETED (TOKEN payment)
  Amount: Positive (remaining amount, e.g., 4500)
  Reason: "Remaining appointment amount after completion"

TOKEN_REVERSAL
  When: Doctor cancels appointment
  Amount: Negative (token amount, e.g., -500)
  Reason: "Token reversal: Doctor cancelled appointment"

REFUND_DEBIT
  When: User or Admin cancels appointment
  Amount: Negative (full or token amount, e.g., -5000)
  Reason: "Full refund: Appointment cancelled by USER/ADMIN"

MANUAL_ADJUSTMENT
  When: Admin manual adjustment (future enhancement)
  Amount: Positive or Negative
  Reason: Custom reason provided by admin
```

---

## Error Responses

### Insufficient Balance

```json
{
  "success": false,
  "message": "Insufficient wallet balance. Current: 500, Required: 5000"
}
```

### Already Processed (Idempotency)

```json
{
  "success": false,
  "message": "Transaction already processed",
  "isDuplicate": true,
  "transaction": { ... }
}
```

### Invalid Status

```json
{
  "success": false,
  "message": "Cannot complete appointment with status: CANCELLED_BY_DOCTOR"
}
```

### Not Authorized

```json
{
  "success": false,
  "message": "Not authorized"
}
```

### Appointment Not Found

```json
{
  "success": false,
  "message": "Appointment not found"
}
```

---

## Idempotency Guarantee

All wallet operations use idempotency keys in format:

```
${appointmentId}-${transactionType}
```

Examples:

- `"apt_123-TOKEN_CREDIT"`
- `"apt_123-REMAINING_CREDIT"`
- `"apt_123-TOKEN_REVERSAL"`
- `"apt_123-REFUND_DEBIT"`

**Guarantee:** If you call the same operation twice with same parameters:

1. First call: Operation succeeds, transaction created
2. Second call: Returns isDuplicate: true, no state change

This makes all endpoints **safe to retry** without side effects.

---

## Field Descriptions

### Appointment Fields (Related to Wallet)

```
tokenPaid: boolean
  → Whether token payment was made

walletCredited: boolean
  → Token/Full amount credited during payment confirmation

walletCreditedAmount: number
  → Amount credited during payment (can be token or full)

walletReversed: boolean
  → Whether payment was reversed (doctor cancel)

walletReversedAmount: number
  → Amount that was reversed

remainingAmountCredited: boolean
  → Whether remaining amount was credited on completion

remainingAmountCreditedAmount: number
  → Amount of remaining that was credited

completionTime: date
  → When appointment was marked as completed

paidAmount: number
  → Total amount paid (token or full)
```

### Doctor Fields (Related to Wallet)

```
walletBalance: number
  → Current wallet balance

earnings: number
  → Total earnings (same as walletBalance, kept for compatibility)
```

---

## Example Flow: Complete Payment → Completion

### Step 1: User Pays Token

```
API Call: POST /api/stripe/verify-token-payment
Result:
- Appointment status → CONFIRMED
- Transaction: TOKEN_CREDIT = 500
- Doctor walletBalance +500
- Response: success, paidAmount = 500
```

### Step 2: Verify in Admin Panel

```
API Call: POST /api/admin/doctor-wallet-summary
Result:
- walletBalance: 500
- recentTransactions: [
    { transactionType: "TOKEN_CREDIT", amount: 500, status: "COMPLETED" }
  ]
```

### Step 3: Doctor Completes Appointment

```
API Call: POST /api/doctor/appointment-complete
Body: { appointmentId }
Result:
- Transaction: REMAINING_CREDIT = 4500
- Doctor walletBalance +4500 (total 5000)
- Appointment: remainingAmountCredited = true
- Response: success, remainingAmountCreditedAmount = 4500
```

### Step 4: Verify Final Balance

```
API Call: POST /api/admin/doctor-wallet-summary
Result:
- walletBalance: 5000
- recentTransactions: [
    { transactionType: "REMAINING_CREDIT", amount: 4500, status: "COMPLETED" },
    { transactionType: "TOKEN_CREDIT", amount: 500, status: "COMPLETED" }
  ]
- summary.totalCredits: 5000
```

---

## Testing Curl Commands

### Get Wallet Summary

```bash
curl -X POST http://localhost:5000/api/admin/doctor-wallet-summary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_token" \
  -d '{"docId": "doctor_id"}'
```

### Get Transaction History

```bash
curl -X POST http://localhost:5000/api/admin/doctor-transaction-history \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_token" \
  -d '{"docId": "doctor_id", "limit": 50, "skip": 0}'
```

### Complete Appointment

```bash
curl -X POST http://localhost:5000/api/doctor/appointment-complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer doctor_token" \
  -d '{"appointmentId": "apt_id"}'
```

### Cancel Appointment (Doctor)

```bash
curl -X POST http://localhost:5000/api/doctor/cancel-appointment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer doctor_token" \
  -d '{
    "docId": "doctor_id",
    "appointmentId": "apt_id",
    "cancellationReason": "Emergency"
  }'
```
