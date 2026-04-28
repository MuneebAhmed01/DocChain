# Sample API Requests & Responses for Testing

## Setup

Base URL: `http://localhost:4000/api`
Headers: `Authorization: Bearer USER_TOKEN`

---

## 1. Book Appointment (Create HOLD)

### Request
```bash
POST /user/book-appointment
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "docId": "507f1f77bcf86cd799439011",
  "slotDate": "2024-04-25",
  "slotTime": "10:00 - 10:30"
}
```

### Response (Success)
```json
{
  "success": true,
  "message": "Slot reserved in HOLD state",
  "appointmentId": "507f1f77bcf86cd799439012",
  "appointment": {
    "_id": "507f1f77bcf86cd799439012",
    "status": "HOLD",
    "fullAmount": 5000,
    "tokenAmount": 500,
    "holdExpiry": "2024-04-25T10:15:00.000Z",
    "slotDate": "2024-04-25",
    "slotTime": "10:00 - 10:30"
  }
}
```

### Response (Slot Already Confirmed)
```json
{
  "success": false,
  "message": "Slot not available"
}
```

---

## 2. Create Full Payment Session

### Request
```bash
POST /stripe/create-checkout-session
Content-Type: application/json

{
  "appointmentId": "507f1f77bcf86cd799439012"
}
```

### Response
```json
{
  "success": true,
  "url": "https://checkout.stripe.com/pay/cs_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6#fidkdWxOYHwnPyd1c2R2c0dGYVJEVEJGN3BqVDNxaEw2VWhVTW1ITjdWdVFFOE1GUTAxQn1TMTczMHZWTmwzNDQybUFMVDVGMWpEWnRGNTRtVEhXU0wyUEZ2c1NrWkx2TDNSeEpbWWx3Py0n_container=iframe"
}
```

**User redirected to Stripe checkout**
**After payment, redirects to:** `{FRONTEND_URL}/payment-success?session_id=cs_test_...`

---

## 3. Verify Full Payment

### Request
```bash
POST /stripe/verify-payment
Content-Type: application/json

{
  "sessionId": "cs_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
}
```

### Response (Success)
```json
{
  "success": true,
  "message": "Payment verified and appointment confirmed",
  "appointment": {
    "_id": "507f1f77bcf86cd799439012",
    "status": "CONFIRMED",
    "paymentStatus": "PAID"
  }
}
```

### Response (Race Condition - Another User Booked)
```json
{
  "success": false,
  "message": "Slot no longer available - another user booked it"
}
```

---

## 4. Create Token Payment Session (10% Advance)

### Request
```bash
POST /stripe/create-token-payment-session
Content-Type: application/json

{
  "appointmentId": "507f1f77bcf86cd799439012"
}
```

### Response
```json
{
  "success": true,
  "url": "https://checkout.stripe.com/pay/cs_test_token_session_id#..."
}
```

**Payment of Rs. 500 (10% token)**

---

## 5. Verify Token Payment

### Request
```bash
POST /stripe/verify-token-payment
Content-Type: application/json

{
  "sessionId": "cs_test_token_session_id"
}
```

### Response (Success)
```json
{
  "success": true,
  "message": "Token payment confirmed. Appointment confirmed. Remaining amount due at clinic.",
  "appointment": {
    "_id": "507f1f77bcf86cd799439012",
    "status": "CONFIRMED",
    "paymentStatus": "PARTIAL",
    "remainingAmount": 4500
  }
}
```

---

## 6. User Cancels Appointment

### Request
```bash
POST /user/cancel-appointment
Content-Type: application/json
Authorization: Bearer USER_TOKEN

{
  "appointmentId": "507f1f77bcf86cd799439012"
}
```

### Response (Success)
```json
{
  "success": true,
  "message": "Appointment cancelled successfully",
  "refundStatus": "PENDING"
}
```

### Response (Can't Cancel)
```json
{
  "success": false,
  "message": "Cannot cancel this appointment"
}
```

---

## 7. Admin Cancels Appointment

### Request
```bash
POST /admin/cancel-appointment
Content-Type: application/json
Authorization: Bearer ADMIN_TOKEN

{
  "appointmentId": "507f1f77bcf86cd799439012",
  "cancellationReason": "Doctor emergency - needs rest"
}
```

### Response
```json
{
  "success": true,
  "message": "Appointment cancelled successfully",
  "refundStatus": "PENDING",
  "refundAmount": 5000
}
```

---

## 8. Admin Triggers Manual Cleanup

### Request
```bash
POST /admin/trigger-hold-cleanup
Content-Type: application/json
Authorization: Bearer ADMIN_TOKEN

{}
```

### Response
```json
{
  "success": true,
  "message": "Cleanup completed. 5 expired HOLD appointments were cancelled.",
  "cleaned": 5
}
```

---

## 9. Get User Appointments

### Request
```bash
GET /user/user-appointments
Content-Type: application/json
Authorization: Bearer USER_TOKEN
```

### Response
```json
{
  "success": true,
  "appointments": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "docData": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Dr. Ahmed Khan",
        "speciality": "Cardiologist",
        "fees": 5000
      },
      "slotDate": "2024-04-25",
      "slotTime": "10:00 - 10:30",
      "appointmentStatus": "CONFIRMED",
      "paymentStatus": "PAID",
      "paymentMethod": "ONLINE",
      "amount": 5000,
      "paidAmount": 4500,
      "confirmationTime": "2024-04-25T09:32:15.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "docData": {
        "_id": "507f1f77bcf86cd799439014",
        "name": "Dr. Fatima Ali",
        "speciality": "Dentist",
        "fees": 3000
      },
      "slotDate": "2024-04-26",
      "slotTime": "14:00 - 14:30",
      "appointmentStatus": "CANCELLED_BY_ADMIN",
      "paymentStatus": "REFUNDED",
      "paymentMethod": "CASH",
      "amount": 3000,
      "paidAmount": 300,
      "cancellationReason": "Doctor emergency - needs rest",
      "refundAmount": 300,
      "refundStatus": "PENDING",
      "cancelledAt": "2024-04-25T11:45:20.000Z"
    }
  ]
}
```

---

## Error Scenarios to Test

### Scenario 1: Double Booking (Race Condition)

1. **User 1** books slot: POST `/user/book-appointment` → `apartmentId_1`
2. **User 2** books same slot: POST `/user/book-appointment` → `appointmentId_2`
3. **User 1** pays first
4. **User 2** tries to pay → Error: "Slot no longer available"

---

### Scenario 2: HOLD Expiry

1. Book appointment at 10:00 AM → HOLD expires at 10:10 AM
2. Wait until 10:11 AM
3. Admin triggers cleanup: POST `/admin/trigger-hold-cleanup`
4. Appointment status changed to CANCELLED_BY_USER

---

### Scenario 3: Token Payment Flow

1. Book appointment → HOLD
2. Create token session (10% = Rs. 500)
3. Complete payment → CONFIRMED with PARTIAL status
4. Get appointments → Shows "Remaining Rs. 4500 due at clinic"

---

## Database Queries for Verification

### Check HOLD Appointments
```javascript
db.appointments.find({ appointmentStatus: "HOLD" })
```

### Check Expired HOLDs
```javascript
db.appointments.find({
  appointmentStatus: "HOLD",
  holdExpiry: { $lt: new Date() }
})
```

### Check Confirmed Appointments on a Date
```javascript
db.appointments.find({
  appointmentStatus: "CONFIRMED",
  slotDate: "2024-04-25"
})
```

### Check Cancelled Appointments
```javascript
db.appointments.find({
  appointmentStatus: { $in: ["CANCELLED_BY_ADMIN", "CANCELLED_BY_USER"] }
})
```

### Check Pending Refunds
```javascript
db.appointments.find({
  refundStatus: "PENDING"
})
```

---

## Postman Collection (JSON)

```json
{
  "info": {
    "name": "DocChain Appointment Booking",
    "description": "New appointment booking system with HOLD, token payment, and cancellation"
  },
  "item": [
    {
      "name": "Book Appointment (HOLD)",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/user/book-appointment",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{userToken}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"docId\": \"507f1f77bcf86cd799439011\", \"slotDate\": \"2024-04-25\", \"slotTime\": \"10:00 - 10:30\"}"
        }
      }
    },
    {
      "name": "Create Full Payment Session",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/stripe/create-checkout-session",
        "body": {
          "mode": "raw",
          "raw": "{\"appointmentId\": \"{{appointmentId}}\"}"
        }
      }
    },
    {
      "name": "Verify Full Payment",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/stripe/verify-payment",
        "body": {
          "mode": "raw",
          "raw": "{\"sessionId\": \"{{sessionId}}\"}"
        }
      }
    }
  ]
}
```

---
