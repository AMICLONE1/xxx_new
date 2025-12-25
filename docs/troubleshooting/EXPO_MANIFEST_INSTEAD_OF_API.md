# 🔧 Fix: Getting Expo Manifest Instead of API Response

## Problem
API calls are returning the Expo manifest JSON instead of the actual backend API response.

## Root Cause
The request is hitting the **Expo dev server** (port 8081) instead of the **backend API** on Railway.

---

## ✅ Solution

### Step 1: Verify Backend is Running on Railway

**Check Railway Dashboard:**
1. Go to Railway Dashboard
2. Open your backend service
3. Check **Deployments** tab
4. Verify latest deployment is **Active** and **Running**
5. Check **Logs** to see if backend started successfully

**Test Backend Health Endpoint:**
```bash
curl https://xxxmapnp-production.up.railway.app/health
```

**Expected Response:**
```json
{"status":"ok"}
```

**If you get an error:**
- Backend is not running
- Backend is not deployed
- Backend crashed on startup

---

### Step 2: Check Backend Port Configuration

**In Railway:**
- Railway automatically assigns a port
- Backend should listen on `process.env.PORT` or `3000`
- Railway exposes it on port 80/443 (HTTP/HTTPS)

**Check `backend/src/index.ts`:**
```typescript
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

### Step 3: Verify API Base URL

**Current setting in `app.json`:**
```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://xxxmapnp-production.up.railway.app"
    }
  }
}
```

**This should be:**
- ✅ `https://xxxmapnp-production.up.railway.app` (without port)
- ❌ NOT `https://xxxmapnp-production.up.railway.app:8081` (Expo dev server)

---

### Step 4: Test Backend Endpoint Directly

**Test the top-up endpoint:**
```bash
curl -X POST https://xxxmapnp-production.up.railway.app/wallet/top-up \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount": 100, "paymentMethod": "upi"}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "order_xxxxx",
    "orderId": "order_xxxxx",
    "amount": 100,
    "status": "pending",
    "razorpayKeyId": "rzp_test_xxxxx"
  }
}
```

**If you get Expo manifest:**
- Backend is not running
- Request is hitting wrong endpoint
- Railway routing issue

---

### Step 5: Check Railway Service Configuration

**In Railway Dashboard:**
1. Go to your backend service
2. Check **Settings** → **Networking**
3. Verify **Public Domain** is set correctly
4. Check if there are any **Custom Domains** configured

**Common Issues:**
- Service is not public
- Port is not exposed
- Health checks failing

---

## 🐛 Debug Steps

### 1. Check Backend Logs in Railway

**In Railway Dashboard:**
- Go to your service → **Logs**
- Look for:
  - `Server running on port XXXX`
  - `Razorpay initialized` (if keys are set)
  - Any error messages

**If you see errors:**
- Fix the errors
- Redeploy the service

---

### 2. Verify Backend is Accessible

**Test with curl:**
```bash
# Health check
curl https://xxxmapnp-production.up.railway.app/health

# Should return: {"status":"ok"}
```

**If it fails:**
- Backend is not running
- Backend is not deployed
- Network/firewall issue

---

### 3. Check API Client Logs

**In the app console, you should see:**
```
🔗 API Base URL: https://xxxmapnp-production.up.railway.app
🌐 API Request: POST https://xxxmapnp-production.up.railway.app/wallet/top-up
```

**If you see port 8081:**
- API base URL is wrong
- Check `app.json` configuration

---

## 🔄 Quick Fix

### If Backend is Not Running:

1. **Check Railway Deployment:**
   - Go to Railway Dashboard
   - Check if service is deployed
   - Check logs for errors

2. **Redeploy Backend:**
   - Push code to GitHub (if connected)
   - Or manually trigger deployment
   - Wait for deployment to complete

3. **Verify Backend Started:**
   - Check Railway logs
   - Should see: `Server running on port XXXX`

4. **Test Health Endpoint:**
   ```bash
   curl https://xxxmapnp-production.up.railway.app/health
   ```

---

## 📝 Expected Behavior

**Correct Flow:**
1. App calls: `POST https://xxxmapnp-production.up.railway.app/wallet/top-up`
2. Backend receives request
3. Backend creates Razorpay order
4. Backend returns: `{success: true, data: {...}}`
5. App opens Razorpay checkout

**Current (Wrong) Flow:**
1. App calls: `POST https://xxxmapnp-production.up.railway.app/wallet/top-up`
2. Request hits Expo dev server (port 8081)
3. Expo returns manifest JSON
4. App shows mock alert

---

## 🎯 Next Steps

1. **Verify backend is running** on Railway
2. **Test health endpoint** with curl
3. **Check Railway logs** for errors
4. **Redeploy backend** if needed
5. **Test payment flow** again

---

**The issue is that the backend is not accessible. Once the backend is running on Railway, the payment flow will work!**

