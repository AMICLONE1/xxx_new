# 🚀 Deploy Backend to Railway (Separate Service)

## ⚠️ Problem Identified

Your Railway URL `https://xxxmapnp-production.up.railway.app` is currently pointing to the **Expo dev server**, not the backend API.

**You need to deploy the backend as a separate Railway service!**

---

## ✅ Solution: Deploy Backend as Separate Service

### Step 1: Create New Railway Service for Backend

1. **Go to Railway Dashboard:**
   - https://railway.app
   - Login to your account

2. **Create New Service:**
   - Click **"New Project"** (or add to existing project)
   - Select **"Empty Project"** or **"Deploy from GitHub repo"**

3. **If using GitHub:**
   - Select your repository
   - Railway will detect the `backend/` folder
   - **OR** select **"Deploy from GitHub repo"** and choose the `backend` folder

4. **If not using GitHub:**
   - Select **"Empty Project"**
   - Connect your GitHub repo later
   - Or use Railway CLI

---

### Step 2: Configure Backend Service

**Railway will automatically:**
- Detect `backend/package.json`
- Install dependencies
- Run `npm start` (which runs `node dist/index.js`)

**But you need to:**
1. Set **Root Directory** to `backend` (if not auto-detected)
2. Set **Build Command** to `npm run build` (if not auto-detected)
3. Set **Start Command** to `npm start` (if not auto-detected)

**In Railway Dashboard:**
- Go to your backend service
- Click **Settings** → **Service**
- Set **Root Directory:** `backend`
- Set **Build Command:** `npm run build` (or leave default)
- Set **Start Command:** `npm start` (or leave default)

---

### Step 3: Add Environment Variables

**In Railway Dashboard → Your Backend Service → Variables:**

Add these variables:

```env
PORT=3000
NODE_ENV=production

SUPABASE_URL=https://ncejoqiddhaxuetjhjrs.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here (optional)

RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret_here

CORS_ORIGIN=*
```

**Important:**
- Get `SUPABASE_ANON_KEY` from Supabase Dashboard → Settings → API
- Get `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` from Razorpay Dashboard → Settings → API Keys

---

### Step 4: Get Backend URL

**After deployment:**
1. Go to your backend service in Railway
2. Click **Settings** → **Networking**
3. Click **"Generate Domain"** (if not already generated)
4. Copy the **Public Domain** URL

**Example:**
```
https://powernetpro-backend-production.up.railway.app
```

**This is your NEW backend URL!**

---

### Step 5: Update Mobile App

**Update `app.json`:**

```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://powernetpro-backend-production.up.railway.app"
    }
  }
}
```

**Replace with your actual backend URL from Step 4.**

---

### Step 6: Test Backend

**Test health endpoint:**
```bash
curl https://your-backend-url.up.railway.app/health
```

**Should return:**
```json
{"status":"ok"}
```

**If you still get Expo manifest:**
- Wrong URL (check Step 4)
- Backend not deployed (check Railway logs)
- Backend crashed (check Railway logs)

---

## 🔍 Verify Backend is Running

### Check Railway Logs:

1. Go to Railway Dashboard
2. Open your **backend service**
3. Click **"Logs"** tab
4. Look for:
   ```
   Server running on port 3000
   Razorpay initialized (if keys are set)
   ```

### Test Endpoints:

```bash
# Health check
curl https://your-backend-url.up.railway.app/health

# Should return: {"status":"ok"}
```

---

## 🐛 Troubleshooting

### Backend Not Starting?

**Check Railway Logs:**
- Look for error messages
- Common issues:
  - Missing environment variables
  - TypeScript compilation errors
  - Port conflicts

**Fix:**
1. Check all environment variables are set
2. Verify `npm run build` succeeds locally
3. Check Railway logs for specific errors

---

### Still Getting Expo Manifest?

**Possible causes:**
1. **Wrong URL** - Using Expo dev server URL instead of backend URL
2. **Backend not deployed** - Backend service doesn't exist
3. **Backend crashed** - Check Railway logs

**Fix:**
1. Verify backend URL in `app.json`
2. Check Railway dashboard for backend service
3. Check Railway logs for errors

---

### Build Fails?

**Common issues:**
- TypeScript errors
- Missing dependencies
- Build command wrong

**Fix:**
1. Run `npm run build` locally to check for errors
2. Fix any TypeScript errors
3. Verify `package.json` has all dependencies

---

## 📝 Quick Checklist

- [ ] Backend service created in Railway
- [ ] Root directory set to `backend`
- [ ] Environment variables added
- [ ] Backend deployed successfully
- [ ] Backend URL copied
- [ ] `app.json` updated with backend URL
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] Test payment flow in app

---

## 🎯 Next Steps

After deploying:

1. **Test backend health:**
   ```bash
   curl https://your-backend-url.up.railway.app/health
   ```

2. **Update app.json** with backend URL

3. **Restart Expo:**
   ```bash
   npx expo start --clear
   ```

4. **Test payment flow** in the app

---

**Once the backend is deployed on a separate Railway service, the payment flow will work!**

