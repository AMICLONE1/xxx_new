# PowerNetPro - Complete Setup & Development Guide

**Version:** 1.0.0  
**Last Updated:** January 5, 2026  
**Target Audience:** Developers, Team Members, Contributors

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Prerequisites & System Requirements](#-prerequisites--system-requirements)
3. [Installation Guide](#-installation-guide)
4. [Environment Configuration](#-environment-configuration)
5. [Database Setup](#-database-setup)
6. [Backend Setup](#-backend-setup)
7. [Mobile App Setup](#-mobile-app-setup)
8. [OCR Installation & Configuration](#-ocr-installation--configuration)
9. [Running the Application](#-running-the-application)
10. [Known Issues & Limitations](#-known-issues--limitations)
11. [Security Concerns](#-security-concerns)
12. [Missing Features & TODOs](#-missing-features--todos)
13. [Network & API Issues](#-network--api-issues)
14. [Troubleshooting Guide](#-troubleshooting-guide)
15. [Development Workflow](#-development-workflow)
16. [Testing Guide](#-testing-guide)
17. [Deployment Guide](#-deployment-guide)
18. [Contributing Guidelines](#-contributing-guidelines)

---

## 🎯 Project Overview

**PowerNetPro** is a peer-to-peer energy trading mobile application built with React Native (Expo) that enables users to buy and sell renewable energy. The application features:

### Core Features
- ✅ **Authentication System**: Phone/Email with OTP verification via Supabase
- ✅ **KYC Verification**: Aadhaar, PAN, Electricity Bill OCR scanning
- ✅ **Smart Meter Registration**: DISCOM integration with verification
- ✅ **Energy Trading Marketplace**: Real-time map-based seller discovery
- ✅ **Wallet System**: Energy credits and cash balance management
- ✅ **Transaction History**: Complete trade history with charts (Line, Bar, Pie)
- ✅ **Auto-Refresh**: Live location and seller updates (30s/60s intervals)
- ✅ **Payment Integration**: Razorpay for cash transactions
- ⚠️ **Trading Bot**: Automated trading (Partial implementation)
- ⚠️ **Beckn Protocol**: Open network integration (Stub implementation)

### Technology Stack

#### Frontend (Mobile App)
- **Framework**: React Native 0.81.5 + Expo SDK ~54.0.30
- **Language**: TypeScript 5.9.2 (strict mode)
- **State Management**: Zustand 5.0.9
- **Navigation**: React Navigation 7.x (Native Stack + Bottom Tabs)
- **UI Components**: Custom components with expo-linear-gradient
- **Charts**: react-native-chart-kit 6.12.0
- **Maps**: Mapbox GL JS v2.15.0 (via WebView)
- **OCR**: @react-native-ml-kit/text-recognition 2.0.0
- **Camera**: expo-camera 17.0.10
- **Location**: expo-location 19.0.8
- **Database**: WatermelonDB 0.28.0 (local), Supabase (cloud sync)

#### Backend (API Server)
- **Runtime**: Node.js 18+ with TypeScript 5.3.3
- **Framework**: Express 4.18.2
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Payments**: Razorpay SDK 2.9.2
- **Deployment**: Railway/Heroku ready

#### Database
- **Primary**: Supabase PostgreSQL
- **Tables**: users, meters, energy_data, orders, wallets, transactions, kyc_documents, sellers, notifications

---

## 📦 Prerequisites & System Requirements

### Mandatory Software

#### 1. Node.js & Package Manager
```bash
# Required: Node.js 18.x or higher
node --version  # Should show v18.x.x or higher

# npm comes with Node.js
npm --version   # Should show 9.x.x or higher
```
**Download**: https://nodejs.org/

#### 2. Git
```bash
git --version  # Should show version 2.x or higher
```
**Download**: https://git-scm.com/

#### 3. Expo CLI
```bash
npm install -g expo-cli
expo --version
```

#### 4. Development Environment

**For Windows:**
- Windows 10/11 (64-bit)
- Android Studio (for Android development)
- Visual Studio Code (recommended editor)

**For macOS:**
- macOS 12+ (for iOS development)
- Xcode 14+ (for iOS builds)
- Android Studio (for Android development)

**For Linux:**
- Ubuntu 20.04+ or equivalent
- Android Studio (for Android development)

### Android Development Setup

#### Install Android Studio
1. Download from https://developer.android.com/studio
2. Install with default settings
3. Open Android Studio > More Actions > SDK Manager
4. Install:
   - Android SDK Platform 33 (Android 13)
   - Android SDK Build-Tools 33.x.x
   - Android Emulator
   - Android SDK Platform-Tools

#### Configure Environment Variables
**Windows:**
```powershell
# Add to System Environment Variables
ANDROID_HOME=C:\Users\YourUsername\AppData\Local\Android\Sdk
Path=%Path%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools
```

**macOS/Linux:**
```bash
# Add to ~/.bashrc or ~/.zshrc
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

#### Create Android Virtual Device (AVD)
1. Open Android Studio > Device Manager
2. Create Virtual Device > Choose "Pixel 5" or similar
3. Download System Image: Android 13 (API 33)
4. Finish and launch emulator to test

### iOS Development Setup (macOS only)

#### Install Xcode
```bash
# Install Xcode from App Store
xcode-select --install

# Install CocoaPods
sudo gem install cocoapods
pod --version
```

### Optional Tools
- **Visual Studio Code**: https://code.visualstudio.com/
  - Extensions: ESLint, Prettier, React Native Tools, TypeScript
- **Postman**: For API testing (https://www.postman.com/)
- **DBeaver**: For database management (https://dbeaver.io/)

---

## 🚀 Installation Guide

### Step 1: Clone the Repository

```bash
# Clone from GitHub
git clone https://github.com/YOUR_USERNAME/xxx_MA_PNP.git
cd xxx_MA_PNP

# Or if using SSH
git clone git@github.com:YOUR_USERNAME/xxx_MA_PNP.git
cd xxx_MA_PNP
```

### Step 2: Install Frontend Dependencies

```bash
# In project root directory
npm install

# This will install all dependencies from package.json including:
# - expo (~54.0.30)
# - react-native (0.81.5)
# - @react-navigation packages
# - @react-native-ml-kit/text-recognition
# - zustand, react-native-chart-kit, etc.
```

**⚠️ Common Installation Issues:**

1. **"peer dependency" warnings**: Usually safe to ignore
2. **Python errors on Windows**: Install Python 2.7 or 3.x
3. **Node-gyp errors**: Install Visual Studio Build Tools

```bash
# Fix node-gyp on Windows
npm install --global windows-build-tools
```

### Step 3: Install Backend Dependencies

```bash
# Navigate to backend folder
cd backend
npm install

# This installs:
# - express, cors, dotenv
# - @supabase/supabase-js
# - razorpay, uuid
# - TypeScript and dev dependencies

# Return to root
cd ..
```

### Step 4: Verify Installation

```bash
# Check if installations succeeded
npm list --depth=0
cd backend && npm list --depth=0 && cd ..
```

---

## ⚙️ Environment Configuration

### Frontend Configuration

#### Create `.env` file in project root:

```bash
# Copy example if exists, or create manually
touch .env
```

**`.env` file contents:**
```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# API Configuration
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000

# Google Cloud Vision (Optional - for OCR fallback)
EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key

# Mapbox (Optional - if using Mapbox maps)
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token

# Environment
EXPO_PUBLIC_ENVIRONMENT=development
```

#### Update `app.json` with environment variables:

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://YOUR_PROJECT.supabase.co",
      "supabaseAnonKey": "your_supabase_anon_key",
      "apiBaseUrl": "http://localhost:3000"
    }
  }
}
```

### Backend Configuration

#### Create `.env` file in `backend/` folder:

```bash
cd backend
touch .env
```

**`backend/.env` file contents:**
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret_here

# CORS Configuration
CORS_ORIGIN=*

# JWT Secret (for custom auth if needed)
JWT_SECRET=your_random_jwt_secret_here_min_32_chars
```

**⚠️ IMPORTANT SECURITY NOTES:**
- Never commit `.env` files to Git
- Use different keys for development/production
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret (full database access)

---

## 🗄️ Database Setup

### Step 1: Create Supabase Project

1. Go to https://supabase.com/
2. Sign up or login
3. Click "New Project"
4. Fill in:
   - **Name**: PowerNetPro
   - **Database Password**: Save this securely
   - **Region**: Choose closest to users
5. Wait for project to initialize (~2 minutes)

### Step 2: Get Supabase Credentials

1. Go to Project Settings > API
2. Copy these values:
   - **URL**: `https://ncejoqiddhaxuetjhjrs.supabase.co`
   - **anon public**: Your anon key
   - **service_role**: Your service role key (show it first)

### Step 3: Run Database Schema

1. Open Supabase Dashboard > SQL Editor
2. Copy contents of `database/COMPLETE_SCHEMA.sql`
3. Paste and click "Run"

**The schema creates these tables:**
- `users` - User accounts and profiles
- `meters` - Smart meter registrations
- `energy_data` - Energy generation/consumption records
- `orders` - Trading orders
- `wallets` - User wallet balances
- `transactions` - Financial transactions
- `kyc_documents` - KYC verification documents
- `sellers` - Marketplace seller listings
- `notifications` - Push notification records

### Step 4: Configure Row Level Security (RLS)

**⚠️ CRITICAL SECURITY STEP**

Run these RLS policies in SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Meters policies
CREATE POLICY "Users can read own meters" ON public.meters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meters" ON public.meters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Wallets policies
CREATE POLICY "Users can read own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can read own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Orders policies (buyers and sellers can read)
CREATE POLICY "Users can read related orders" ON public.orders
  FOR SELECT USING (
    auth.uid() = buyer_id OR auth.uid() = seller_id
  );

-- Sellers table is public read
CREATE POLICY "Anyone can read sellers" ON public.sellers
  FOR SELECT USING (true);

-- KYC documents - users can read/write own documents
CREATE POLICY "Users can read own kyc" ON public.kyc_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own kyc" ON public.kyc_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Step 5: Setup Authentication

1. Go to Authentication > Providers
2. Enable:
   - **Email**: Turn on
   - **Phone**: Turn on (requires Twilio setup)
3. Configure Email Templates:
   - Authentication > Email Templates
   - Customize "Magic Link" and "Confirm Signup" templates

### Step 6: Configure Storage (for profile pictures & documents)

1. Go to Storage > Create Bucket
2. Create buckets:
   - **Name**: `profile-pictures`
   - **Public**: Yes
   - **File size limit**: 5MB
   
3. Create bucket for documents:
   - **Name**: `kyc-documents`
   - **Public**: No (private)
   - **File size limit**: 10MB

4. Set Storage Policies:
```sql
-- Profile pictures bucket policies
CREATE POLICY "Users can upload own profile picture"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public read access to profile pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

-- KYC documents bucket policies
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Step 7: Test Database Connection

```bash
# In backend folder, create test script
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('YOUR_URL', 'YOUR_ANON_KEY');
supabase.from('users').select('count').then(console.log);
"
```

---

## 🖥️ Backend Setup

### Step 1: Configure Environment

Ensure `backend/.env` is configured as shown in [Environment Configuration](#-environment-configuration).

### Step 2: Build TypeScript

```bash
cd backend
npm run build

# This compiles TypeScript to JavaScript in dist/ folder
# Output should show no errors
```

### Step 3: Start Development Server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start
```

**Expected Output:**
```
🚀 PowerNetPro Backend Server started
📡 Server running on port 3000
📍 Health check: http://localhost:3000/health
🔗 Supabase connected: https://ncejoqiddhaxuetjhjrs.supabase.co
💳 Razorpay initialized (if keys provided)
```

### Step 4: Test API Endpoints

```bash
# Test health endpoint
curl http://localhost:3000/health

# Expected response:
# {
#   "success": true,
#   "message": "PowerNetPro Backend API is running",
#   "timestamp": "2026-01-05T10:30:00.000Z"
# }
```

### Available Backend Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check |
| `/trading/search` | POST | Yes | Search sellers |
| `/trading/analytics` | GET | Yes | Get analytics |
| `/trading/trade` | POST | Yes | Execute trade |
| `/wallet/balance` | GET | Yes | Get wallet balance |
| `/wallet/topup` | POST | Yes | Top up wallet |
| `/wallet/withdraw` | POST | Yes | Withdraw funds |
| `/meter/register` | POST | Yes | Register meter |
| `/meter/verify` | POST | Yes | Verify meter |
| `/energy/data` | GET | Yes | Get energy data |
| `/energy/submit` | POST | Yes | Submit energy reading |

**⚠️ All endpoints except `/health` require authentication token in header:**
```
Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN
```

---

## 📱 Mobile App Setup

### Step 1: Start Expo Development Server

```bash
# In project root
npm start

# Or with specific options
npx expo start --clear  # Clear cache
npx expo start --android  # Start with Android
npx expo start --ios  # Start with iOS
```

**Expo DevTools will open in browser:**
- Press `a` - Open in Android emulator
- Press `i` - Open in iOS simulator
- Scan QR code with Expo Go app on physical device

### Step 2: Development Build (Required for OCR)

**⚠️ IMPORTANT:** OCR features require a development build, not Expo Go.

#### For Android:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure

# Build development client
eas build --profile development --platform android

# Or build locally (requires Android Studio)
npx expo run:android
```

#### For iOS (macOS only):

```bash
# Build development client
eas build --profile development --platform ios

# Or build locally (requires Xcode)
npx expo run:ios
```

### Step 3: Install Development Build on Device

**Android:**
1. Download APK from EAS build dashboard
2. Install on device via USB or direct download
3. Open app, it will connect to Metro bundler

**iOS:**
1. Download and install via TestFlight or direct installation
2. Trust developer certificate in Settings > General > Device Management
3. Open app

### Step 4: Configure API Base URL for Device Testing

**For Android Emulator:**
```env
# Use 10.0.2.2 to access localhost from emulator
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
```

**For iOS Simulator:**
```env
# Use localhost for simulator
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

**For Physical Device:**
```env
# Use your computer's local IP address
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3000
```

**Find your local IP:**
```bash
# Windows
ipconfig

# macOS/Linux
ifconfig | grep inet
```

---

## 🔍 OCR Installation & Configuration

### Understanding OCR in PowerNetPro

**PowerNetPro uses on-device OCR via ML Kit for:**
- Aadhaar card scanning
- PAN card scanning
- Electricity bill scanning (DISCOM, consumer number, meter ID)

**Architecture:**
- **Primary**: Google ML Kit (on-device, free, no API key needed)
- **Fallback**: Google Cloud Vision API (cloud-based, requires API key)

### ML Kit OCR Setup

#### Step 1: Verify Dependencies

Check `package.json` includes:
```json
{
  "dependencies": {
    "@react-native-ml-kit/text-recognition": "^2.0.0",
    "expo-camera": "^17.0.10"
  }
}
```

#### Step 2: Development Build Required

**⚠️ CRITICAL:** ML Kit ONLY works in development builds, NOT Expo Go.

```bash
# Build for Android
npx expo run:android

# Build for iOS
npx expo run:ios
```

#### Step 3: Configure Permissions

**Android** - `app.json`:
```json
{
  "android": {
    "permissions": [
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE"
    ]
  }
}
```

**iOS** - `app.json`:
```json
{
  "ios": {
    "infoPlist": {
      "NSCameraUsageDescription": "This app needs camera access to scan KYC documents.",
      "NSPhotoLibraryUsageDescription": "This app needs photo library access for document uploads."
    }
  }
}
```

#### Step 4: Test OCR Functionality

1. Build and install development build
2. Navigate to KYC section
3. Try scanning a sample Aadhaar/PAN card
4. Check console logs for OCR results

**OCR Service Location:** `src/services/mlkit/ocrService.ts`

**Supported Document Formats:**
- Aadhaar: 12-digit number (XXXX XXXX XXXX)
- PAN: 10-character alphanumeric (ABCDE1234F)
- Electricity Bill: DISCOM name, consumer number, meter serial ID

### Google Cloud Vision Fallback (Optional)

If ML Kit is not available, the app falls back to Cloud Vision API.

#### Step 1: Enable Cloud Vision API

1. Go to https://console.cloud.google.com/
2. Create new project: "PowerNetPro"
3. Enable "Cloud Vision API"
4. Create API key: APIs & Services > Credentials > Create Credentials > API Key

#### Step 2: Configure API Key

Add to `.env`:
```env
EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

#### Step 3: Restrict API Key (Security)

In Google Cloud Console:
1. Edit API key
2. Set Application Restrictions: "Android apps" / "iOS apps"
3. Set API Restrictions: "Cloud Vision API" only

### OCR Troubleshooting

**Issue 1: "OCR not available"**
- **Cause**: Running in Expo Go
- **Solution**: Build development build with `npx expo run:android`

**Issue 2: "Camera permission denied"**
- **Cause**: User denied camera permission
- **Solution**: Guide user to Settings > Apps > PowerNetPro > Permissions > Enable Camera

**Issue 3: "OCR returns empty text"**
- **Cause**: Poor image quality, low lighting, or document not in frame
- **Solution**: 
  - Ensure good lighting
  - Hold document flat and steady
  - Keep document fully in frame
  - Clean camera lens

**Issue 4: "Wrong text extracted"**
- **Cause**: ML Kit confidence issues or unusual font
- **Solution**: Allow manual editing of extracted fields

---

## 🏃 Running the Application

### Complete Startup Sequence

#### Terminal 1: Backend Server
```bash
cd backend
npm run dev

# Wait for: "Server running on port 3000"
```

#### Terminal 2: Mobile App
```bash
# In project root
npm start

# Press 'a' for Android or 'i' for iOS
```

### Development Workflow

#### Hot Reload (Automatic)
- Edit any `.tsx` or `.ts` file
- Save changes
- App automatically reloads

#### Manual Reload
- Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android)
- Select "Reload"

#### Clear Cache
```bash
# Clear Expo cache
npx expo start --clear

# Clear npm cache
npm cache clean --force

# Clear Android build
cd android && ./gradlew clean && cd ..

# Nuclear option: Delete node_modules
rm -rf node_modules package-lock.json
npm install
```

### Testing User Flows

#### 1. Authentication Flow
```
1. Open app
2. Enter phone number: +91 9876543210
3. Request OTP
4. Enter OTP from Supabase logs (check backend console)
5. Should navigate to Home screen
```

#### 2. KYC Verification Flow
```
1. Navigate to Profile > KYC Verification
2. Scan Aadhaar card (or upload image)
3. Verify extracted details (name, DOB, address)
4. Repeat for PAN and Electricity Bill
5. Check status in Profile
```

#### 3. Meter Registration Flow
```
1. Navigate to Profile > Register Meter
2. Enter DISCOM name, consumer number
3. Scan electricity bill for meter serial ID
4. Submit for verification
5. Wait for admin approval
```

#### 4. Energy Trading Flow
```
1. Navigate to Marketplace
2. View sellers on map
3. Click marker to see details
4. Tap "View Details" > "Buy" or "Sell"
5. Enter energy amount
6. Confirm trade
7. Check transaction in History (Profile > Transaction History)
```

#### 5. Wallet Flow
```
1. Navigate to Wallet
2. Tap "Top Up"
3. Enter amount
4. Razorpay payment gateway opens
5. Complete payment
6. Balance updates
```

---

## ⚠️ Known Issues & Limitations

### Critical Issues

#### 1. ⚠️ **Backend API Hardcoded to Localhost**
**Location**: `src/services/api/client.ts`
```typescript
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.powernetpro.com';
```
**Issue**: Defaults to production URL, but development uses localhost.
**Impact**: API calls fail when backend is not deployed.
**Workaround**: Always set `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000` for Android emulator.
**Fix**: Add better environment detection.

#### 2. ⚠️ **OCR Only Works in Development Builds**
**Location**: `src/services/mlkit/ocrService.ts`
**Issue**: ML Kit native module doesn't work in Expo Go.
**Impact**: KYC scanning fails in Expo Go.
**Workaround**: Build development build or use Cloud Vision fallback.
**Status**: By design (native module limitation).

#### 3. ⚠️ **Razorpay Integration Incomplete**
**Location**: `src/services/payments/paymentService.ts`
```typescript
async processPayment(orderId: string, method: 'upi' | 'card' | 'netbanking'): Promise<void> {
  // TODO: Implement UPI intent opening
  throw new Error('Not implemented');
}
```
**Issue**: Payment processing not fully implemented.
**Impact**: Wallet top-up doesn't work end-to-end.
**Fix Required**: Integrate Razorpay React Native SDK properly.

#### 4. ⚠️ **No Real-time Energy Meter Data**
**Location**: `src/services/mock/backgroundDataGenerator.ts`
**Issue**: Using mock data instead of real meter API.
**Impact**: Energy readings are simulated, not actual.
**Fix Required**: Integrate with DISCOM APIs or IoT meter endpoints.

#### 5. ⚠️ **Beckn Protocol Integration is Stub**
**Location**: `src/services/beckn/becknClient.ts`
```typescript
async searchProducts(context: SearchContext): Promise<Product[]> {
  // TODO: Implement Beckn protocol search
  console.log('Beckn search not implemented');
  return [];
}
```
**Issue**: Beckn protocol calls are not implemented.
**Impact**: Open network energy trading doesn't work.
**Fix Required**: Implement full Beckn Protocol specification.

### Moderate Issues

#### 6. ⚠️ **Trading Bot Engine Not Functional**
**Location**: `src/services/tradingBot/tradingBotEngine.ts`
```typescript
private async executeTrade(trade: ProposedTrade): Promise<boolean> {
  // TODO: Implement actual trade execution
  return false;
}
```
**Issue**: Automated trading logic incomplete.
**Impact**: Auto-trading feature doesn't work.
**Status**: Feature planned but not implemented.

#### 7. ⚠️ **Map Auto-refresh May Cause Performance Issues**
**Location**: `src/screens/trading/MarketplaceScreen.tsx`
```typescript
// Sellers refresh every 30 seconds
// Location refresh every 60 seconds
```
**Issue**: Aggressive refresh intervals may drain battery.
**Impact**: High battery consumption on mobile devices.
**Workaround**: User can disable auto-refresh.
**Fix**: Implement WebSocket for real-time updates instead of polling.

#### 8. ⚠️ **Location Service Uses Fallback Coordinates**
**Location**: `src/services/locationService.ts`
```typescript
// Fallback to Pune coordinates if GPS fails
const FALLBACK_LOCATION = { lat: 18.5204, lng: 73.8567 };
```
**Issue**: Silent fallback to Pune if location permission denied.
**Impact**: User sees incorrect location on map.
**Fix**: Show error to user instead of silent fallback.

#### 9. ⚠️ **Profile Picture Upload Not Fully Implemented**
**Location**: `src/screens/profile/ProfileScreen.tsx`
**Issue**: Upload works but cropping/optimization missing.
**Impact**: Large images stored, slow loading.
**Fix**: Add image compression and cropping before upload.

#### 10. ⚠️ **Transaction History Uses Mock Data**
**Location**: `src/store/transactionStore.ts`
```typescript
const mockInitialTransactions: Transaction[] = [ /* ... */ ];
```
**Issue**: Pre-populated with fake transactions for demo.
**Impact**: New users see fake transaction history.
**Fix**: Remove mock data, fetch from Supabase.

### Minor Issues

#### 11. ℹ️ **Battery Level Hardcoded**
**Location**: `src/screens/home/HomeScreen.tsx`
```typescript
batteryLevel: 75, // TODO: Get from real data
```
**Impact**: Always shows 75% battery.
**Fix**: Integrate with battery API.

#### 12. ℹ️ **No Offline Mode**
**Issue**: App requires internet connection for all features.
**Impact**: Cannot use app without connectivity.
**Fix**: Implement WatermelonDB sync for offline-first architecture.

#### 13. ℹ️ **No Push Notifications**
**Issue**: Firebase Cloud Messaging configured but not sending notifications.
**Impact**: Users don't get trade alerts, KYC updates.
**Fix**: Implement FCM in backend, send notifications on events.

#### 14. ℹ️ **Chart Data Not Dynamic**
**Location**: `src/screens/history/HistoryScreen.tsx`
**Issue**: Charts show sample data structure, not real aggregations.
**Impact**: Charts don't reflect actual transaction patterns.
**Fix**: Aggregate real transaction data by date/type.

#### 15. ℹ️ **No Error Boundary**
**Issue**: App crashes completely on unhandled errors.
**Impact**: Poor user experience.
**Fix**: Add React Error Boundary component.

---

## 🔒 Security Concerns

### Critical Security Issues

#### 1. 🚨 **Exposed API Keys in Source Code**
**Location**: Multiple files
**Issue**: Environment variables visible in compiled JavaScript.
**Risk**: High - API keys can be extracted from app bundle.
**Solution**: 
- Move sensitive keys to backend
- Use app-specific authentication tokens
- Implement certificate pinning

#### 2. 🚨 **No Rate Limiting on Backend**
**Location**: `backend/src/index.ts`
**Issue**: No rate limiting middleware.
**Risk**: High - API can be abused, DDoS attacks.
**Solution**: Add express-rate-limit middleware:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/trading/', limiter);
```

#### 3. 🚨 **Weak JWT Secret**
**Location**: `backend/.env`
```env
JWT_SECRET=your_random_jwt_secret_here_min_32_chars
```
**Issue**: Example secret may be used in production.
**Risk**: High - Token forgery.
**Solution**: Generate strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### 4. 🚨 **SQL Injection Risk (Low but Present)**
**Location**: `backend/src/index.ts` - query building
**Issue**: Some queries use string interpolation.
**Risk**: Medium - Supabase client protects most cases.
**Solution**: Always use parameterized queries.

#### 5. 🚨 **Insecure File Uploads**
**Location**: `src/services/supabase/storageService.ts`
**Issue**: No file type validation before upload.
**Risk**: Medium - Malicious files could be uploaded.
**Solution**: Validate file types and scan for malware.

#### 6. 🚨 **RLS Policies Not Fully Tested**
**Location**: Supabase database
**Issue**: Complex RLS policies may have bypass conditions.
**Risk**: High - Data leakage between users.
**Solution**: Comprehensive RLS testing with different user roles.

### Moderate Security Issues

#### 7. ⚠️ **CORS Set to Allow All**
**Location**: `backend/src/index.ts`
```typescript
app.use(cors({ origin: '*' }));
```
**Issue**: Any domain can call API.
**Risk**: Medium - CSRF attacks.
**Solution**: Restrict to specific origins:
```typescript
app.use(cors({ origin: process.env.CORS_ORIGIN || 'https://powernetpro.com' }));
```

#### 8. ⚠️ **No HTTPS Enforcement**
**Issue**: App works on HTTP in development.
**Risk**: Medium - Man-in-the-middle attacks.
**Solution**: Enforce HTTPS in production builds.

#### 9. ⚠️ **Sensitive Data in Logs**
**Location**: Multiple files with `console.log()`
**Issue**: PII logged in development mode.
**Risk**: Medium - Data exposure in logs.
**Solution**: Remove or redact sensitive logs in production.

#### 10. ⚠️ **No Input Validation on Backend**
**Location**: Most API endpoints
**Issue**: Trusting client input without validation.
**Risk**: Medium - Invalid data in database.
**Solution**: Add validation library (Joi, Zod).

### Low Security Issues

#### 11. ℹ️ **No Password Policy**
**Issue**: Supabase auth allows weak passwords.
**Risk**: Low - Users may choose weak passwords.
**Solution**: Configure Supabase password requirements.

#### 12. ℹ️ **No 2FA**
**Issue**: Single-factor authentication only.
**Risk**: Low - Account takeover if phone compromised.
**Solution**: Implement TOTP-based 2FA.

#### 13. ℹ️ **No Session Timeout**
**Issue**: Tokens valid indefinitely until revoked.
**Risk**: Low - Stale tokens remain valid.
**Solution**: Implement token refresh with short expiry.

---

## 🚧 Missing Features & TODOs

### High Priority

1. **Complete Razorpay Integration**
   - Implement payment processing
   - Add refund functionality
   - Handle payment webhooks

2. **Real Meter Data Integration**
   - Connect to DISCOM APIs
   - Poll meter readings
   - Store time-series data

3. **WebSocket for Real-time Updates**
   - Replace polling with WebSocket
   - Push seller updates to map
   - Real-time trade notifications

4. **Push Notifications**
   - Trade confirmations
   - KYC status updates
   - Payment receipts

5. **Offline Mode**
   - WatermelonDB full sync
   - Queue API calls
   - Sync when online

### Medium Priority

6. **Trading Bot Completion**
   - Implement strategy execution
   - Add backtesting
   - Risk management

7. **Beckn Protocol Integration**
   - Implement search/select/confirm flow
   - Multi-party settlements
   - Network discovery

8. **Admin Dashboard**
   - User management
   - KYC approval workflow
   - Meter verification
   - Analytics

9. **Advanced Analytics**
   - Energy consumption predictions
   - Price forecasting
   - Savings calculator

10. **Multi-language Support**
    - i18n setup
    - Hindi, Marathi translations

### Low Priority

11. **Social Features**
    - User reviews/ratings
    - Seller profiles
    - Community forums

12. **Gamification**
    - Badges for green energy usage
    - Leaderboards
    - Referral rewards

13. **Smart Contracts**
    - Blockchain integration
    - Immutable trade records

---

## 🌐 Network & API Issues

### Common Network Problems

#### 1. **"Network request failed" Error**
**Symptoms:**
- API calls timeout
- "Unable to connect to server"

**Causes:**
- Backend not running
- Wrong API URL
- Firewall blocking
- CORS issues

**Solutions:**
```bash
# Check backend is running
curl http://localhost:3000/health

# Check from Android emulator
adb shell am start -a android.intent.action.VIEW -d http://10.0.2.2:3000/health

# Check from device (use computer's local IP)
curl http://192.168.1.100:3000/health

# Check firewall (Windows)
netsh advfirewall firewall add rule name="Node.js" dir=in action=allow protocol=TCP localport=3000

# Check CORS in backend
# Ensure CORS_ORIGIN allows your domain
```

#### 2. **API Returns 401 Unauthorized**
**Cause:** Invalid or expired authentication token.
**Solution:**
```typescript
// Check token in app
const token = await supabase.auth.getSession();
console.log('Token:', token);

// Refresh token
await supabase.auth.refreshSession();
```

#### 3. **API Returns 500 Internal Server Error**
**Cause:** Backend error.
**Solution:**
- Check backend console logs
- Check database connection
- Verify environment variables

#### 4. **Slow API Responses**
**Cause:** Inefficient queries, no database indexes.
**Solution:**
```sql
-- Add indexes to frequently queried columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_meters_user_id ON meters(user_id);
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_seller_id ON orders(seller_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
```

#### 5. **Map Not Loading**
**Cause:** Mapbox token invalid or WebView issues.
**Solution:**
- Verify Mapbox token
- Check WebView permissions
- Clear app cache

---

## 🔧 Troubleshooting Guide

### Build Errors

#### "Unable to resolve module"
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npx expo start --clear
```

#### "Android build failed"
```bash
# Clean Android build
cd android
./gradlew clean
cd ..

# Rebuild
npx expo run:android
```

#### "iOS build failed"
```bash
# Clean iOS build
cd ios
pod deintegrate
pod install
cd ..

# Rebuild
npx expo run:ios
```

### Runtime Errors

#### "Supabase client not initialized"
- Check `.env` file exists
- Verify `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Restart Expo server

#### "Camera not available"
- Check permissions in `app.json`
- Request permissions at runtime
- Test on physical device (emulator cameras limited)

#### "OCR returns no text"
- Ensure good lighting
- Hold document steady
- Use development build, not Expo Go

#### "Location permission denied"
- Guide user to enable in device settings
- Request permission with clear explanation
- Provide manual location entry fallback

### Database Errors

#### "Row Level Security policy violation"
```sql
-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'users';

-- Disable RLS temporarily for debugging (NOT in production!)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

#### "Unique constraint violation"
```sql
-- Check for duplicate data
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;

-- Clean duplicates
DELETE FROM users WHERE id NOT IN (
  SELECT MIN(id) FROM users GROUP BY email
);
```

---

## 👨‍💻 Development Workflow

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/payment-integration

# Make changes and commit
git add .
git commit -m "feat: add Razorpay payment integration"

# Push to remote
git push origin feature/payment-integration

# Create Pull Request on GitHub
```

### Code Style

**Use Prettier and ESLint:**
```bash
# Format code
npm run format

# Lint code
npm run lint

# Auto-fix lint issues
npm run lint:fix
```

### Debugging

#### React Native Debugger
```bash
# Install
brew install --cask react-native-debugger  # macOS

# Enable debugging
# Shake device > Debug > Open Debugger
```

#### Chrome DevTools
```bash
# Press Cmd+D (iOS) or Cmd+M (Android)
# Select "Debug Remote JS"
# Open Chrome: http://localhost:19000/debugger-ui
```

#### Flipper (Recommended)
```bash
# Install Flipper
# Download from: https://fbflipper.com/

# Features:
# - Network inspector
# - Layout inspector
# - Logs
# - Database viewer
```

---

## 🧪 Testing Guide

### Manual Testing Checklist

#### Authentication
- [ ] Phone number OTP flow
- [ ] Email magic link flow
- [ ] Logout and re-login
- [ ] Token expiry handling

#### KYC
- [ ] Aadhaar scan and extraction
- [ ] PAN scan and extraction
- [ ] Electricity bill scan
- [ ] Manual data entry
- [ ] Document upload

#### Trading
- [ ] View sellers on map
- [ ] Filter sellers (price, distance, rating)
- [ ] Buy energy
- [ ] Sell energy
- [ ] View transaction history

#### Wallet
- [ ] View balance
- [ ] Top up (Razorpay)
- [ ] Withdraw funds
- [ ] Transaction list

### Automated Testing (Not Implemented Yet)

**Recommended Setup:**
```bash
# Install Jest and React Native Testing Library
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native

# Add to package.json
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch"
}
```

---

## 🚀 Deployment Guide

### Backend Deployment (Railway)

```bash
# Install Railway CLI
npm install -g railway

# Login
railway login

# Initialize project
railway init

# Set environment variables
railway variables set SUPABASE_URL=https://xxx.supabase.co
railway variables set SUPABASE_ANON_KEY=xxx
railway variables set RAZORPAY_KEY_ID=xxx

# Deploy
railway up

# Get deployment URL
railway domain
```

### Mobile App Deployment

#### Android (Google Play Store)

```bash
# Build production APK
eas build --platform android --profile production

# Or build AAB (recommended)
eas build --platform android --profile production --build-type app-bundle

# Download and upload to Play Console
# https://play.google.com/console
```

#### iOS (App Store)

```bash
# Build production IPA
eas build --platform ios --profile production

# Upload to App Store Connect via Transporter
# https://appstoreconnect.apple.com/
```

---

## 🤝 Contributing Guidelines

### How to Contribute

1. Fork the repository
2. Create feature branch
3. Make changes
4. Write tests (when testing is set up)
5. Run linter: `npm run lint:fix`
6. Commit with conventional commits
7. Push and create Pull Request

### Commit Message Format

```
feat: add trading bot execution
fix: resolve OCR extraction bug
docs: update setup guide
refactor: optimize map rendering
test: add wallet service tests
```

### Code Review Checklist

- [ ] Code follows project style guide
- [ ] No console.logs in production code
- [ ] Error handling implemented
- [ ] TypeScript types defined
- [ ] Comments for complex logic
- [ ] No security vulnerabilities
- [ ] Performance considerations
- [ ] Backward compatibility maintained

---

## 📞 Support & Resources

### Documentation
- **Project Docs**: `docs/` folder
- **Supabase Docs**: https://supabase.com/docs
- **Expo Docs**: https://docs.expo.dev/
- **React Native**: https://reactnative.dev/docs

### Community
- **GitHub Issues**: Report bugs and feature requests
- **Discussions**: Ask questions and share ideas

### Contact
- **Email**: support@powernetpro.com
- **Developer**: [Your contact info]

---

## 📄 License

MIT License - See LICENSE file for details.

---

## 🎓 Learning Resources

### For New Developers

1. **React Native Basics**: https://reactnative.dev/docs/tutorial
2. **TypeScript**: https://www.typescriptlang.org/docs/
3. **Expo**: https://docs.expo.dev/tutorial/introduction/
4. **Supabase**: https://supabase.com/docs/guides/getting-started

### Advanced Topics

1. **State Management with Zustand**: https://github.com/pmndrs/zustand
2. **WatermelonDB**: https://nozbe.github.io/WatermelonDB/
3. **React Navigation**: https://reactnavigation.org/docs/getting-started
4. **ML Kit Text Recognition**: https://developers.google.com/ml-kit/vision/text-recognition

---

## ✅ Setup Verification Checklist

Use this checklist to ensure everything is set up correctly:

### Prerequisites
- [ ] Node.js 18+ installed
- [ ] npm installed
- [ ] Git installed
- [ ] Expo CLI installed
- [ ] Android Studio / Xcode installed (platform-specific)

### Project Setup
- [ ] Repository cloned
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Backend dependencies installed (`cd backend && npm install`)
- [ ] `.env` file created in root
- [ ] `.env` file created in `backend/`
- [ ] All environment variables set

### Database
- [ ] Supabase project created
- [ ] Database schema applied (`COMPLETE_SCHEMA.sql`)
- [ ] RLS policies configured
- [ ] Storage buckets created (`profile-pictures`, `kyc-documents`)
- [ ] Authentication providers enabled

### Backend
- [ ] Backend environment variables set
- [ ] Backend builds successfully (`npm run build`)
- [ ] Backend starts (`npm run dev`)
- [ ] Health endpoint accessible (`curl http://localhost:3000/health`)

### Mobile App
- [ ] Expo dev server starts (`npm start`)
- [ ] App opens in emulator/simulator
- [ ] API connection works
- [ ] Authentication flow works
- [ ] Can navigate between screens

### OCR (Development Build)
- [ ] Development build created (`npx expo run:android` or `eas build`)
- [ ] Camera permissions granted
- [ ] OCR extracts text from sample document

### Optional
- [ ] Razorpay keys configured (for payments)
- [ ] Google Cloud Vision key configured (for OCR fallback)
- [ ] Mapbox token configured (for maps)
- [ ] Firebase Cloud Messaging configured (for push notifications)

---

**Last Updated:** January 5, 2026  
**Version:** 1.0.0  
**Maintained by:** PowerNetPro Development Team

For questions or issues, please open a GitHub issue or contact the development team.
