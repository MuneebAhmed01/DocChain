# Implementation Checklist & Next Steps

## Pre-Deployment Checklist

- [ ] Run migration script: `node scripts/migrateAppointments.js`
- [ ] Verify all new endpoints are accessible
- [ ] Test background task initialization on server start
- [ ] Confirm Stripe keys are correctly configured
- [ ] Update email templates (sent separately)
- [ ] Test atomic transaction race condition scenarios

---

## Database Indexes Created

The following indexes have been added to appointmentModel for performance:

```javascript
appointmentSchema.index({ holdExpiry: 1, appointmentStatus: 1 });
appointmentSchema.index({ userId: 1, appointmentStatus: 1 });
appointmentSchema.index({ docId: 1, slotDate: 1, appointmentStatus: 1 });
```

MongoDB will create these automatically on first query.

---

## Background Task Configuration

**Cleanup runs every 5 minutes** - Can be adjusted in [backend/utils/backgroundTasks.js](backend/utils/backgroundTasks.js):

```javascript
// Change this value (in milliseconds)
cleanupInterval = setInterval(async () => {
  // ...
}, 5 * 60 * 1000); // ← 5 minutes
```

For testing, change to 1 minute:
```javascript
}, 1 * 60 * 1000); // 1 minute
```

---

## Frontend Implementation Required

### 1. After Booking (HOLD State)
Show payment selection UI with:
- Amount breakdown (full vs token)
- Countdown timer showing hold expiry
- Two buttons: "Pay Full (10% discount)" & "Pay Token"

### 2. Payment Flow
- Redirect to Stripe checkout
- On return, verify payment
- Show confirmation message

### 3. Token Payment
- Show token amount (10%)
- Show remaining balance due at clinic
- Add reminder in confirmation

### 4. Appointment History
- Display appointment status with color coding
- Show cancellation reason if applicable
- Show refund status if refund initiated

### 5. Cancellation UI
- Show refund status
- For admin: add cancellation reason field
- Show if slot will be released

---

## Rollback Plan (if needed)

If there are issues:

1. **Don't update appointments** - keep using old workflow
2. **Disable background tasks** - comment out in server.js
3. **Keep both systems running** - old and new code coexist

To rollback:
- Remove migration (appointments keep new fields)
- Disable background tasks
- Use old booking logic

---

## Optional Enhancements

### 1. Stripe Refund Automation
Add endpoint for automatic refunds:

```javascript
router.post("/process-refund", authAdmin, async (req, res) => {
  const { appointmentId, refundAmount } = req.body;
  // Use stripe.refunds.create(...)
  // Update appointment.refundStatus
});
```

### 2. No-Show Marking
Add endpoint for marking appointments as no-show:

```javascript
router.post("/mark-no-show", authAdmin, async (req, res) => {
  const { appointmentId } = req.body;
  // Update appointmentStatus to NO_SHOW
  // Track for analytics
});
```

### 3. Appointment Reminders
Extend background tasks with reminders:

```javascript
// Send reminder 1 hour before appointment
setInterval(async () => {
  const upcoming = await appointmentModel.find({
    appointmentStatus: APPOINTMENT_STATUS.CONFIRMED,
    slotDate: tomorrow,
    slotTime: within1Hour
  });
  // Send email reminders
}, 1 * 60 * 1000);
```

### 4. Cancellation Analytics
Track why appointments are cancelled:

```javascript
const analytics = await appointmentModel.aggregate([
  { $match: { appointmentStatus: APPOINTMENT_STATUS.CANCELLED_BY_ADMIN } },
  { $group: { _id: "$cancellationReason", count: { $sum: 1 } } }
]);
```

### 5. HOLD Duration Customization
Make hold duration configurable per doctor:

```javascript
// Add to doctorModel
holdDurationMinutes: { type: Number, default: 10 }

// Use in bookAppointment
const holdExpiry = new Date(Date.now() + doctor.holdDurationMinutes * 60 * 1000);
```

---

## Monitoring & Debugging

### Check Background Task Status
Add admin endpoint:

```javascript
router.get("/task-status", authAdmin, async (req, res) => {
  const expiredHolds = await appointmentModel.countDocuments({
    appointmentStatus: APPOINTMENT_STATUS.HOLD,
    holdExpiry: { $lt: new Date() }
  });
  
  res.json({
    expiredHoldsAwaitingCleanup: expiredHolds,
    lastCleanup: new Date() // would need to track
  });
});
```

### Monitor Cleanup Logs
Check server console for:
```
🕐 Running HOLD expiry cleanup at 2024-04-25T10:30:00Z
✅ Successfully cleaned up 2 expired HOLD appointments
```

### Test Cleanup Manually
```bash
curl -X POST http://localhost:4000/api/admin/trigger-hold-cleanup \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## Troubleshooting

### Issue: "Slot no longer available" after payment
**Cause:** Another user paid first (race condition)
**Solution:** User should book different slot - this is expected behavior

### Issue: HOLD appointments not being cleaned up
**Cause:** Background task not running
**Solution:** 
1. Check server console for task startup message
2. Manually trigger cleanup: `POST /api/admin/trigger-hold-cleanup`
3. Check MongoDB for expired holds: `db.appointments.find({ holdExpiry: { $lt: new Date() } })`

### Issue: Payment verified but appointment not confirmed
**Cause:** Stripe webhook delay
**Solution:**
1. Check appointment status in MongoDB
2. Manually verify: `POST /api/stripe/verify-payment` again
3. If still not confirmed, check error logs

### Issue: Email not sending on cancellation
**Cause:** Email service configuration
**Solution:**
1. Check `.env` for email credentials
2. Verify email templates exist
3. Check console error logs for SMTP errors

---

## Performance Benchmarks

Expected query performance with new indexes:

- **Find slots on date:** <10ms
- **Check user appointments:** <5ms  
- **Find expired holds:** <20ms
- **Cleanup batch update:** <50ms (for 100 documents)

If performance degrades:
1. Check MongoDB index status: `db.appointments.getIndexes()`
2. Rebuild indexes if needed: `db.appointments.reIndex()`

---

## Security Considerations

1. **Token Validation** - JWT middleware validates all endpoints
2. **Race Conditions** - Atomic transactions prevent double booking
3. **Refund Authorization** - Only admins can authorize refunds
4. **Email Verification** - Cancellation emails sent to verified addresses
5. **Slot Integrity** - Only CONFIRMED appointments lock slots

---

## Deployment Notes

1. **Database Migration** - Must run before any bookings with new fields
2. **Backward Compatibility** - Works with existing data
3. **No Downtime** - Can deploy without stopping service
4. **Gradual Rollout** - Can test with admin users first

### Deployment Steps:
1. Deploy code changes
2. Run migration script: `node scripts/migrateAppointments.js`
3. Start server (background tasks start automatically)
4. Test endpoints with admin credentials
5. Enable for regular users

---

## Support & Documentation

- **API Docs:** [backend/APPOINTMENT_BOOKING_API.md](backend/APPOINTMENT_BOOKING_API.md)
- **Implementation Notes:** [memories/repo/appointment-booking-implementation.md](/memories/repo/appointment-booking-implementation.md)
- **Service Functions:** [backend/services/appointmentService.js](backend/services/appointmentService.js)
- **Background Tasks:** [backend/utils/backgroundTasks.js](backend/utils/backgroundTasks.js)

---
