# Backend API Guide - PowerNetPro

## 🤔 What is a Backend API?

A **Backend API** is a server that:
- Stores and manages your data
- Handles business logic
- Processes payments
- Manages user authentication
- Connects to third-party services (Razorpay, etc.)

Think of it as the "brain" of your app that runs on a server, separate from your mobile app.

---

## ✅ Good News: You Already Have a Backend!

**You're already using Supabase**, which IS a backend! 🎉

### What Supabase Provides:
- ✅ **Database** (PostgreSQL) - Stores all your data
- ✅ **Authentication** - User login/signup
- ✅ **Storage** - File uploads (KYC documents, etc.)
- ✅ **Real-time** - Live data updates
- ✅ **API** - Automatic REST API for your database

**Your Supabase URL:** `https://ncejoqiddhaxuetjhjrs.supabase.co`  
**Status:** ✅ Already configured!

---

## 📋 What You Still Need

While Supabase handles most things, you need a **custom backend API** for:

1. **Payment Processing** (Razorpay integration)
2. **Trading Logic** (Order matching, seller discovery)
3. **KYC Verification** (Third-party verification services)
4. **Complex Business Logic** (Trading bot, analytics)

---

## 🎯 Three Options for Backend API

### **Option 1: Supabase Edge Functions** ⭐ **RECOMMENDED (Easiest)**

**What it is:** Serverless functions that run on Supabase's infrastructure

**Pros:**
- ✅ No separate server to manage
- ✅ Scales automatically
- ✅ Free tier available
- ✅ Easy to deploy
- ✅ Already using Supabase

**Cons:**
- ⚠️ Limited to Node.js/Deno
- ⚠️ 10-second timeout (can be extended)

**Best for:** Most use cases, especially if you're already using Supabase

---

### **Option 2: Custom Backend Server** (Node.js/Python)

**What it is:** Your own server running on cloud (AWS, Railway, Render, etc.)

**Pros:**
- ✅ Full control
- ✅ Any language (Node.js, Python, Go, etc.)
- ✅ No timeout limits
- ✅ Can handle complex logic

**Cons:**
- ⚠️ More setup required
- ⚠️ Need to manage server
- ⚠️ Costs money (after free tier)

**Best for:** Complex applications, high traffic

---

### **Option 3: Backend-as-a-Service (BaaS)** (Firebase, AWS Amplify)

**What it is:** Pre-built backend services

**Pros:**
- ✅ Quick setup
- ✅ Managed infrastructure

**Cons:**
- ⚠️ Less flexible
- ⚠️ Vendor lock-in
- ⚠️ Can be expensive

**Best for:** Rapid prototyping

---

## 🚀 Recommended: Supabase Edge Functions

Since you're already using Supabase, this is the easiest option!

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

### Step 3: Initialize Edge Functions

```bash
supabase functions init
```

### Step 4: Create Your First Function

Example: `supabase/functions/trading-search/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { location, minPrice, maxPrice } = await req.json()
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Your business logic here
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .gte('price_per_unit', minPrice)
      .lte('price_per_unit', maxPrice)
    
    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500 }
    )
  }
})
```

### Step 5: Deploy Function

```bash
supabase functions deploy trading-search
```

### Step 6: Get Function URL

Your function will be available at:
```
https://ncejoqiddhaxuetjhjrs.supabase.co/functions/v1/trading-search
```

### Step 7: Update app.json

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

## 🛠️ Alternative: Custom Node.js Backend

If you prefer a custom backend, here's a quick setup:

### Step 1: Create Backend Project

```bash
mkdir powernetpro-backend
cd powernetpro-backend
npm init -y
npm install express cors dotenv
npm install -D @types/node typescript ts-node
```

### Step 2: Create `server.ts`

```typescript
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Trading search endpoint
app.post('/trading/search', async (req, res) => {
  try {
    const { location, minPrice, maxPrice } = req.body;
    
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .gte('price_per_unit', minPrice)
      .lte('price_per_unit', maxPrice);
    
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Wallet withdrawal endpoint
app.post('/wallet/withdraw', async (req, res) => {
  try {
    const { amount, bankAccountId } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    // Verify user from token
    const { data: { user } } = await supabase.auth.getUser(token!);
    
    // Process withdrawal
    // ... your logic here
    
    res.json({ 
      success: true, 
      data: { requestId: `req_${Date.now()}`, status: 'pending' } 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Step 3: Deploy to Cloud

**Option A: Railway** (Easiest)
1. Go to https://railway.app
2. Connect GitHub repo
3. Deploy automatically

**Option B: Render**
1. Go to https://render.com
2. Create new Web Service
3. Connect repo and deploy

**Option C: AWS/Google Cloud**
- More complex, but more control

---

## 📋 Required Endpoints

Here are the endpoints you need to implement:

### Trading
- `POST /trading/search` - Search for energy sellers
- `POST /trading/orders` - Create order
- `GET /trading/orders/:id/status` - Get order status

### Wallet
- `POST /wallet/top-up` - Initiate top-up
- `POST /wallet/withdraw` - Request withdrawal
- `GET /wallet/withdraw/:id/status` - Check withdrawal status

### Payments
- `POST /payments/initiate` - Start Razorpay payment
- `POST /payments/verify` - Verify payment

### KYC
- `POST /kyc/documents` - Upload KYC document
- `POST /kyc/liveness` - Submit liveness check
- `GET /kyc/status` - Get KYC status

---

## 🎯 Quick Start Recommendation

### For Development/Testing:
1. **Use Supabase Edge Functions** - Easiest, free tier
2. Start with one function (e.g., `/trading/search`)
3. Test it works
4. Add more functions as needed

### For Production:
1. **Use Supabase Edge Functions** (if simple)
2. **OR Custom Backend** (if complex logic needed)
3. Deploy to Railway/Render (easy) or AWS (scalable)

---

## 📚 Resources

### Supabase Edge Functions:
- Docs: https://supabase.com/docs/guides/functions
- Examples: https://github.com/supabase/supabase/tree/master/examples/edge-functions

### Node.js Backend:
- Express.js: https://expressjs.com
- Railway: https://railway.app
- Render: https://render.com

### Payment Integration:
- Razorpay Docs: https://razorpay.com/docs/api/
- Razorpay Node.js SDK: https://github.com/razorpay/razorpay-node

---

## ✅ Next Steps

1. **Choose your approach:**
   - ⭐ Supabase Edge Functions (Recommended)
   - Custom Node.js backend

2. **Start with one endpoint:**
   - `/trading/search` is a good starting point

3. **Test it:**
   - Update `app.json` with your API URL
   - Test from the app

4. **Add more endpoints:**
   - Gradually add other endpoints
   - Test each one

---

## 💡 Pro Tip

**For now, you can use Supabase directly for most things!**

Many endpoints can work directly with Supabase:
- ✅ Meter data - Already using Supabase
- ✅ Energy data - Already using Supabase
- ✅ Wallet balance - Can use Supabase
- ✅ User data - Already using Supabase

You only need a custom backend for:
- Payment processing (Razorpay)
- Complex trading logic
- Third-party integrations

---

**Last Updated:** December 2024

