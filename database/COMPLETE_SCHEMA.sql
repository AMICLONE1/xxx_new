-- Complete Supabase Database Schema for PowerNetPro
-- Run this in your Supabase SQL Editor to create/update all tables

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  phone_number TEXT UNIQUE,
  name TEXT,
  profile_picture_url TEXT,
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- METERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.meters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================
-- ENERGY DATA TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.energy_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meter_id UUID REFERENCES public.meters(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  generation DECIMAL(10, 2) NOT NULL DEFAULT 0,
  consumption DECIMAL(10, 2) NOT NULL DEFAULT 0,
  net_export DECIMAL(10, 2) NOT NULL DEFAULT 0,
  interval_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  energy_amount DECIMAL(10, 2) NOT NULL,
  price_per_unit DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- WALLETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.wallets (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  energy_balance DECIMAL(10, 2) DEFAULT 0,
  cash_balance DECIMAL(10, 2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('topup', 'withdrawal', 'energy_purchase', 'energy_sale', 'refund')),
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('INR', 'kWh')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- KYC DOCUMENTS TABLE (WITH ALL COLUMNS)
-- ============================================
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('aadhaar', 'pan', 'electricity_bill', 'gst', 'society_registration')),
  document_number TEXT,
  name TEXT,
  date_of_birth TEXT,
  address TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  rejection_reason TEXT,
  file_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- TRADING BOT CONFIG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.trading_bot_configs (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  reserve_power INTEGER DEFAULT 40,
  min_sell_price DECIMAL(10, 2) DEFAULT 0,
  priority TEXT DEFAULT 'both' CHECK (priority IN ('neighbors', 'grid', 'both')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SELLERS TABLE (For Energy Trading)
-- ============================================
CREATE TABLE IF NOT EXISTS public.sellers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  location JSONB, -- { lat: number, lng: number, address?: string }
  price_per_unit DECIMAL(10, 2) NOT NULL,
  available_energy DECIMAL(10, 2) DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_sales DECIMAL(10, 2) DEFAULT 0,
  green_energy BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WITHDRAWALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  request_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  bank_account_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- BANK ACCOUNTS TABLE (For Withdrawals)
-- ============================================
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  account_number TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  account_holder_name TEXT NOT NULL,
  bank_name TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- KYC_DATA TABLE (Backend uses this, frontend uses kyc_documents)
-- ============================================
CREATE TABLE IF NOT EXISTS public.kyc_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('aadhaar', 'pan', 'electricity_bill', 'gst', 'society_registration')),
  document_url TEXT,
  extracted_data JSONB, -- Stores extracted OCR data
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================
DO $$ 
BEGIN
  -- Add date_of_birth to kyc_documents if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kyc_documents' 
    AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE public.kyc_documents ADD COLUMN date_of_birth TEXT;
  END IF;

  -- Add address to kyc_documents if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kyc_documents' 
    AND column_name = 'address'
  ) THEN
    ALTER TABLE public.kyc_documents ADD COLUMN address TEXT;
  END IF;

  -- Add file_url to kyc_documents if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kyc_documents' 
    AND column_name = 'file_url'
  ) THEN
    ALTER TABLE public.kyc_documents ADD COLUMN file_url TEXT;
  END IF;

  -- Add profile_picture_url to users if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'profile_picture_url'
  ) THEN
    ALTER TABLE public.users ADD COLUMN profile_picture_url TEXT;
  END IF;
END $$;

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_energy_data_meter_id ON public.energy_data(meter_id);
CREATE INDEX IF NOT EXISTS idx_energy_data_timestamp ON public.energy_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON public.kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON public.kyc_documents(status);
CREATE INDEX IF NOT EXISTS idx_kyc_data_user_id ON public.kyc_data(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_data_status ON public.kyc_data(status);
CREATE INDEX IF NOT EXISTS idx_meters_user_id ON public.meters(user_id);
CREATE INDEX IF NOT EXISTS idx_sellers_user_id ON public.sellers(user_id);
CREATE INDEX IF NOT EXISTS idx_sellers_location ON public.sellers USING GIN(location);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_request_id ON public.withdrawals(request_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON public.bank_accounts(user_id);

-- ============================================
-- VERIFY SCHEMA
-- ============================================
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN (
  'users', 
  'meters', 
  'energy_data', 
  'orders', 
  'wallets', 
  'transactions', 
  'kyc_documents', 
  'kyc_data',
  'trading_bot_configs',
  'sellers',
  'withdrawals',
  'bank_accounts'
)
ORDER BY table_name, ordinal_position;

-- ============================================
-- SUMMARY OF ALL TABLES
-- ============================================
-- Core Tables:
--   1. users - User accounts and profiles
--   2. meters - Energy meter registrations
--   3. energy_data - Energy generation/consumption data
--   4. orders - Energy trading orders
--   5. wallets - User wallet balances
--   6. transactions - Financial transactions
--   7. kyc_documents - KYC document submissions (frontend)
--   8. kyc_data - KYC data storage (backend)
--   9. trading_bot_configs - Trading bot settings
--   10. sellers - Energy sellers for marketplace
--   11. withdrawals - Withdrawal requests
--   12. bank_accounts - User bank account details

