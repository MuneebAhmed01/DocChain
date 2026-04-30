# Troubleshooting Guide - Wallet Payment System

## Common Issues & Solutions

### Issue 1: Doctor wallet not increasing after payment

**Symptoms:**

- User pays token/full amount via Stripe
- Appointment marked CONFIRMED
- Doctor's walletBalance unchanged

**Root Causes:**

1. Stripe webhook not configured
2. Payment verification skipped
3. Database transaction failed silently

**Solutions:**

1. Verify Stripe webhook is configured to call `/api/stripe/verify-payment`
2. Check Stripe logs for payment events
3. Query walletTransaction collection:
   ```bash
   db.wallettransactions.find({ appointmentId: "apt_id" })
   ```
4. Check if transaction status is FAILED or PENDING
5. Review server logs for error messages

**Verification:**

```bash
# Get appointment
db.appointments.findOne({ _id: ObjectId("apt_id") })
# Should show: walletCredited: true, walletCreditedAmount: 500

# Get doctor
db.doctors.findOne({ _id: ObjectId("doc_id") })
# Should show: walletBalance > 0
```

---

### Issue 2: Remaining amount not credited on completion

**Symptoms:**

- Doctor marks appointment COMPLETED
- Response shows success
- Wallet balance unchanged

**Root Causes:**

1. Appointment status not CONFIRMED
2. Not a TOKEN payment (full payment doesn't need remaining)
3. Remaining amount already credited
4. Wallet service error

**Solutions:**

1. Verify appointment status is CONFIRMED:
   ```bash
   db.appointments.findOne({ _id: ObjectId("apt_id"), appointmentStatus: "CONFIRMED" })
   ```
2. Check if TOKEN payment:
   ```bash
   db.appointments.findOne({ _id: ObjectId("apt_id"), tokenPaid: true })
   ```
3. Check if already credited:
   ```bash
   db.appointments.findOne({ _id: ObjectId("apt_id"), remainingAmountCredited: true })
   ```
4. Review server logs for wallet service errors

**Manual Fix:**

```bash
# Check transaction log
db.wallettransactions.find({
  appointmentId: ObjectId("apt_id"),
  transactionType: "REMAINING_CREDIT"
})

# If FAILED, retry:
# Call appointmentComplete again (idempotent - safe)
```

---

### Issue 3: Token reversed multiple times (double deduction)

**Symptoms:**

- Doctor cancels appointment
- Wallet correctly debited first time
- Wallet debited again on second cancel

**Root Causes:**

1. Idempotency key not working
2. Old cancellation code still running
3. Database transaction issue

**Solutions:**

1. Verify wallet service is being used:
   ```bash
   grep -n "WalletService.debitFullRefund" backend/controllers/doctorController.js
   # Should exist and be called
   ```
2. Check walletTransaction table for duplicate transactions:
   ```bash
   db.wallettransactions.aggregate([
     { $match: { appointmentId: ObjectId("apt_id"), transactionType: "TOKEN_REVERSAL" } },
     { $group: { _id: null, count: { $sum: 1 } } }
   ])
   # count should be 1
   ```
3. Verify idempotencyKey is unique:
   ```bash
   db.wallettransactions.find({ appointmentId: ObjectId("apt_id") })
   # Should see idempotencyKey: "apt_id-TOKEN_REVERSAL"
   ```

**Recovery:**

```bash
# Find over-deducted amount
db.wallettransactions.find({ appointmentId: ObjectId("apt_id") })

# Manual correction (last resort):
# Contact admin to manually adjust wallet
```

---

### Issue 4: Appointment sorting shows oldest first

**Symptoms:**

- Doctor dashboard shows old appointments at top
- Latest appointments buried at bottom

**Root Causes:**

1. Old code without proper sorting
2. Frontend sorting overriding backend sort

**Solutions:**

1. Verify database query has sort:
   ```bash
   grep -n "sort({ slotDate" backend/controllers/doctorController.js
   # Should show: sort({ slotDate: -1, slotTime: -1 })
   ```
2. Check if frontend is re-sorting:
   ```javascript
   // clientside/src/components/DoctorChatList.jsx (or similar)
   // Should NOT call .sort() or .reverse() on appointments
   ```
3. Restart server to load updated code

**Verification:**

```bash
# Check API response
curl -X POST http://localhost:5000/api/doctor/appointments \
  -H "Content-Type: application/json" \
  -d '{"docId": "doc_id"}'

# Response should show newest appointment first
```

---

### Issue 5: Wallet balance shows incorrect amount

**Symptoms:**

- walletBalance doesn't match expected total
- Discrepancy between balance and transaction sum

**Root Causes:**

1. Race condition during concurrent operations
2. Partial transaction failure
3. Manual database edits
4. Bug in calculation logic

**Solutions:**

1. Calculate expected balance from transactions:
   ```bash
   db.wallettransactions.aggregate([
     { $match: { docId: ObjectId("doc_id"), status: "COMPLETED" } },
     { $group: { _id: null, total: { $sum: "$amount" } } }
   ])
   # Compare with doctor.walletBalance
   ```
2. Check for FAILED transactions:
   ```bash
   db.wallettransactions.find({
     docId: ObjectId("doc_id"),
     status: { $in: ["FAILED", "PENDING"] }
   })
   ```
3. Review recent transactions for duplicates
4. Check server logs for wallet operation errors

**Reconciliation:**

```bash
# If balance is wrong, recalculate:
# 1. Sum all COMPLETED transactions
# 2. Compare with doctor.walletBalance
# 3. If different, update doctor record with correct amount
#    (This should be rare - indicates data corruption)
```

---

### Issue 6: Admin endpoints return empty or error

**Symptoms:**

- `POST /api/admin/doctor-wallet-summary` returns error
- `POST /api/admin/doctor-transaction-history` returns empty

**Root Causes:**

1. Routes not registered
2. Admin authentication failed
3. DocId invalid
4. WalletTransaction model not created

**Solutions:**

1. Verify routes are registered:
   ```bash
   grep -n "doctor-wallet-summary" backend/routes/adminRoute.js
   # Should show the route exists
   ```
2. Check admin token is valid
3. Verify docId exists:
   ```bash
   db.doctors.findOne({ _id: ObjectId("doc_id") })
   ```
4. Verify walletTransaction collection exists:
   ```bash
   db.wallettransactions.findOne({})
   ```
5. Restart server if routes added recently

**Verification:**

```bash
# Test with valid admin token and existing doctor
curl -X POST http://localhost:5000/api/admin/doctor-wallet-summary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer valid_admin_token" \
  -d '{"docId": "existing_doctor_id"}'
```

---

### Issue 7: Appointment can't be marked complete

**Symptoms:**

- `POST /api/doctor/appointment-complete` returns error
- Error message: "Cannot complete appointment with status: ..."

**Root Causes:**

1. Appointment not CONFIRMED
2. Already COMPLETED
3. CANCELLED status
4. Invalid appointmentId

**Solutions:**

1. Check appointment status:
   ```bash
   db.appointments.findOne({ _id: ObjectId("apt_id") })
   # Should show: appointmentStatus: "CONFIRMED"
   ```
2. If already COMPLETED, second call should return success with isDuplicate
3. If CANCELLED, appointment cannot be completed (by design)
4. Verify appointmentId is correct

**Recovery:**

```bash
# If appointment wrongly cancelled, admin can reopen:
# (Future feature - currently no endpoint for this)

# Current workaround:
# Contact support to manually update appointmentStatus to CONFIRMED
```

---

### Issue 8: Race condition - concurrent cancellations

**Symptoms:**

- Two doctors clicking cancel simultaneously
- Wallet inconsistent
- Multiple refunds processed

**Verification:**

```bash
# Check if you see duplicate completed transactions:
db.wallettransactions.find({
  appointmentId: ObjectId("apt_id"),
  transactionType: "TOKEN_REVERSAL",
  status: "COMPLETED"
}).count()
# Should be 1 (not 2+)
```

**Solutions:**

1. Idempotency should prevent this - verify it's working
2. If duplicates exist, this indicates older code running
3. Restart all servers to load new code

**Recovery:**

```bash
# Count duplicates
db.wallettransactions.find({
  appointmentId: ObjectId("apt_id"),
  transactionType: "TOKEN_REVERSAL",
  status: "COMPLETED"
}).toArray()

# Manually calculate overcharge:
# (duplicate_count - 1) * amount = overcharge_total

# Contact admin to manually refund doctor
```

---

### Issue 9: Wallet showing negative balance

**Symptoms:**

- `walletBalance < 0` in doctor record
- Should never happen with proper validation

**Root Causes:**

1. Manual database edit
2. Bug in old code before fixes
3. Stripe refund processed but cancellation not triggered

**Solutions:**

1. This indicates data corruption
2. Check transaction history for clues:
   ```bash
   db.wallettransactions.find({ docId: ObjectId("doc_id"), status: "COMPLETED" })
   # Sum all amounts - should equal walletBalance
   ```
3. Identify problematic transactions
4. Contact admin to reconcile

**Recovery:**

```bash
# Calculate correct balance from transactions:
db.wallettransactions.aggregate([
  { $match: { docId: ObjectId("doc_id"), status: "COMPLETED" } },
  { $group: { _id: null, total: { $sum: "$amount" } } }
])
# Returns the correct balance

# Then update doctor record:
db.doctors.updateOne(
  { _id: ObjectId("doc_id") },
  { $set: { walletBalance: correct_amount } }
)
```

---

### Issue 10: Transaction log missing or incomplete

**Symptoms:**

- Wallet changes but no transaction records
- Some transactions missing from history

**Root Causes:**

1. Stripe routes not using wallet service (old code)
2. Transaction model not created
3. Saving to wrong collection
4. Database permissions issue

**Solutions:**

1. Verify walletTransaction collection exists:
   ```bash
   db.getCollectionNames().includes("wallettransactions")
   ```
2. Check if Stripe routes are using wallet service
3. Verify backend code is updated
4. Restart server to load new models

**Verification:**

```bash
# Should see transactions for recent operations:
db.wallettransactions.find({}).sort({ createdAt: -1 }).limit(10)
```

---

## Debugging Checklist

When something goes wrong:

- [ ] Check server logs for errors
- [ ] Verify appointment status is correct
- [ ] Check walletTransaction collection for related transactions
- [ ] Query doctor wallet balance
- [ ] Calculate expected balance from transaction sum
- [ ] Verify API response structure matches documentation
- [ ] Check if issue is in old code (restart server)
- [ ] Verify routes are properly registered
- [ ] Confirm admin token is valid
- [ ] Test with known good data first

---

## Performance Optimization

If system running slow:

**Indexes to verify exist:**

```bash
db.wallettransactions.getIndexes()
# Should show indexes on: docId, appointmentId, idempotencyKey

db.appointments.getIndexes()
# Should show indexes on: slotDate, docId
```

**If indexes missing:**

```bash
db.wallettransactions.createIndex({ docId: 1, createdAt: -1 })
db.wallettransactions.createIndex({ appointmentId: 1 })
db.wallettransactions.createIndex({ idempotencyKey: 1 }, { sparse: true })
```

---

## Getting Help

1. Check this troubleshooting guide first
2. Review logs: `backend/logs/*.log`
3. Check MongoDB directly for data consistency
4. Review code changes in [WALLET_PAYMENT_SYSTEM.md](WALLET_PAYMENT_SYSTEM.md)
5. Contact development team with:
   - Error message
   - Appointment ID
   - Doctor ID
   - Timestamp
   - Steps to reproduce
