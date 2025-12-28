# Complete Database Schema Details

## Overview
This document lists all database tables and columns used in the PowerNetPro application.

## Tables

### 1. users
**Purpose:** User accounts and profile information

**Columns:**
- `id` (UUID, PRIMARY KEY) - User ID from Supabase Auth
- `email` (TEXT, UNIQUE) - User email address
- `phone_number` (TEXT, UNIQUE, NULLABLE) - Phone number (optional)
- `name` (TEXT, NULLABLE) - User's full name
- `profile_picture_url` (TEXT, NULLABLE) - URL to profile picture in Supabase Storage
- `kyc_status` (TEXT) - KYC verification status: 'pending', 'verified', 'rejected'
- `created_at` (TIMESTAMP) - Account creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Used in:**
- `src/services/supabase/authService.ts` - User authentication and profile management
- `src/services/supabase/databaseService.ts` - User data operations

---

### 2. meters
**Purpose:** Energy meter registrations

**Columns:**
- `id` (UUID, PRIMARY KEY) - Meter ID
- `user_id` (UUID, FOREIGN KEY → users.id) - Owner user ID
- `discom_name` (TEXT) - DISCOM name (e.g., MSEDCL, Tata Power)
- `consumer_number` (TEXT) - Consumer number
- `meter_serial_id` (TEXT, UNIQUE) - Meter serial ID
- `verification_status` (TEXT) - Status: 'pending', 'verified', 'rejected', 'requested'
- `address` (TEXT, NULLABLE) - Meter installation address
- `created_at` (TIMESTAMP) - Registration timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp
- UNIQUE(user_id, consumer_number)

**Used in:**
- `src/services/supabase/databaseService.ts` - Meter CRUD operations
- `src/screens/meter/MeterRegistrationScreen.tsx` - Meter registration

---

### 3. energy_data
**Purpose:** Energy generation and consumption data

**Columns:**
- `id` (UUID, PRIMARY KEY) - Data point ID
- `meter_id` (UUID, FOREIGN KEY → meters.id) - Associated meter
- `timestamp` (TIMESTAMP) - Data timestamp
- `generation` (DECIMAL(10,2)) - Energy generation in kW
- `consumption` (DECIMAL(10,2)) - Energy consumption in kW
- `net_export` (DECIMAL(10,2)) - Net export (positive = export, negative = import)
- `interval_minutes` (INTEGER) - Data interval (default: 15 minutes)
- `created_at` (TIMESTAMP) - Record creation timestamp

**Used in:**
- `src/services/supabase/databaseService.ts` - Energy data queries
- `src/screens/home/HomeScreen.tsx` - Dashboard display
- `src/screens/home/EnergyChartScreen.tsx` - Chart visualization

---

### 4. orders
**Purpose:** Energy trading orders

**Columns:**
- `id` (UUID, PRIMARY KEY) - Order ID
- `buyer_id` (UUID, FOREIGN KEY → users.id) - Buyer user ID
- `seller_id` (UUID, FOREIGN KEY → users.id) - Seller user ID
- `energy_amount` (DECIMAL(10,2)) - Energy amount in kWh
- `price_per_unit` (DECIMAL(10,2)) - Price per kWh in INR
- `total_price` (DECIMAL(10,2)) - Total order price in INR
- `status` (TEXT) - Order status: 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'
- `created_at` (TIMESTAMP) - Order creation timestamp
- `completed_at` (TIMESTAMP, NULLABLE) - Completion timestamp

**Used in:**
- `src/services/supabase/databaseService.ts` - Order management
- `src/screens/trading/OrderScreen.tsx` - Order placement
- `backend/src/index.ts` - Backend order endpoints

---

### 5. wallets
**Purpose:** User wallet balances

**Columns:**
- `user_id` (UUID, PRIMARY KEY, FOREIGN KEY → users.id) - User ID
- `energy_balance` (DECIMAL(10,2)) - Energy balance in kWh
- `cash_balance` (DECIMAL(10,2)) - Cash balance in INR
- `updated_at` (TIMESTAMP) - Last balance update timestamp

**Used in:**
- `src/services/supabase/databaseService.ts` - Wallet operations
- `src/screens/wallet/WalletScreen.tsx` - Wallet display
- `src/screens/wallet/TopUpScreen.tsx` - Top-up operations
- `src/screens/wallet/WithdrawScreen.tsx` - Withdrawal operations

---

### 6. transactions
**Purpose:** Financial transaction history

**Columns:**
- `id` (UUID, PRIMARY KEY) - Transaction ID
- `user_id` (UUID, FOREIGN KEY → users.id) - User ID
- `type` (TEXT) - Transaction type: 'topup', 'withdrawal', 'energy_purchase', 'energy_sale', 'refund'
- `amount` (DECIMAL(10,2)) - Transaction amount
- `currency` (TEXT) - Currency: 'INR' or 'kWh'
- `status` (TEXT) - Transaction status: 'pending', 'completed', 'failed'
- `description` (TEXT, NULLABLE) - Transaction description
- `created_at` (TIMESTAMP) - Transaction timestamp

**Used in:**
- `src/services/supabase/databaseService.ts` - Transaction history
- `src/screens/wallet/WalletScreen.tsx` - Transaction list

---

### 7. kyc_documents
**Purpose:** KYC document submissions (Frontend)

**Columns:**
- `id` (UUID, PRIMARY KEY) - Document ID
- `user_id` (UUID, FOREIGN KEY → users.id) - User ID
- `document_type` (TEXT) - Document type: 'aadhaar', 'pan', 'electricity_bill', 'gst', 'society_registration'
- `document_number` (TEXT, NULLABLE) - Document number (e.g., Aadhaar number)
- `name` (TEXT, NULLABLE) - Name extracted from document
- `date_of_birth` (TEXT, NULLABLE) - Date of birth from document
- `address` (TEXT, NULLABLE) - Address from document
- `status` (TEXT) - Verification status: 'pending', 'verified', 'rejected'
- `rejection_reason` (TEXT, NULLABLE) - Reason for rejection if rejected
- `file_url` (TEXT, NULLABLE) - URL to document file in Supabase Storage
- `submitted_at` (TIMESTAMP) - Submission timestamp
- `verified_at` (TIMESTAMP, NULLABLE) - Verification timestamp

**Used in:**
- `src/services/supabase/databaseService.ts` - KYC document operations
- `src/screens/kyc/AadhaarScanScreen.tsx` - Aadhaar document submission
- `src/screens/kyc/KYCScreen.tsx` - KYC status display

---

### 8. kyc_data
**Purpose:** KYC data storage (Backend API)

**Columns:**
- `id` (UUID, PRIMARY KEY) - Record ID
- `user_id` (UUID, FOREIGN KEY → users.id) - User ID
- `document_type` (TEXT) - Document type
- `document_url` (TEXT, NULLABLE) - URL to document image
- `extracted_data` (JSONB, NULLABLE) - Extracted OCR data as JSON
- `status` (TEXT) - Verification status
- `updated_at` (TIMESTAMP) - Last update timestamp

**Used in:**
- `backend/src/index.ts` - Backend KYC endpoints

---

### 9. trading_bot_configs
**Purpose:** Trading bot configuration settings

**Columns:**
- `user_id` (UUID, PRIMARY KEY, FOREIGN KEY → users.id) - User ID
- `enabled` (BOOLEAN) - Whether trading bot is enabled
- `reserve_power` (INTEGER) - Reserve power percentage (0-100)
- `min_sell_price` (DECIMAL(10,2)) - Minimum sell price in INR per unit
- `priority` (TEXT) - Priority: 'neighbors', 'grid', 'both'
- `updated_at` (TIMESTAMP) - Last update timestamp

**Used in:**
- `src/services/supabase/databaseService.ts` - Trading bot config operations
- `src/screens/profile/TradingBotScreen.tsx` - Trading bot settings

---

### 10. sellers
**Purpose:** Energy sellers for marketplace

**Columns:**
- `id` (UUID, PRIMARY KEY) - Seller ID
- `user_id` (UUID, FOREIGN KEY → users.id) - Seller user ID
- `name` (TEXT) - Seller name
- `location` (JSONB) - Location data: { lat: number, lng: number, address?: string }
- `price_per_unit` (DECIMAL(10,2)) - Price per kWh in INR
- `available_energy` (DECIMAL(10,2)) - Available energy in kWh
- `rating` (DECIMAL(3,2)) - Seller rating (0-5)
- `total_sales` (DECIMAL(10,2)) - Total energy sold in kWh
- `green_energy` (BOOLEAN) - Whether seller provides green energy
- `created_at` (TIMESTAMP) - Seller registration timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Used in:**
- `backend/src/index.ts` - Trading search endpoint
- `src/screens/trading/MarketplaceScreen.tsx` - Seller discovery

---

### 11. withdrawals
**Purpose:** Withdrawal requests

**Columns:**
- `id` (UUID, PRIMARY KEY) - Withdrawal ID
- `user_id` (UUID, FOREIGN KEY → users.id) - User ID
- `request_id` (TEXT, UNIQUE) - Unique withdrawal request ID
- `amount` (DECIMAL(10,2)) - Withdrawal amount in INR
- `bank_account_id` (TEXT, NULLABLE) - Associated bank account ID
- `status` (TEXT) - Status: 'pending', 'processing', 'completed', 'failed', 'cancelled'
- `failure_reason` (TEXT, NULLABLE) - Reason for failure if failed
- `created_at` (TIMESTAMP) - Request creation timestamp
- `processed_at` (TIMESTAMP, NULLABLE) - Processing start timestamp
- `completed_at` (TIMESTAMP, NULLABLE) - Completion timestamp

**Used in:**
- `backend/src/index.ts` - Withdrawal endpoints
- `src/screens/wallet/WithdrawScreen.tsx` - Withdrawal requests

---

### 12. bank_accounts
**Purpose:** User bank account details for withdrawals

**Columns:**
- `id` (UUID, PRIMARY KEY) - Bank account ID
- `user_id` (UUID, FOREIGN KEY → users.id) - User ID
- `account_number` (TEXT) - Bank account number
- `ifsc_code` (TEXT) - IFSC code
- `account_holder_name` (TEXT) - Account holder name
- `bank_name` (TEXT, NULLABLE) - Bank name
- `is_primary` (BOOLEAN) - Whether this is the primary account
- `created_at` (TIMESTAMP) - Account addition timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Used in:**
- `src/screens/wallet/WithdrawScreen.tsx` - Bank account management
- `backend/src/index.ts` - Withdrawal processing

---

## Indexes

All indexes are created for performance optimization:

- `idx_energy_data_meter_id` - Fast meter data queries
- `idx_energy_data_timestamp` - Fast time-based queries
- `idx_orders_buyer_id` - Fast buyer order queries
- `idx_orders_seller_id` - Fast seller order queries
- `idx_orders_status` - Fast status filtering
- `idx_transactions_user_id` - Fast transaction history
- `idx_kyc_documents_user_id` - Fast KYC document queries
- `idx_kyc_documents_status` - Fast status filtering
- `idx_kyc_data_user_id` - Fast KYC data queries
- `idx_kyc_data_status` - Fast status filtering
- `idx_meters_user_id` - Fast meter queries
- `idx_sellers_user_id` - Fast seller queries
- `idx_sellers_location` - Fast location-based search (GIN index for JSONB)
- `idx_withdrawals_user_id` - Fast withdrawal queries
- `idx_withdrawals_request_id` - Fast request ID lookups
- `idx_withdrawals_status` - Fast status filtering
- `idx_bank_accounts_user_id` - Fast bank account queries

---

## Storage Buckets

Required Supabase Storage buckets:

1. **profile-images** - User profile pictures
2. **kyc-documents** - KYC document images
3. **electricity-bills** - Electricity bill uploads

---

## Notes

- All timestamps use `TIMESTAMP WITH TIME ZONE`
- All UUIDs use `uuid_generate_v4()` as default
- Foreign keys use `ON DELETE CASCADE` for automatic cleanup
- Check constraints ensure data validity
- JSONB columns allow flexible data storage
- GIN indexes on JSONB columns for fast JSON queries

