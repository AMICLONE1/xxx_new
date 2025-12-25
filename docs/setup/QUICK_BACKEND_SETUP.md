# Quick Backend Setup - 3 Options

## 🎯 Choose Your Path

### Option 1: Supabase Edge Functions ⭐ **EASIEST** (5 minutes)

**Best for:** Quick setup, already using Supabase

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Login
supabase login

# 3. Link to your project
supabase link --project-ref ncejoqiddhaxuetjhjrs

# 4. Create a function
supabase functions new trading-search

# 5. Edit the function (see example below)

# 6. Deploy
supabase functions deploy trading-search
```

**Your API URL will be:**
```
https://ncejoqiddhaxuetjhjrs.supabase.co/functions/v1
```

**Update `app.json`:**
```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://ncejoqiddhaxuetjhjrs.supabase.co/functions/v1"
    }
  }
}
```

---

### Option 2: Railway (Node.js Backend) ⚡ **FAST** (10 minutes)

**Best for:** Custom logic, easy deployment

1. **Create backend folder:**
```bash
mkdir backend
cd backend
npm init -y
npm install express cors @supabase/supabase-js
```

2. **Create `index.js`:**
```javascript
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.post('/trading/search', async (req, res) => {
  // Your logic here
  res.json({ success: true, data: [] });
});

app.post('/wallet/withdraw', async (req, res) => {
  // Your logic here
  res.json({ success: true, data: { requestId: 'req_123' } });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
```

3. **Deploy to Railway:**
   - Go to https://railway.app
   - New Project → Deploy from GitHub
   - Add environment variables (SUPABASE_URL, SUPABASE_ANON_KEY)
   - Get your URL: `https://your-app.railway.app`

4. **Update `app.json`:**
```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://your-app.railway.app"
    }
  }
}
```

---

### Option 3: Use Supabase Directly (No Custom Backend) ✅ **SIMPLEST**

**Best for:** Most features already work!

**What works without custom backend:**
- ✅ Authentication (Supabase Auth)
- ✅ Meter data (Supabase Database)
- ✅ Energy data (Supabase Database)
- ✅ Wallet balance (Supabase Database)
- ✅ User profiles (Supabase Database)

**What needs custom backend:**
- ⚠️ Payment processing (Razorpay)
- ⚠️ Complex trading logic
- ⚠️ KYC verification (third-party)

**For now, you can:**
1. Keep using Supabase directly for most things
2. Add custom backend only for payments
3. Use mock data for trading (already implemented)

**Update `app.json`:**
```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://ncejoqiddhaxuetjhjrs.supabase.co/rest/v1"
    }
  }
}
```

---

## 🚀 Recommended: Start with Option 3

**Why?**
- ✅ Already working
- ✅ No setup needed
- ✅ Can add custom backend later
- ✅ Most features work now

**Then add Option 1 (Edge Functions) when you need:**
- Payment processing
- Complex logic

---

## 📝 What You Need to Do Right Now

### If you want to test everything:
1. **Keep current setup** (Supabase direct)
2. **Update `app.json` line 56:**
   ```json
   "apiBaseUrl": "https://ncejoqiddhaxuetjhjrs.supabase.co/rest/v1"
   ```
3. **Test the app** - Most features will work!

### If you need payment processing:
1. **Set up Supabase Edge Functions** (Option 1)
2. **OR Deploy Node.js backend** (Option 2)
3. **Add Razorpay integration**
4. **Update `app.json` with new URL**

---

## ✅ Summary

**You have 3 options:**

1. **Supabase Edge Functions** - Easiest, serverless
2. **Custom Node.js Backend** - More control
3. **Use Supabase Directly** - Simplest, already works!

**Recommendation:** Start with Option 3, add Option 1 when needed.

---

**Need help?** See `BACKEND_API_GUIDE.md` for detailed instructions.

