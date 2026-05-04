# Phone Verification & WhatsApp Reminder System - Implementation Guide

## Overview
This document provides complete setup, configuration, and testing instructions for the phone verification (OTP) and WhatsApp reminder system added to the DocChain appointment booking platform.

## Architecture Overview

### Backend Components
1. **User Model** - Updated with phone verification fields
2. **OTP Model** - Stores OTP attempts with expiry and verification tracking
3. **OTP Service** - Handles OTP generation, verification, hashing, and Twilio integration
4. **Onboarding Controller** - Manages OTP sending, verification, and profile completion
5. **Onboarding Routes** - API endpoints for the onboarding flow
6. **Appointment Reminder Service** - Sends WhatsApp reminders 1 hour before appointments
7. **Background Tasks** - Scheduled reminders and cleanup tasks

### Frontend Components
1. **Onboarding Page** - Multi-step form for phone verification and profile completion
2. **Updated Login** - Redirects to onboarding after signup
3. **Updated App.jsx** - Added onboarding route

---

## Environment Variables Setup

### Required Variables (Backend)

```env
# Twilio Configuration (SMS OTP or WhatsApp sandbox)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+1234567890  # Your Twilio SMS-capable number

# Twilio WhatsApp Configuration
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886  # Twilio WhatsApp sandbox number
TWILIO_CONTENT_SID_OTP_VERIFICATION=HXb5b62575e6e4ff6129ad7c8efe1f983e

# OTP Configuration
OTP_EXPIRY_MINUTES=10  # OTP code validity (default: 10 minutes)

# Optional: Node Environment
NODE_ENV=development  # Shows OTP in response for testing
```

### Where to Find Twilio Credentials

1. **TWILIO_ACCOUNT_SID** & **TWILIO_AUTH_TOKEN**:
   - Go to [Twilio Console](https://console.twilio.com/)
   - Navigate to Account section
   - Copy SID and Auth Token

2. **TWILIO_FROM_NUMBER**:
   - Go to [Twilio Phone Numbers](https://console.twilio.com/phone-numbers/incoming)
   - Get your assigned Twilio phone number (format: +1...)
  - If this is unset, the backend will fall back to `TWILIO_WHATSAPP_FROM`

3. **TWILIO_WHATSAPP_FROM**:
   - Go to [Twilio WhatsApp Sandbox](https://console.twilio.com/sms/whatsapp-sandbox)
   - Use the sandbox number provided (format: whatsapp:+1...)

4. **TWILIO_CONTENT_SID_OTP_VERIFICATION**:
  - Optional WhatsApp template SID for OTP messages
  - If unset, the backend will send a plain text message instead

---

## Installation & Setup

### 1. Backend Setup

```bash
cd backend

# Install dependencies (if not already done)
npm install

# Create/Update .env file with Twilio credentials
# See Environment Variables Setup section above

# Start backend server
npm run server  # Uses nodemon for development
# OR
npm start      # Production mode
```

### 2. Frontend Setup

```bash
cd clientside

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev

# Default: http://localhost:5173
```

### 3. Database

- MongoDB must be running and configured in `backend/config/mongodb.js`
- The OTP model will auto-create the `otp` collection on first use
- TTL index automatically removes expired OTPs

---

## API Endpoints

### POST `/api/onboarding/send-otp`
Send OTP to phone number via SMS or WhatsApp

**Authentication**: Required (Bearer token in Authorization header)

**Request Body**:
```json
{
  "phone_number": "+14155238886"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "phone_number": "+14155238886",
  "otp_id": "507f1f77bcf86cd799439011",
  "otp_code": "123456"  // Only in development
}
```

**Response (Error)**:
```json
{
  "success": false,
  "message": "Invalid phone number format. Please use E.164 format"
}
```

**Error Codes**:
- 400: Invalid phone number or missing field
- 409: Phone number already registered
- 429: Too many OTP requests (max 3 per 24 hours)
- 500: Server error

---

### POST `/api/onboarding/verify-otp`
Verify OTP code

**Authentication**: Required

**Request Body**:
```json
{
  "phone_number": "+14155238886",
  "otp_code": "123456"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "phone_number": "+14155238886"
}
```

**Error Codes**:
- 400: Invalid OTP or max attempts exceeded
- 404: No valid OTP found
- 429: Maximum attempts exceeded
- 500: Server error

---

### POST `/api/onboarding/complete`
Complete onboarding with phone, age, and gender

**Authentication**: Required

**Prerequisites**: Phone number must be verified via OTP

**Request Body**:
```json
{
  "phone_number": "+14155238886",
  "age": 25,
  "gender": "Male"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "Onboarding completed successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone_number": "+14155238886",
    "age": 25,
    "gender": "Male",
    "is_phone_verified": true,
    "whatsapp_opt_in": true,
    "onboarding_completed": true
  }
}
```

**Error Codes**:
- 400: Invalid data or phone not verified
- 404: User not found
- 500: Server error

---

### GET `/api/onboarding/status`
Get user's onboarding completion status

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "onboarding_completed": true,
  "is_phone_verified": true,
  "phone_number": "+14155238886",
  "age": 25,
  "gender": "Male"
}
```

---

## Testing Guide

### Full Flow Testing

#### Step 1: Signup
```bash
# Frontend: Sign up at http://localhost:5173/login
# Enter credentials:
- Name: Test User
- Email: test@example.com
- Password: TestPassword123

# After signup → Automatically redirected to /onboarding
```

#### Step 2: OTP Verification
```bash
# On Onboarding page:
1. Enter phone number: +14155238886 (Twilio test number)
2. Click "Send OTP"
3. Check backend logs or response for OTP code (if in development mode)
4. Enter OTP in the input field
5. Click "Verify OTP"
```

#### Step 3: Complete Profile
```bash
# After OTP verification:
1. Enter Age: 25
2. Select Gender: Male
3. Click "Complete Profile"
4. Redirected to home page
```

---

### Error Scenario Testing

#### Test 1: Invalid Phone Number
```
Input: "12345" or "abc"
Expected: Error message "Invalid phone number format"
```

#### Test 2: Expired OTP
```
1. Send OTP at 10:00 AM
2. Wait 11+ minutes (default expiry: 10 minutes)
3. Try to verify
Expected: Error "No valid OTP found for this phone number"
```

#### Test 3: Wrong OTP Code
```
1. Send OTP → receive 123456
2. Enter 999999
3. Click Verify
Expected: Error "Invalid OTP code. X attempts remaining"
4. After 5 attempts: Error "Maximum OTP attempts exceeded"
```

#### Test 4: Phone Already Registered
```
1. Complete onboarding for user A with +14155238886
2. Try to send OTP with same phone for user B
Expected: Error "This phone number is already registered"
```

#### Test 5: Rate Limiting
```
1. Send OTP for phone A (1st time)
2. Resend OTP for phone A (2nd time)
3. Resend OTP for phone A (3rd time)
4. Try to send OTP for phone A again (4th time)
Expected: Error "Too many OTP requests. Please try again later."
Rate limit: 3 OTPs per 24 hours per phone number
```

---

### WhatsApp Reminder Testing

#### Test 1: Send WhatsApp Reminder Manually
```bash
# Create an appointment scheduled for 1 hour from now
# The background task will automatically send reminder

# Manual trigger (for testing):
# Add this to a test endpoint in your backend:
const { triggerReminderProcessing } = require('./utils/backgroundTasks');
app.get('/test/send-reminders', async (req, res) => {
  const result = await triggerReminderProcessing();
  res.json(result);
});

# Call: GET http://localhost:4000/test/send-reminders
```

#### Test 2: Verify WhatsApp Message Content
```
Expected message format:
"Hi [Patient Name], your appointment with Dr. [Doctor Name] is on [Date] at [Time]."

Example:
"Hi John Doe, your appointment with Dr. Smith is on 2024-05-15 at 02:30 PM."
```

#### Test 3: Non-Verified Users Don't Get Reminders
```
1. Book appointment without completing onboarding
2. Set appointment for 1 hour from now
3. Trigger reminder processing
Expected: No WhatsApp sent (whatsapp_opt_in: false)
```

---

## Database Schema

### User Model (Updated Fields)
```javascript
{
  // Existing fields...
  name, email, password, image, address, gender, dob, phone, profilePic,
  
  // New fields:
  phone_number: String (unique, sparse),  // E.164 format
  is_phone_verified: Boolean (default: false),
  age: Number,
  whatsapp_opt_in: Boolean (default: false),
  onboarding_completed: Boolean (default: false),
  created_at: Date,
  updated_at: Date
}
```

### OTP Model
```javascript
{
  phone_number: String (required),       // E.164 format
  otp_code: String (required),           // Plain text (demo only)
  otp_hash: String (required),           // SHA256 hash
  attempts: Number (max: 5),             // Verification attempts
  max_attempts: Number (default: 5),
  is_verified: Boolean (default: false),
  created_at: Date (default: now),
  expires_at: Date (required),           // Auto-delete after
  user_id: ObjectId (ref: user)          // Optional
}
```

---

## Background Tasks

### Appointment Reminders
- **Frequency**: Every 5 minutes
- **Window**: Appointments 55-65 minutes from now
- **Service**: `processAppointmentRemindersSimple()`
- **Conditions**:
  - Appointment status: CONFIRMED
  - User must have: `whatsapp_opt_in: true` and valid phone number
  - Appointment not already reminded

### Cleanup Tasks
- **Frequency**: Every 5 minutes
- **Purpose**: Remove expired HOLD appointments
- **Service**: `cleanupExpiredHolds()`

---

## Security Considerations

### OTP Security
1. ✅ OTP stored as SHA256 hash (not plain text)
2. ✅ 6-digit OTP (1 million combinations)
3. ✅ Expiry time configurable (default: 10 min)
4. ✅ Rate limiting: 3 OTPs per phone per 24 hours
5. ✅ Attempt limiting: Max 5 verification attempts
6. ✅ Unique phone number enforcement

### API Security
1. ✅ Authentication required for all endpoints
2. ✅ Phone number uniqueness constraint
3. ✅ Input validation on all fields
4. ✅ Structured error responses (no sensitive data)
5. ✅ Rate limiting on OTP sending

### Development Only
1. ⚠️ OTP code shown in response only if `NODE_ENV=development`
2. ⚠️ Remove development OTP logs before production
3. ⚠️ Set strong JWT_SECRET in production

---

## Troubleshooting

### Issue: "Twilio credentials missing"
**Solution**: 
- Verify `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` are set in `.env`
- Restart backend server after adding env vars

### Issue: OTP not being sent
**Solution**:
- Check Twilio account has SMS capability enabled
- Verify phone number is in E.164 format (+14155238886)
- Check Twilio logs: https://console.twilio.com/monitor/logs/debugger

### Issue: WhatsApp reminders not sending
**Solution**:
- Verify `TWILIO_WHATSAPP_FROM` is set correctly (whatsapp: prefix)
- Check if user has `whatsapp_opt_in: true`
- Verify user has valid `phone_number`
- Check appointment status is CONFIRMED
- Check background task is running: `npm run server` logs

### Issue: OTP expired too quickly
**Solution**:
- Increase `OTP_EXPIRY_MINUTES` in `.env` (default: 10)
- Restart backend after changing

### Issue: Can't verify with OTP in the form
**Solution**:
- Ensure you're using the correct OTP code (check backend logs)
- OTP has 5 attempts max, then needs new OTP
- OTP expires after 10 minutes (configurable)

---

## Files Modified/Created

### Backend
- ✅ `models/userModel.js` - Updated with phone verification fields
- ✅ `models/otpModel.js` - New: OTP storage model
- ✅ `services/otpService.js` - New: OTP generation, sending, verification
- ✅ `services/appointmentReminderService.js` - New: WhatsApp reminders
- ✅ `controllers/onboardingController.js` - New: Onboarding endpoints
- ✅ `routes/onboardingRoute.js` - New: Onboarding routes
- ✅ `server.js` - Updated: Added onboarding routes
- ✅ `utils/backgroundTasks.js` - Updated: Added reminder processing

### Frontend
- ✅ `pages/Onboarding.jsx` - New: Onboarding page
- ✅ `pages/Login.jsx` - Updated: Redirect to onboarding after signup
- ✅ `App.jsx` - Updated: Added onboarding route

---

## Performance Considerations

### OTP Performance
- MongoDB TTL index: Auto-deletes expired OTPs after expiry time
- Compound index on `(phone_number, is_verified)` for fast lookups
- Hashing done once during creation and verification

### Reminder Performance
- Runs every 5 minutes (configurable interval)
- Filters by: appointment status + date + time window
- Flags reminded appointments to prevent duplicate sends
- Handles errors gracefully without stopping other tasks

### Database Indexes
```javascript
// Automatic indexes created:
1. TTL Index: Removes OTP after expiry
2. Compound Index: (phone_number, is_verified)
3. User Index: phone_number (unique, sparse)
```

---

## Future Enhancements

1. **Email OTP Option**: Send OTP via email in addition to SMS
2. **Resend Limits**: Track and limit OTP resends
3. **Analytics Dashboard**: View OTP success/failure rates
4. **Appointment Confirmation**: Ask user to confirm appointment via reply
5. **Two-Factor Authentication**: Use OTP for account security
6. **SMS Template Management**: Admin panel to customize SMS templates
7. **Delivery Reports**: Track WhatsApp delivery and read status
8. **Multi-language Support**: Send reminders in user's preferred language

---

## Support & Questions

For issues or questions:
1. Check logs: `backend/` stdout
2. Verify Twilio credentials in `.env`
3. Check MongoDB connection in browser DevTools
4. Enable debug mode: `DEBUG=*` npm run server

---

## Changelog

### v1.0 (Current)
- ✅ OTP verification via Twilio SMS
- ✅ Phone number collection during onboarding
- ✅ WhatsApp appointment reminders (1 hour before)
- ✅ Background task scheduler
- ✅ Rate limiting and attempt tracking
- ✅ Frontend onboarding flow
- ✅ Comprehensive error handling
