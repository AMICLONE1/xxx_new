# Custom Backend Setup Guide - Option 2

## 🎯 Overview

This guide will help you set up a custom Node.js/Express backend server for PowerNetPro.

**Time Required:** 30-60 minutes  
**Difficulty:** Medium  
**Cost:** Free tier available

---

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn
- GitHub account (for deployment)
- Supabase account (already have)
- Razorpay account (optional, for payments)

---

## 🚀 Step-by-Step Setup

### Step 1: Create Backend Directory

```bash
cd D:\PowerNetPro\xxx_MA_PNP
mkdir backend
cd backend
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- Express (web framework)
- CORS (cross-origin requests)
- Supabase client
- Razorpay SDK
- TypeScript and dev tools

### Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` file:
   ```env
   PORT=3000
   NODE_ENV=development
   
   # Supabase (get from app.json or Supabase dashboard)
   SUPABASE_URL=https://ncejoqiddhaxuetjhjrs.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZWpvcWlkZGhheHVldGpoanJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjA3ODQsImV4cCI6MjA4MTk5Njc4NH0.w9tsVgdxzb52_n58XUJ8i76u6Rm0cY_Pw_Q-vEc9T7I
   
   # Razorpay (get from https://razorpay.com → Settings → API Keys)
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_razorpay_secret_here
   ```

### Step 4: Test Locally

```bash
npm run dev
```

You should see:
```
🚀 PowerNetPro Backend API running on port 3000
📍 Health check: http://localhost:3000/health
```

Test it:
```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "success": true,
  "message": "PowerNetPro Backend API is running",
  "timestamp": "2024-12-..."
}
```

---

## 🚢 Deployment Options

### Option A: Railway (Easiest) ⭐

1. **Sign up at Railway:**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Select your repository
   - Select the `backend` folder

3. **Configure Environment Variables:**
   - Go to Variables tab
   - Add all variables from `.env`:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `RAZORPAY_KEY_ID`
     - `RAZORPAY_KEY_SECRET`
     - `PORT` (Railway sets this automatically)
     - `NODE_ENV=production`

4. **Deploy:**
   - Railway will automatically detect `package.json`
   - It will run `npm install` and `npm start`
   - Wait for deployment to complete

5. **Get Your URL:**
   - Railway will give you a URL like: `https://your-app.railway.app`
   - Copy this URL

---

### Option B: Render

1. **Sign up at Render:**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create New Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `backend` folder

3. **Configure:**
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment:** Node

4. **Add Environment Variables:**
   - Add all variables from `.env`

5. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment

6. **Get Your URL:**
   - Render will give you a URL like: `https://your-app.onrender.com`

---

## 🔧 Update Mobile App

Once deployed, update `app.json`:

```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://your-app.railway.app"
    }
  }
}
```

Or if using Render:
```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://your-app.onrender.com"
    }
  }
}
```

---

## ✅ Testing

### Test Health Endpoint

```bash
curl https://your-app.railway.app/health
```

### Test from Mobile App

1. Update `app.json` with your backend URL
2. Restart Expo: `npm start -- --clear`
3. Test features:
   - Place an order
   - Request withdrawal
   - Search sellers

---

## 🔑 Getting Razorpay Keys

1. **Sign up:** https://razorpay.com
2. **Go to:** Settings → API Keys
3. **Generate Test Keys:**
   - Click "Generate Test Key"
   - Copy Key ID and Key Secret
4. **Add to `.env`:**
   ```env
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_secret_here
   ```

**Note:** For production, generate Live Keys and update environment variables.

---

## 📝 Database Tables Needed

Make sure these tables exist in Supabase:

- `sellers` - Energy sellers
- `orders` - Trading orders
- `wallets` - User wallets
- `withdrawals` - Withdrawal requests
- `kyc_data` - KYC information

See `docs/setup/SUPABASE_SETUP.md` for database schema.

---

## 🐛 Troubleshooting

### Server won't start
- Check if port 3000 is available
- Verify all environment variables are set
- Check Node.js version: `node --version` (should be 18+)

### Authentication errors
- Verify Supabase URL and keys are correct
- Check token is being sent in Authorization header

### Payment errors
- Verify Razorpay keys are correct
- Check if keys are test keys (for development)

### Deployment issues
- Check build logs in Railway/Render
- Verify environment variables are set
- Check Node.js version in deployment settings

---

## 🎉 Next Steps

1. ✅ Deploy backend
2. ✅ Update `app.json` with backend URL
3. ✅ Test all endpoints
4. ✅ Add Razorpay keys (for payments)
5. ✅ Test payment flow

---

## 📚 Additional Resources

- Express.js Docs: https://expressjs.com
- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
- Razorpay Docs: https://razorpay.com/docs/api/

---

**Need Help?** Check the main `BACKEND_API_GUIDE.md` for more details.

