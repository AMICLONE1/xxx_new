# Deployment Guide - PowerNetPro Backend

## 🚀 Quick Deploy to Railway

### Step 1: Prepare Repository

Make sure your backend code is in a `backend/` folder in your repository.

### Step 2: Deploy to Railway

1. Go to https://railway.app
2. Sign up/Login with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Select your repository
6. Railway will detect the backend folder

### Step 3: Configure

Railway will automatically:
- Detect `package.json`
- Install dependencies
- Run `npm start`

### Step 4: Add Environment Variables

In Railway dashboard:
1. Go to Variables tab
2. Add these variables:

```
SUPABASE_URL=https://ncejoqiddhaxuetjhjrs.supabase.co
SUPABASE_ANON_KEY=your_key_here
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret_here
NODE_ENV=production
```

### Step 5: Get Your URL

Railway will provide a URL like:
```
https://powernetpro-backend-production.up.railway.app
```

### Step 6: Update Mobile App

Update `app.json`:
```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://powernetpro-backend-production.up.railway.app"
    }
  }
}
```

---

## 🚀 Quick Deploy to Render

### Step 1: Create Web Service

1. Go to https://render.com
2. Sign up/Login
3. Click "New +" → "Web Service"
4. Connect GitHub repository

### Step 2: Configure

- **Name:** powernetpro-backend
- **Region:** Choose closest to you
- **Branch:** main
- **Root Directory:** backend
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Environment:** Node

### Step 3: Add Environment Variables

Add all variables from `.env.example`

### Step 4: Deploy

Click "Create Web Service" and wait for deployment.

### Step 5: Get Your URL

Render will provide a URL like:
```
https://powernetpro-backend.onrender.com
```

---

## ✅ Verify Deployment

Test your deployed backend:

```bash
curl https://your-backend-url.com/health
```

Should return:
```json
{
  "success": true,
  "message": "PowerNetPro Backend API is running"
}
```

---

## 🔒 Production Checklist

- [ ] Environment variables set
- [ ] NODE_ENV=production
- [ ] HTTPS enabled (automatic on Railway/Render)
- [ ] CORS configured
- [ ] Error logging enabled
- [ ] Rate limiting (optional)
- [ ] Monitoring set up (optional)

---

**That's it!** Your backend is now live! 🎉

