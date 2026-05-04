# Complete Test Scenarios for Phone Verification & WhatsApp Reminders

## Quick Start Testing

### Prerequisites
- Backend running: `http://localhost:4000`
- Frontend running: `http://localhost:5173`
- MongoDB: Connected
- Twilio: Credentials configured in `.env`

---

## Test Scenario 1: Happy Path (Full Flow)

### Objective
Complete the entire flow from signup → onboarding → booking → reminder

### Steps

**1. Signup**
```
URL: http://localhost:5173/login
Action: Sign Up tab
- Name: Alice Johnson
- Email: alice@test.com
- Password: TestPassword123

Expected: 
✓ Account created
✓ Redirected to /onboarding
```

**2. Send OTP**
```
On Onboarding Page:
- Phone: +14155238886
- Click "Send OTP"

Expected:
✓ OTP sent successfully
✓ If NODE_ENV=development: OTP displayed in console/toast
✓ Step changes to OTP verification
```

**3. Verify OTP**
```
- Enter OTP code (from step above)
- Click "Verify OTP"

Expected:
✓ OTP verified successfully
✓ Step changes to Profile Details
✓ Message: "Phone number verified"
```

**4. Complete Profile**
```
- Age: 28
- Gender: Female
- Click "Complete Profile"

Expected:
✓ Redirected to home page
✓ Profile updated with phone, age, gender
✓ whatsapp_opt_in: true
✓ onboarding_completed: true
```

**5. Book Appointment**
```
URL: http://localhost:5173/doctors
- Find a doctor
- Click appointment
- Select slot for 1 hour from now
- Complete booking

Expected:
✓ Appointment status: CONFIRMED
✓ Scheduled reminder should trigger
```

**6. Wait for Reminder**
```
Wait 55-65 minutes before appointment time
Backend task runs every 5 minutes

Expected:
✓ WhatsApp message sent
✓ Message format: "Hi [Name], your appointment with Dr. [Name] is on [Date] at [Time]."
✓ Backend logs: "✅ WhatsApp reminder sent to +14155238886"
```

---

## Test Scenario 2: Invalid Phone Number

### Objective
Verify proper handling of invalid phone formats

### Test Cases

**2.1: Empty Phone Number**
```
Input: (leave blank)
Expected Error: "Phone number is required"
```

**2.2: Invalid Format (No Country Code)**
```
Input: "1234567890"
Expected Error: "Invalid phone number format. Please use E.164 format (e.g., +14155238886)"
```

**2.3: Invalid Format (Letters)**
```
Input: "+1ABCDEFGHIJ"
Expected Error: "Invalid phone number format..."
```

**2.4: Valid Format (E.164)**
```
Input: "+14155238886"
Expected: ✓ OTP sent successfully
```

**2.5: Valid Format (Formatted)**
```
Input: "+91-9876-543-210"
Expected: ✓ Accepted (formatting cleaned automatically)
```

---

## Test Scenario 3: OTP Verification Failures

### Objective
Test OTP verification error handling

**3.1: Wrong OTP Code**
```
1. Send OTP → Receive: 123456
2. Enter: 999999
3. Click Verify

Expected Error: "Invalid OTP code. 4 attempts remaining."

Repeat 5 times:
Expected Error (5th time): "Maximum OTP attempts exceeded. Please request a new OTP."
```

**3.2: Expired OTP**
```
1. Send OTP at 10:00 AM
2. Wait 11 minutes (default expiry: 10 min)
3. Try to verify

Expected Error: "No valid OTP found for this phone number"
```

**3.3: No OTP Sent**
```
Skip sending OTP
Go to OTP verification step manually
Enter any 6-digit code
Click Verify

Expected Error: "No valid OTP found for this phone number"
```

---

## Test Scenario 4: Duplicate Phone Registration

### Objective
Ensure phone numbers remain unique

**4.1: Same User**
```
1. User A: Complete onboarding with +14155238886
2. Log out
3. Log in as User A
4. Try to send OTP again with +14155238886

Expected: Previous verification still valid or allow resend
```

**4.2: Different User**
```
1. User A: Complete onboarding with +14155238886
2. Sign up User B
3. On onboarding: Enter +14155238886
4. Click "Send OTP"

Expected Error: "This phone number is already registered"
```

---

## Test Scenario 5: Rate Limiting

### Objective
Test OTP request rate limiting (3 per 24 hours per phone)

**5.1: Rate Limit Enforcement**
```
Same phone number: +14155238886

1st Send OTP: ✓ Success
2nd Send OTP (after resend): ✓ Success
3rd Send OTP (after resend): ✓ Success
4th Send OTP (after resend): 

Expected Error: "Too many OTP requests. Please try again later."
```

**5.2: Different Phone Numbers**
```
Phone 1: +14155238886 - 3 attempts ✓
Phone 2: +15551234567 - 3 attempts ✓
Phone 3: +16171234567 - 3 attempts ✓

Expected: Each phone has independent limit
```

---

## Test Scenario 6: Profile Data Validation

### Objective
Validate age and gender input handling

**6.1: Invalid Age (Below 18)**
```
Age: 15
Gender: Male
Click "Complete Profile"

Expected Error: "Age must be between 18 and 120"
```

**6.2: Invalid Age (Above 120)**
```
Age: 125
Gender: Female
Click "Complete Profile"

Expected Error: "Age must be between 18 and 120"
```

**6.3: Missing Age**
```
Age: (blank)
Gender: Male
Click "Complete Profile"

Expected Error: "Age is required"
```

**6.4: Missing Gender**
```
Age: 28
Gender: (blank)
Click "Complete Profile"

Expected Error: "Gender is required"
```

**6.5: Valid Data**
```
Age: 25
Gender: Other
Click "Complete Profile"

Expected: ✓ Onboarding complete
```

---

## Test Scenario 7: WhatsApp Reminder System

### Objective
Test WhatsApp reminder sending

**7.1: Reminder Sent for Verified User**
```
1. Complete onboarding with phone
2. Book appointment for 1 hour from now
3. Trigger: Manually call /test/send-reminders (or wait 55-65 min)

Expected:
✓ WhatsApp sent to user's phone
✓ Message includes: doctor name, date, time
✓ Backend log: "✅ WhatsApp reminder sent to +..."
```

**7.2: Reminder NOT Sent for Non-Verified User**
```
1. Book appointment WITHOUT completing onboarding
2. Set time for 1 hour from now
3. Trigger reminder

Expected:
✓ No WhatsApp sent
✓ Backend log: "⚠️ User ... not eligible for WhatsApp reminder"
```

**7.3: Reminder NOT Sent if Opted Out**
```
1. User completes onboarding
2. Update user: whatsapp_opt_in: false (via DB or API)
3. Book appointment
4. Trigger reminder

Expected:
✓ No WhatsApp sent
```

**7.4: Duplicate Reminder Prevention**
```
1. Create appointment
2. Trigger reminder at 59 minutes before: ✓ Sent, reminder_sent: true
3. Trigger reminder again at 60 minutes before:

Expected:
✓ Reminder NOT sent again (already marked as sent)
```

---

## Test Scenario 8: API Error Responses

### Objective
Verify proper HTTP status codes

**Using cURL or Postman**

**8.1: Missing Authentication**
```bash
curl -X POST http://localhost:4000/api/onboarding/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"+14155238886"}'

Expected Status: 401
Message: "No token provided"
```

**8.2: Invalid Token**
```bash
curl -X POST http://localhost:4000/api/onboarding/send-otp \
  -H "Authorization: Bearer invalid_token" \
  -d '{"phone_number":"+14155238886"}'

Expected Status: 403
Message: "Invalid token"
```

**8.3: Invalid Input**
```bash
curl -X POST http://localhost:4000/api/onboarding/send-otp \
  -H "Authorization: Bearer <valid_token>" \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"invalid"}'

Expected Status: 400
Message: "Invalid phone number format..."
```

**8.4: Verification Without OTP**
```bash
curl -X POST http://localhost:4000/api/onboarding/verify-otp \
  -H "Authorization: Bearer <valid_token>" \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"+14155238886", "otp_code":"000000"}'

Expected Status: 404
Message: "No valid OTP found for this phone number"
```

**8.5: Complete Without Verification**
```bash
curl -X POST http://localhost:4000/api/onboarding/complete \
  -H "Authorization: Bearer <valid_token>" \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"+14155238886","age":25,"gender":"Male"}'

Expected Status: 400
Message: "Phone number is not verified. Please verify OTP before..."
```

---

## Test Scenario 9: Database Integrity

### Objective
Verify data is correctly saved to MongoDB

**9.1: User Document**
```javascript
// After completing onboarding:
db.users.findOne({email: "test@example.com"})

Expected fields:
{
  name: "Test User",
  email: "test@example.com",
  phone_number: "+14155238886",
  age: 25,
  gender: "Male",
  is_phone_verified: true,
  whatsapp_opt_in: true,
  onboarding_completed: true,
  created_at: ISODate(...),
  updated_at: ISODate(...)
}
```

**9.2: OTP Document**
```javascript
// After verification:
db.otps.findOne({phone_number: "+14155238886", is_verified: true})

Expected fields:
{
  phone_number: "+14155238886",
  otp_hash: "SHA256_HASH_HERE",
  is_verified: true,
  attempts: 1,
  expires_at: ISODate(...),
  created_at: ISODate(...)
}

Note: otp_code field should NOT be in verified OTPs (hashed only)
```

**9.3: TTL Index**
```javascript
// Verify TTL index works:
db.otps.getIndexes()

Expected index:
{
  key: { expires_at: 1 },
  expireAfterSeconds: 0
}
```

---

## Test Scenario 10: Frontend UI/UX

### Objective
Verify UI behaves correctly

**10.1: Loading States**
```
Action: Click "Send OTP"
Expected:
- Button text changes to "Sending..."
- Button disabled
- After response: Button text "OTP Sent ✓" or error displays
```

**10.2: Error Display**
```
Action: Enter invalid phone, click Send
Expected:
- Error message displayed in red below input
- Error message clear when user corrects input
```

**10.3: OTP Input Formatting**
```
Action: Type in OTP field
Expected:
- Only numeric input accepted
- Maximum 6 characters
- Auto-formatted display: "●●●●●●"
```

**10.4: Responsive Design**
```
Test on:
- Desktop: 1920x1080
- Tablet: 768x1024
- Mobile: 375x667

Expected:
✓ Form visible and usable on all sizes
✓ Text readable
✓ Buttons clickable
```

**10.5: Step Navigation**
```
1. Send OTP → Step changes to OTP verification
2. Verify OTP → Step changes to profile details
3. Complete profile → Redirected to home

Expected: Smooth transition between steps
```

---

## Test Scenario 11: Appointment Integration

### Objective
Verify appointments work with phone verification

**11.1: Booking Flow with Verified User**
```
1. Complete onboarding
2. Navigate to doctor profile
3. Click "Book Appointment"
4. Select slot and complete booking

Expected:
✓ Appointment created with verified user
✓ Appointment status: CONFIRMED
✓ User can receive reminders
```

**11.2: Booking Flow without Verification**
```
1. Login but skip onboarding (use localhost inspection to bypass)
2. Book appointment

Expected:
✓ Booking still works (not blocked)
✓ But NO WhatsApp reminders will be sent
✓ User can complete onboarding later
```

---

## Test Scenario 12: Integration with Existing Features

### Objective
Ensure phone verification doesn't break existing features

**12.1: Profile Update**
```
1. Complete onboarding
2. Go to My Profile
3. Update name/profile picture
4. Verify fields not affected

Expected:
✓ Profile update still works
✓ Phone verification fields preserved
```

**12.2: Appointment Cancellation**
```
1. Book appointment
2. Cancel appointment
3. Verify cancellation message sent

Expected:
✓ Appointment cancelled
✓ WhatsApp cancellation message sent (if opted in)
```

**12.3: Doctor Reviews**
```
1. Complete appointment
2. Leave review
3. Verify review posted

Expected:
✓ Review system works
✓ No conflicts with phone verification
```

---

## Test Scenario 13: Performance Testing

### Objective
Verify system performs well under load

**13.1: OTP Request Load**
```
Simulate 10 simultaneous OTP requests
Expected:
✓ All requests processed
✓ No timeouts
✓ Response time < 2 seconds
```

**13.2: Reminder Processing**
```
Create 100 appointments for 1 hour from now
Trigger reminder processing

Expected:
✓ All reminders processed
✓ Processing time < 30 seconds
✓ No missed reminders
```

**13.3: Database Query Performance**
```
After 1000 OTP records and 10000 users

Expected:
✓ OTP lookup: < 50ms
✓ User lookup by phone: < 50ms
✓ Reminder query: < 100ms
```

---

## Test Scenario 14: Security Testing

### Objective
Verify security measures work

**14.1: OTP Not in Database Logs**
```
Check MongoDB for OTP records
Expected:
✓ otp_code field has SHA256 hash ONLY
✓ Plain text never stored
```

**14.2: Rate Limiting Prevents Brute Force**
```
1. Send OTP
2. Try 100 wrong codes
After 5 attempts:
Expected: "Maximum OTP attempts exceeded"
```

**14.3: Phone Number Uniqueness**
```
1. User A: +14155238886
2. Try User B: +14155238886
Expected Error: "Phone number already registered"
```

**14.4: Token Expiry**
```
1. Get token
2. Wait for expiry (90 days or configure shorter for testing)
3. Try to use token

Expected: 403 Forbidden or token renewal required
```

---

## Automated Test Scripts

### cURL Test Suite

```bash
#!/bin/bash

# Get token (adjust email/password)
TOKEN=$(curl -s -X POST http://localhost:4000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123"}' \
  | jq -r '.token')

echo "Token: $TOKEN"

# Send OTP
echo "Sending OTP..."
curl -X POST http://localhost:4000/api/onboarding/send-otp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"+14155238886"}'

# Get status
echo "Checking status..."
curl -X GET http://localhost:4000/api/onboarding/status \
  -H "Authorization: Bearer $TOKEN"
```

---

## Postman Collection

Import this collection into Postman:

```json
{
  "info": {
    "name": "Phone Verification API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Send OTP",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Authorization", "value": "Bearer {{token}}"},
          {"key": "Content-Type", "value": "application/json"}
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"phone_number\":\"+14155238886\"}"
        },
        "url": {
          "raw": "http://localhost:4000/api/onboarding/send-otp",
          "protocol": "http",
          "host": ["localhost"],
          "port": "4000",
          "path": ["api", "onboarding", "send-otp"]
        }
      }
    }
  ]
}
```

---

## Success Criteria Checklist

- [ ] Signup → Onboarding redirect works
- [ ] OTP sent successfully via SMS
- [ ] OTP verification works (correct code)
- [ ] OTP verification fails (wrong code, expired, rate limited)
- [ ] Profile completion saves all data
- [ ] User can book appointments
- [ ] WhatsApp reminders sent 1 hour before
- [ ] Reminders include correct info (doctor, date, time)
- [ ] Non-verified users don't get reminders
- [ ] Duplicate phone numbers rejected
- [ ] Database integrity maintained
- [ ] Error messages clear and helpful
- [ ] UI responsive on all devices
- [ ] No existing features broken
- [ ] Performance acceptable under load
- [ ] Security measures in place
