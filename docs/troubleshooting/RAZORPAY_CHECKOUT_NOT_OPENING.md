# 🔧 Fix: Razorpay Checkout Not Opening

## Problem
When trying to top up, you see "Payment Initiated (Mock)" instead of Razorpay checkout.

## Root Causes

### 1. **Backend Not Running or Not Accessible**
- Backend API call is failing
- Network error
- Backend URL incorrect

### 2. **Razorpay Keys Not Set in Railway**
- `RAZORPAY_KEY_ID` not set
- `RAZORPAY_KEY_SECRET` not set
- Backend returns error instead of Razorpay key

### 3. **API Response Structure Mismatch**
- Response format doesn't match expected structure
- `razorpayKeyId` missing from response

---

## ✅ Solution Steps

### Step 1: Check Backend is Running

**Verify Railway backend is running:**
1. Go to Railway Dashboard
2. Check your service status
3. Verify it's deployed and running

**Test backend endpoint:**
```bash
curl https://xxxmapnp-production.up.railway.app/health
```

Should return: `{"status":"ok"}`

---

### Step 2: Verify Razorpay Keys in Railway

**In Railway Dashboard:**
1. Go to your service → Settings → Variables
2. Verify these are set:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_secret_key
   ```

**If keys are missing:**
1. Get keys from [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Go to Settings → API Keys
3. Copy Key ID and Key Secret
4. Add to Railway environment variables
5. **Redeploy** the backend service

---

### Step 3: Check API Response

**In the app console/logs, you should see:**
```
🚀 Initiating top-up: {amount: 100, paymentMethod: "upi"}
✅ Top-up response received: {...}
```

**If you see errors:**
- Check network connectivity
- Verify API base URL in `app.json`
- Check backend logs in Railway

---

### Step 4: Test Backend Endpoint Directly

**Test with curl (replace YOUR_TOKEN with actual auth token):**
```bash
curl -X POST https://xxxmapnp-production.up.railway.app/wallet/top-up \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount": 100, "paymentMethod": "upi"}'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "order_xxxxx",
    "orderId": "order_xxxxx",
    "amount": 100,
    "status": "pending",
    "razorpayKeyId": "rzp_test_xxxxx",
    "checkoutUrl": "https://checkout.razorpay.com/..."
  }
}
```

**If `razorpayKeyId` is missing:**
- Razorpay keys are not set in Railway
- Backend needs to be redeployed after adding keys

---

### Step 5: Check App Logs

**In Expo Go/Development:**
1. Open Metro bundler console
2. Look for logs:
   - `🚀 Initiating top-up:`
   - `✅ Top-up response received:`
   - `❌ Top-up error:`

**Common errors:**
- `Network request failed` → Backend not accessible
- `Payment gateway not configured` → Razorpay keys missing
- `Invalid or expired token` → Auth issue

---

## 🐛 Debug Checklist

- [ ] Backend is running in Railway
- [ ] `/health` endpoint returns `{"status":"ok"}`
- [ ] `RAZORPAY_KEY_ID` is set in Railway
- [ ] `RAZORPAY_KEY_SECRET` is set in Railway
- [ ] Backend was redeployed after adding keys
- [ ] API base URL in `app.json` is correct
- [ ] Network connection is working
- [ ] Auth token is valid
- [ ] Check app console logs for errors

---

## 🔄 Quick Fix

**If Razorpay keys are missing:**

1. **Get Razorpay Keys:**
   - Go to https://dashboard.razorpay.com
   - Settings → API Keys
   - Copy Key ID and Key Secret

2. **Add to Railway:**
   - Railway Dashboard → Service → Settings → Variables
   - Add `RAZORPAY_KEY_ID`
   - Add `RAZORPAY_KEY_SECRET`
   - **Redeploy** service

3. **Test Again:**
   - Try top-up in app
   - Should now open Razorpay checkout

---

## 📝 Expected Flow

1. User taps "Top Up" → API call to backend
2. Backend creates Razorpay order
3. Backend returns `razorpayKeyId` in response
4. App opens Razorpay checkout modal
5. User completes payment
6. Payment verified → Success

**If step 3 fails → Shows mock alert**

---

## 🎯 Next Steps

After fixing:
1. Test payment flow end-to-end
2. Verify Razorpay checkout opens
3. Complete test payment
4. Check payment verification works

---

**Need more help? Check the console logs for specific error messages!**

