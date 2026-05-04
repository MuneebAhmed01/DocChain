# Quick Reference - Phone Verification & WhatsApp Reminders

## 🚀 Start Here

### What Was Added?
- ✅ Phone number verification via OTP (SMS)
- ✅ WhatsApp appointment reminders 1 hour before
- ✅ Multi-step onboarding after signup
- ✅ Secure OTP hashing & rate limiting

### What Wasn't Changed?
- ✅ Signup flow remains the same
- ✅ Appointment booking unchanged
- ✅ All existing features working

---

## 📋 Setup (5 Minutes)

### 1. Add Environment Variables
```env
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_NUMBER=+1234567890
TWILIO_WHATSAPP_FROM=whatsapp:+1234567890
OTP_EXPIRY_MINUTES=10
NODE_ENV=development
```

### 2. Start Backend
```bash
cd backend
npm run server
```

### 3. Start Frontend
```bash
cd clientside
npm run dev
```

---

## 🧪 Test (10 Minutes)

### 1. Sign Up
- Go to http://localhost:5173/login
- Create account with any email/password
- → Auto-redirected to /onboarding

### 2. Verify Phone
- Enter phone: +14155238886
- Click "Send OTP"
- Enter OTP code (shown in console if dev mode)
- Verify successful

### 3. Complete Profile
- Age: 25
- Gender: Male
- → Back to home

### 4. Book Appointment
- Go to doctors page
- Select any doctor
- Book appointment for 1 hour from now
- → Wait 55-65 minutes for WhatsApp reminder

---

## 📊 User Journey

```
Signup (no changes)
    ↓
[NEW] Onboarding Page
    ↓
Enter Phone Number
    ↓
[NEW] OTP Verification
    ↓
Complete Profile (Age, Gender)
    ↓
Home Page (normal flow)
    ↓
Book Appointment (unchanged)
    ↓
[NEW] WhatsApp Reminder (1 hour before)
```

---

## 🔌 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/onboarding/send-otp` | Send OTP to phone |
| POST | `/api/onboarding/verify-otp` | Verify OTP code |
| POST | `/api/onboarding/complete` | Complete onboarding |
| GET | `/api/onboarding/status` | Check onboarding status |

All require authentication token.

---

## 🗄️ Database

### New Collections
- **otp** - Stores OTP attempts and verification

### Updated Collections
- **user** - Added: `phone_number`, `age`, `gender`, `is_phone_verified`, `whatsapp_opt_in`, `onboarding_completed`

---

## ⚙️ Background Tasks

Runs automatically every 5 minutes:
- ✅ Sends WhatsApp reminders for upcoming appointments
- ✅ Cleans up expired HOLD appointments (existing)

---

## 🔒 Security

| Feature | Implementation |
|---------|-----------------|
| OTP Hashing | SHA256 |
| Rate Limit | 3 per phone per 24h |
| Max Attempts | 5 per OTP |
| Expiry | 10 minutes (configurable) |
| Phone Uniqueness | Enforced |

---

## 🎯 User Experience

### Phone Verification
```
Input Phone → Send OTP → Enter OTP → Verified ✓
```

### Appointment Reminder
```
Book Appointment (2:00 PM)
    ↓
1 hour before (1:00 PM)
    ↓
Receive WhatsApp: "Your appointment with Dr. Smith is at 2:00 PM"
```

---

## 🧪 Quick Tests

### Test 1: Happy Path
- [ ] Sign up
- [ ] Complete onboarding
- [ ] Book appointment
- [ ] Receive reminder in 1 hour

### Test 2: Invalid Phone
- [ ] Enter "12345"
- [ ] Error: "Invalid phone number format"

### Test 3: Wrong OTP
- [ ] Enter wrong code 5 times
- [ ] Error: "Maximum attempts exceeded"

### Test 4: Duplicate Phone
- [ ] User A: Register +14155238886
- [ ] User B: Try same phone
- [ ] Error: "Phone number already registered"

---

## 📞 Troubleshooting

| Problem | Solution |
|---------|----------|
| OTP not sent | Check Twilio credentials in `.env` |
| Reminder not sent | Check `whatsapp_opt_in: true` in user |
| Phone number error | Use E.164 format: +14155238886 |
| Rate limit hit | Wait 24 hours or change number |

---

## 📁 Key Files

### Backend
- `models/otpModel.js` - OTP storage
- `services/otpService.js` - OTP logic
- `controllers/onboardingController.js` - API handlers
- `routes/onboardingRoute.js` - API routes
- `services/appointmentReminderService.js` - Reminders

### Frontend
- `pages/Onboarding.jsx` - Onboarding form
- `pages/Login.jsx` - Updated signup redirect
- `App.jsx` - New route added

---

## 📚 Detailed Docs

- **Setup Guide**: `PHONE_VERIFICATION_SETUP.md`
- **Test Scenarios**: `TEST_SCENARIOS.md`
- **Implementation**: `IMPLEMENTATION_SUMMARY.md`

---

## ✨ Features Summary

| Feature | Status | Details |
|---------|--------|---------|
| Signup UI | ✅ Unchanged | No modifications to existing flow |
| OTP SMS | ✅ Working | Via Twilio |
| Phone Verification | ✅ Secure | SHA256 hashed |
| Onboarding | ✅ New | Multi-step form |
| WhatsApp Reminders | ✅ Automatic | 1 hour before appointment |
| Error Handling | ✅ Complete | User-friendly messages |
| Rate Limiting | ✅ Active | 3 per 24 hours |
| Background Tasks | ✅ Scheduled | Every 5 minutes |

---

## 🎓 Learning Path

1. **Understand Flow**: Read `IMPLEMENTATION_SUMMARY.md`
2. **Setup System**: Follow `PHONE_VERIFICATION_SETUP.md`
3. **Test Everything**: Use `TEST_SCENARIOS.md`
4. **Review Code**: Check commented files

---

## 💡 Common Questions

**Q: Do I need to change signup?**
A: No! Signup is completely unchanged. Onboarding happens after.

**Q: What if user skips onboarding?**
A: They can still book appointments but won't get reminders. They can complete it anytime.

**Q: How do I test WhatsApp reminders?**
A: Book appointment for 1 hour from now, wait 55-65 minutes.

**Q: Can users opt out of reminders?**
A: Set `whatsapp_opt_in: false` to disable reminders.

**Q: What about internationalization?**
A: Phone format: E.164 works worldwide (+1, +44, +91, +86, etc.)

---

## 🔄 Integration Notes

This implementation:
- ✅ Uses existing Twilio setup
- ✅ Reuses WhatsApp templates
- ✅ Extends existing User model
- ✅ Integrates with appointment system
- ✅ Respects existing auth middleware
- ✅ Maintains all existing features

---

## 📞 Support Resources

- Twilio Console: https://console.twilio.com/
- Twilio Docs: https://www.twilio.com/docs/
- MongoDB Docs: https://docs.mongodb.com/
- Express Docs: https://expressjs.com/

---

## ✅ Pre-Launch Checklist

- [ ] Twilio credentials added to `.env`
- [ ] MongoDB running
- [ ] Backend started: `npm run server`
- [ ] Frontend started: `npm run dev`
- [ ] Can access http://localhost:5173
- [ ] Signup works
- [ ] Redirects to onboarding
- [ ] OTP sends
- [ ] OTP verifies
- [ ] Profile completes
- [ ] Back to home page
- [ ] Can book appointment

---

## 🎉 You're Ready!

The phone verification and WhatsApp reminder system is fully implemented and ready to use. 

Start with the quick test (10 minutes) above, then explore the detailed documentation for more information.

Happy testing! 🚀
