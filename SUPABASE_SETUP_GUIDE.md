# Supabase Setup Guide - PowerNetPro

Complete step-by-step guide to set up Supabase for PowerNetPro mobile application.

---

## 📋 Table of Contents

1. [Why Supabase?](#1-why-supabase)
2. [Prerequisites](#2-prerequisites)
3. [Create Supabase Project](#3-create-supabase-project)
4. [Install Supabase Dependencies](#4-install-supabase-dependencies)
5. [Configure Supabase Client](#5-configure-supabase-client)
6. [Set Up Database Schema](#6-set-up-database-schema)
7. [Configure Authentication](#7-configure-authentication)
8. [Set Up Storage Buckets](#8-set-up-storage-buckets)
9. [Configure Row Level Security (RLS)](#9-configure-row-level-security-rls)
10. [Environment Variables](#10-environment-variables)
11. [Testing Supabase Integration](#11-testing-supabase-integration)
12. [Real-time Subscriptions](#12-real-time-subscriptions)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Why Supabase?

**Advantages over Firebase:**
- ✅ **PostgreSQL Database** - Full SQL database with relationships
- ✅ **Built-in Auth** - Phone, Email, OAuth, Magic Links
- ✅ **Real-time** - Built on PostgreSQL replication
- ✅ **Storage** - File storage with CDN
- ✅ **No Native Code Required** - Works with Expo managed workflow
- ✅ **Open Source** - Self-hostable
- ✅ **Better Developer Experience** - SQL instead of NoSQL
- ✅ **Free Tier** - Generous free tier for development

---

## 2. Prerequisites

Before starting, ensure you have:
- ✅ Google account or GitHub account
- ✅ Expo project set up
- ✅ Node.js and npm installed
- ✅ Basic understanding of SQL (helpful but not required)

---

## 3. Create Supabase Project

### Step 3.1: Sign Up for Supabase

1. Go to **https://supabase.com/**
2. Click **"Start your project"** or **"Sign up"**
3. Sign up with:
   - GitHub (recommended)
   - Google
   - Email

### Step 3.2: Create New Project

1. Click **"New Project"** button
2. Fill in project details:
   - **Organization:** Create new or select existing
   - **Name:** `PowerNetPro` (or your preferred name)
   - **Database Password:** Create a strong password (save it!)
     - ⚠️ **Important:** Save this password - you'll need it
   - **Region:** Choose closest to your users
     - For India: `ap-south-1` (Mumbai)
     - For US: `us-east-1` (N. Virginia)
   - **Pricing Plan:** Free tier is fine for development
3. Click **"Create new project"**

### Step 3.3: Wait for Project Setup

- Supabase will set up your project (takes 1-2 minutes)
- You'll see a progress indicator
- Wait for "Project is ready" message

### Step 3.4: Access Project Dashboard

- You'll be redirected to the project dashboard
- Note your project URL and API keys (we'll use these next)

---

## 4. Install Supabase Dependencies

### Step 4.1: Install Core Supabase Package

```bash
npm install @supabase/supabase-js
```

### Step 4.2: Install Additional Dependencies

```bash
# For React Native AsyncStorage (required for auth persistence)
npm install @react-native-async-storage/async-storage

# For Expo projects (if using Expo)
npx expo install @react-native-async-storage/async-storage
```

### Step 4.3: Verify Installation

```bash
npm list @supabase/supabase-js
```

---

## 5. Configure Supabase Client

### Step 5.1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Click **Settings** (gear icon) → **API**
3. You'll see:
   - **Project URL:** `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep secret!)

### Step 5.2: Create Supabase Client File

Create `src/services/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get Supabase config from environment variables or app.json
const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl ||
  process.env.SUPABASE_URL ||
  '';

const supabaseAnonKey =
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  process.env.SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env or app.json'
  );
}

// Create Supabase client with AsyncStorage for auth persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### Step 5.3: Update app.json

Add Supabase config to `app.json`:

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://xxxxxxxxxxxxx.supabase.co",
      "supabaseAnonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

---

## 6. Set Up Database Schema

### Step 6.1: Access SQL Editor

1. Go to Supabase Dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **"New query"**

### Step 6.2: Create Tables

Run the following SQL to create tables for PowerNetPro:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  phone_number TEXT, -- Optional, can be added later
  name TEXT,
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meters table
CREATE TABLE public.meters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  discom_name TEXT NOT NULL,
  consumer_number TEXT NOT NULL,
  meter_serial_id TEXT UNIQUE NOT NULL,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'requested')),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, consumer_number)
);

-- Energy data table
CREATE TABLE public.energy_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  meter_id UUID REFERENCES public.meters(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  generation DECIMAL(10, 2) NOT NULL DEFAULT 0, -- kW
  consumption DECIMAL(10, 2) NOT NULL DEFAULT 0, -- kW
  net_export DECIMAL(10, 2) NOT NULL DEFAULT 0, -- kW (positive = export, negative = import)
  interval_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  buyer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  energy_amount DECIMAL(10, 2) NOT NULL, -- kWh
  price_per_unit DECIMAL(10, 2) NOT NULL, -- INR
  total_price DECIMAL(10, 2) NOT NULL, -- INR
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Wallets table
CREATE TABLE public.wallets (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  energy_balance DECIMAL(10, 2) DEFAULT 0, -- kWh
  cash_balance DECIMAL(10, 2) DEFAULT 0, -- INR
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('topup', 'withdrawal', 'energy_purchase', 'energy_sale', 'refund')),
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('INR', 'kWh')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KYC documents table
CREATE TABLE public.kyc_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('aadhaar', 'pan', 'electricity_bill', 'gst', 'society_registration')),
  document_number TEXT,
  name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  rejection_reason TEXT,
  file_url TEXT, -- Supabase Storage URL
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE
);

-- Trading bot config table
CREATE TABLE public.trading_bot_configs (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  reserve_power INTEGER DEFAULT 40, -- percentage (0-100)
  min_sell_price DECIMAL(10, 2) DEFAULT 0, -- INR per unit
  priority TEXT DEFAULT 'both' CHECK (priority IN ('neighbors', 'grid', 'both')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_energy_data_meter_id ON public.energy_data(meter_id);
CREATE INDEX idx_energy_data_timestamp ON public.energy_data(timestamp);
CREATE INDEX idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_kyc_documents_user_id ON public.kyc_documents(user_id);
```

### Step 6.3: Create Functions and Triggers

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meters_updated_at BEFORE UPDATE ON public.meters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_bot_configs_updated_at BEFORE UPDATE ON public.trading_bot_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 7. Configure Authentication

### Step 7.1: Enable Email Authentication

1. Go to **Authentication** → **Providers** in Supabase Dashboard
2. Find **"Email"** provider (enabled by default)
3. Configure settings:
   - **Enable Email provider:** Should be ON (default)
   - **Confirm email:** Toggle ON (requires email verification)
   - **Secure email change:** Toggle ON (recommended)
4. Click **"Save"**

### Step 7.2: Configure Email Templates

1. Go to **Authentication** → **Email Templates** in Supabase Dashboard
2. Customize the following templates:

**OTP Email Template:**
- Subject: `Your PowerNetPro verification code`
- Body: Customize with your branding
- The OTP code will be automatically inserted

**Magic Link Template (Optional):**
- Can be used as an alternative to OTP
- Subject: `Sign in to PowerNetPro`

3. **Email Settings:**
   - Supabase provides free email sending (up to 4 emails/hour on free tier)
   - For production, configure custom SMTP:
     - Go to **Settings** → **Auth** → **SMTP Settings**
     - Add your SMTP credentials (Gmail, SendGrid, etc.)

**Note:** Email authentication is free and doesn't require external services like SMS providers.

### Step 7.3: Configure Email Templates (Optional)

1. Go to **Authentication** → **Email Templates**
2. Customize templates for:
   - Magic Link
   - OTP
   - Password Reset
   - Email Change

---

## 8. Set Up Storage Buckets

### Step 8.1: Create Storage Buckets

1. Go to **Storage** in Supabase Dashboard
2. Click **"New bucket"**

Create these buckets:

**1. KYC Documents Bucket:**
- **Name:** `kyc-documents`
- **Public:** OFF (private)
- **File size limit:** 10 MB
- **Allowed MIME types:** `image/jpeg, image/png, application/pdf`

**2. Electricity Bills Bucket:**
- **Name:** `electricity-bills`
- **Public:** OFF (private)
- **File size limit:** 10 MB
- **Allowed MIME types:** `image/jpeg, image/png, application/pdf`

**3. Profile Images Bucket (Optional):**
- **Name:** `profile-images`
- **Public:** ON (public)
- **File size limit:** 5 MB
- **Allowed MIME types:** `image/jpeg, image/png`

### Step 8.2: Configure Storage Policies

Go to **Storage** → **Policies** and create policies:

**For kyc-documents bucket:**
```sql
-- Users can upload their own KYC documents
CREATE POLICY "Users can upload own KYC documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own KYC documents
CREATE POLICY "Users can view own KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## 9. Configure Row Level Security (RLS)

### Step 9.1: Enable RLS on Tables

Run this SQL in the SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_bot_configs ENABLE ROW LEVEL SECURITY;
```

### Step 9.2: Create RLS Policies

```sql
-- Users can read and update their own profile
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Users can manage their own meters
CREATE POLICY "Users can view own meters"
ON public.meters FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own meters"
ON public.meters FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own meters"
ON public.meters FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Users can view their own energy data
CREATE POLICY "Users can view own energy data"
ON public.energy_data FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.meters
    WHERE meters.id = energy_data.meter_id
    AND meters.user_id = auth.uid()
  )
);

-- Users can view their own orders
CREATE POLICY "Users can view own orders"
ON public.orders FOR SELECT
TO authenticated
USING (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "Users can create orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (buyer_id = auth.uid());

-- Users can view and update their own wallet
CREATE POLICY "Users can view own wallet"
ON public.wallets FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own wallet"
ON public.wallets FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can manage their own KYC documents
CREATE POLICY "Users can manage own KYC documents"
ON public.kyc_documents FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can manage their own trading bot config
CREATE POLICY "Users can manage own trading bot config"
ON public.trading_bot_configs FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

---

## 10. Environment Variables

### Step 10.1: Add to .env File

Create or update `.env` file in project root:

```env
# Supabase Configuration
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Keep secret! Only for server-side
```

### Step 10.2: Get Values from Supabase

1. Go to Supabase Dashboard
2. Click **Settings** → **API**
3. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server-side only!)

---

## 11. Testing Supabase Integration

### Step 11.1: Test Authentication

Create `src/services/supabase/testAuth.ts`:

```typescript
import { supabase } from './client';

export const testEmailAuth = async (email: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
    });
    
    if (error) throw error;
    console.log('OTP sent successfully:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('Email auth test failed:', error);
    return { success: false, error: error.message };
  }
};

export const testVerifyOTP = async (email: string, token: string) => {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.toLowerCase().trim(),
      token,
      type: 'email',
    });
    
    if (error) throw error;
    console.log('OTP verified successfully:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('OTP verification failed:', error);
    return { success: false, error: error.message };
  }
};
```

### Step 11.2: Test Database

```typescript
import { supabase } from './client';

export const testDatabase = async () => {
  try {
    // Test read
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    console.log('Database test successful:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('Database test failed:', error);
    return { success: false, error: error.message };
  }
};
```

### Step 11.3: Test Storage

```typescript
import { supabase } from './client';

export const testStorage = async (file: Blob, fileName: string) => {
  try {
    const { data, error } = await supabase.storage
      .from('kyc-documents')
      .upload(`${Date.now()}_${fileName}`, file);
    
    if (error) throw error;
    console.log('Storage upload successful:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('Storage test failed:', error);
    return { success: false, error: error.message };
  }
};
```

---

## 12. Real-time Subscriptions

### Step 12.1: Subscribe to Changes

Example for real-time energy data:

```typescript
import { supabase } from './client';

export const subscribeToEnergyData = (meterId: string, callback: (data: any) => void) => {
  const channel = supabase
    .channel(`energy_data:${meterId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'energy_data',
        filter: `meter_id=eq.${meterId}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
```

### Step 12.2: Enable Realtime for Tables

1. Go to **Database** → **Replication** in Supabase Dashboard
2. Enable replication for tables you want real-time updates:
   - `energy_data`
   - `orders`
   - `transactions`

---

## 13. Troubleshooting

### Issue: "Missing Supabase credentials"

**Solution:**
- Check `.env` file has `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Or check `app.json` has values in `extra` section
- Restart Expo dev server after adding variables

### Issue: "Row Level Security policy violation"

**Solutions:**
1. Check RLS policies are created correctly
2. Verify user is authenticated: `await supabase.auth.getUser()`
3. Check policy conditions match your query

### Issue: "Storage upload fails"

**Checklist:**
- [ ] Bucket exists and is configured
- [ ] Storage policies allow upload
- [ ] File size is within limit
- [ ] MIME type is allowed
- [ ] User is authenticated

### Issue: "Email auth not working"

**Checklist:**
- [ ] Email provider is enabled in Supabase
- [ ] Email format is valid (user@example.com)
- [ ] Check spam folder for OTP email
- [ ] Verify email sending limits (4/hour on free tier)
- [ ] Check Supabase logs for errors
- [ ] If using custom SMTP, verify SMTP credentials

### Issue: "Real-time not working"

**Solutions:**
1. Enable replication for the table
2. Check channel subscription is active
3. Verify RLS policies allow read access
4. Check network connection

---

## 📝 Quick Reference

### Supabase Dashboard URLs

- **Main Dashboard:** https://app.supabase.com/project/YOUR_PROJECT_ID
- **API Settings:** https://app.supabase.com/project/YOUR_PROJECT_ID/settings/api
- **Database:** https://app.supabase.com/project/YOUR_PROJECT_ID/editor
- **Authentication:** https://app.supabase.com/project/YOUR_PROJECT_ID/auth/users
- **Storage:** https://app.supabase.com/project/YOUR_PROJECT_ID/storage/buckets
- **SQL Editor:** https://app.supabase.com/project/YOUR_PROJECT_ID/sql/new

### Important Files

| File | Location | Purpose |
|------|----------|---------|
| `src/services/supabase/client.ts` | `src/services/supabase/` | Supabase client initialization |
| `.env` | Root | Environment variables |
| `app.json` | Root | Expo config with Supabase values |

### Common Commands

```bash
# Install Supabase
npm install @supabase/supabase-js @react-native-async-storage/async-storage

# Test connection
# Use test functions in src/services/supabase/testAuth.ts
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Supabase project created
- [ ] Database tables created
- [ ] RLS policies configured
- [ ] Storage buckets created
- [ ] Phone authentication enabled
- [ ] Supabase packages installed
- [ ] Client configured in code
- [ ] Environment variables set
- [ ] Test authentication works
- [ ] Test database read/write works
- [ ] Test storage upload works
- [ ] Real-time subscriptions work (if needed)

---

## 🎯 Next Steps

After Supabase is set up:

1. **Update Auth Service:**
   - Replace API calls with Supabase Auth
   - Implement phone OTP flow

2. **Update Database Services:**
   - Replace API calls with Supabase queries
   - Use Supabase real-time for live data

3. **Update Storage Services:**
   - Replace file uploads with Supabase Storage
   - Generate public URLs for images

4. **Set up Backend Functions (Optional):**
   - Use Supabase Edge Functions for serverless logic
   - Handle webhooks and background jobs

---

**Need Help?**
- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com/
- React Native Guide: https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native

