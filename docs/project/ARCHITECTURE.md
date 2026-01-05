# PowerNetPro - Architecture Overview

**Visual guide to understanding the project structure**

---

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PowerNetPro Mobile App                       │
│                    (React Native + Expo)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Auth       │  │   KYC        │  │  Marketplace │          │
│  │   Screens    │  │   Screens    │  │   Screens    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┼──────────────────┘                  │
│                            │                                      │
│  ┌─────────────────────────▼──────────────────────────┐         │
│  │          Zustand State Management                   │         │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │         │
│  │  │ authStore│ │ kycStore │ │tradeStore│  etc.     │         │
│  │  └──────────┘ └──────────┘ └──────────┘           │         │
│  └─────────────────────────┬──────────────────────────┘         │
│                            │                                      │
│  ┌─────────────────────────▼──────────────────────────┐         │
│  │              Services Layer                         │         │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │         │
│  │  │   API    │ │   OCR    │ │ Location │  etc.     │         │
│  │  │  Client  │ │ (ML Kit) │ │ Service  │           │         │
│  │  └──────────┘ └──────────┘ └──────────┘           │         │
│  └─────────────────────────┬──────────────────────────┘         │
│                            │                                      │
└────────────────────────────┼──────────────────────────────────────┘
                             │
                 ┌───────────▼───────────┐
                 │   Network / HTTP      │
                 └───────────┬───────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                     │
┌───────▼─────────┐  ┌──────▼─────────┐  ┌───────▼────────┐
│   Express API   │  │   Supabase     │  │  Google Cloud  │
│   (Backend)     │  │  PostgreSQL    │  │  Vision API    │
│   Port 3000     │  │  + Auth        │  │  (Fallback)    │
│                 │  │  + Storage     │  │                │
└─────────────────┘  └────────────────┘  └────────────────┘
        │
        ├─ /trading/*     - Trading endpoints
        ├─ /wallet/*      - Wallet endpoints
        ├─ /meter/*       - Meter endpoints
        └─ /energy/*      - Energy data endpoints
```

---

## 🗂️ Frontend Architecture

### Screen Navigation Flow

```
App Launch
    │
    ├─ Not Authenticated
    │   └─> Login/Signup Screen (OTP)
    │       └─> Verification
    │           └─> Home Screen
    │
    └─ Authenticated
        └─> Main Tabs
            ├─ Home
            │   ├─ Dashboard
            │   ├─ Energy Overview
            │   └─ Quick Actions
            │
            ├─ Analytics
            │   ├─ Energy Charts
            │   ├─ Trading Statistics
            │   └─ Consumption Trends
            │
            ├─ Marketplace
            │   ├─ Map View (Sellers)
            │   ├─ List View
            │   ├─ Trade Modal
            │   └─ Trade Analytics
            │
            ├─ Wallet
            │   ├─ Balance Display
            │   ├─ Top-up Modal
            │   └─ Transaction List
            │
            └─ Profile
                ├─ User Info
                ├─ Transaction History ← Modal
                ├─ KYC Verification
                ├─ Register Meter
                └─ Settings
```

### Component Hierarchy

```
App.tsx
 └─ AppNavigator
     ├─ AuthNavigator (Stack)
     │   ├─ LoginScreen
     │   ├─ VerificationScreen
     │   └─ SignupScreen
     │
     └─ MainNavigator (Authenticated)
         ├─ MainTabs (Bottom Tabs)
         │   ├─ HomeScreen
         │   ├─ AnalyticsScreen
         │   ├─ MarketplaceScreen
         │   │   └─ MapboxWebView
         │   │       ├─ User Location Marker
         │   │       └─ Seller Markers (Dynamic)
         │   ├─ WalletScreen
         │   └─ ProfileScreen
         │
         └─ RootStack (Modal Screens)
             ├─ HistoryScreen (Modal)
             ├─ KYCNavigator
             │   ├─ AadhaarScanScreen
             │   ├─ PANScanScreen
             │   └─ ElectricityBillScanScreen
             └─ MeterRegistrationScreen
```

---

## 🔄 Data Flow

### Authentication Flow

```
User enters phone number
    │
    ▼
App → Supabase Auth.signInWithOtp()
    │
    ▼
Supabase sends OTP SMS
    │
    ▼
User enters OTP
    │
    ▼
App → Supabase Auth.verifyOtp()
    │
    ├─ Success
    │   └─> Store token in authStore
    │       └─> Navigate to HomeScreen
    │
    └─ Failure
        └─> Show error message
```

### Trading Flow

```
User navigates to Marketplace
    │
    ▼
App requests location
    │
    ├─ Permission Granted
    │   └─> Get GPS coordinates
    │
    └─ Permission Denied
        └─> Show error (no fallback)
    │
    ▼
App → Backend /trading/search
    │   (with location, filters)
    │
    ▼
Backend → Supabase query sellers table
    │
    ▼
Backend ← Sellers data
    │
    ▼
App ← Sellers list
    │
    ▼
Display sellers on map (Mapbox WebView)
    │
    ▼
User taps seller marker
    │
    ▼
Show seller details popup
    │
    ▼
User clicks "View Details"
    │
    ▼
Show trade modal (Buy/Sell options)
    │
    ▼
User selects "Buy" and enters amount
    │
    ▼
App → Backend /trading/trade
    │   (with seller_id, amount, type)
    │
    ▼
Backend → Supabase insert into orders
    │         update wallets
    │         insert transaction
    │
    ▼
Backend ← Success
    │
    ▼
App ← Trade confirmation
    │
    ▼
Update local stores (wallet, transactions)
    │
    ▼
Show success message
    │
    ▼
User can view in Transaction History
```

### KYC Flow (OCR)

```
User navigates to KYC Verification
    │
    ▼
Choose document type (Aadhaar/PAN/Bill)
    │
    ▼
Open camera OR upload image
    │
    ▼
Capture/Select image
    │
    ▼
Check if running in dev build
    │
    ├─ Dev Build (ML Kit available)
    │   │
    │   ▼
    │   ML Kit recognizeImage()
    │   │
    │   ▼
    │   Extract text on-device
    │
    └─ Expo Go (ML Kit not available)
        │
        ▼
        Cloud Vision API (if configured)
        │
        ▼
        Extract text from cloud
    │
    ▼
Parse extracted text
    │   (using regex patterns)
    │
    ├─ Aadhaar: Extract name, number, DOB, address
    ├─ PAN: Extract name, PAN number, DOB
    └─ Bill: Extract DISCOM, consumer number, meter ID
    │
    ▼
Show extracted data for confirmation
    │
    ▼
User verifies and confirms
    │
    ▼
Upload document image to Supabase Storage
    │
    ▼
App → Backend /kyc/submit
    │   (with document_type, data, file_url)
    │
    ▼
Backend → Supabase insert into kyc_documents
    │         update users.kyc_status
    │
    ▼
Backend ← Success
    │
    ▼
App ← KYC submitted
    │
    ▼
Update kycStore
    │
    ▼
Show success message
```

---

## 🗄️ Database Schema

### Core Tables

```
users
├─ id (UUID, PK)
├─ email
├─ phone_number
├─ name
├─ profile_picture_url
├─ kyc_status (pending/verified/rejected)
├─ created_at
└─ updated_at

meters
├─ id (UUID, PK)
├─ user_id (FK → users.id)
├─ discom_name
├─ consumer_number
├─ meter_serial_id
├─ verification_status
├─ address
├─ created_at
└─ updated_at

energy_data
├─ id (UUID, PK)
├─ meter_id (FK → meters.id)
├─ timestamp
├─ generation (kWh)
├─ consumption (kWh)
├─ net_export (kWh)
├─ interval_minutes
└─ created_at

orders
├─ id (UUID, PK)
├─ buyer_id (FK → users.id)
├─ seller_id (FK → users.id)
├─ energy_amount (kWh)
├─ price_per_unit (₹/kWh)
├─ total_price (₹)
├─ status (pending/confirmed/completed/cancelled)
├─ created_at
└─ completed_at

wallets
├─ user_id (UUID, PK, FK → users.id)
├─ energy_balance (kWh)
├─ cash_balance (₹)
└─ updated_at

transactions
├─ id (UUID, PK)
├─ user_id (FK → users.id)
├─ type (topup/withdrawal/energy_purchase/energy_sale)
├─ amount
├─ currency (INR/kWh)
├─ status (pending/completed/failed)
├─ description
└─ created_at

kyc_documents
├─ id (UUID, PK)
├─ user_id (FK → users.id)
├─ document_type (aadhaar/pan/electricity_bill)
├─ document_number
├─ name
├─ date_of_birth
├─ address
├─ status (pending/verified/rejected)
├─ file_url
├─ created_at
└─ updated_at

sellers (marketplace)
├─ id (UUID, PK)
├─ user_id (FK → users.id)
├─ name
├─ latitude
├─ longitude
├─ price_per_unit (₹/kWh)
├─ available_energy (kWh)
├─ rating
├─ green_energy (boolean)
├─ created_at
└─ updated_at
```

### Relationships

```
users (1) ──< (*) meters
users (1) ──< (*) orders (as buyer)
users (1) ──< (*) orders (as seller)
users (1) ─── (1) wallets
users (1) ──< (*) transactions
users (1) ──< (*) kyc_documents
users (1) ─── (0..1) sellers

meters (1) ──< (*) energy_data
```

---

## 🔐 Security Architecture

### Row Level Security (RLS) Flow

```
Client Request
    │
    ▼
Supabase Auth Token (JWT)
    │
    ▼
RLS Policy Evaluation
    │
    ├─ users table
    │   └─> auth.uid() = user.id
    │       (users can only access their own row)
    │
    ├─ meters table
    │   └─> auth.uid() = meters.user_id
    │       (users can only access their own meters)
    │
    ├─ orders table
    │   └─> auth.uid() = orders.buyer_id 
    │       OR auth.uid() = orders.seller_id
    │       (buyers and sellers can see their orders)
    │
    └─ sellers table
        └─> true (public read access)
    │
    ├─ ALLOW
    │   └─> Return data
    │
    └─ DENY
        └─> Return empty/error
```

### API Authentication Flow

```
Client Request
    │
    ▼
Authorization Header: Bearer <token>
    │
    ▼
Backend verifyAuth Middleware
    │
    ▼
Supabase.auth.getUser(token)
    │
    ├─ Valid Token
    │   └─> Attach user to req.user
    │       └─> Proceed to route handler
    │
    └─ Invalid Token
        └─> Return 401 Unauthorized
```

---

## 🔄 State Management

### Zustand Stores

```
authStore
├─ user: User | null
├─ session: Session | null
├─ isAuthenticated: boolean
├─ login(credentials)
├─ logout()
└─ updateProfile(data)

kycStore
├─ documents: KYCDocument[]
├─ status: 'pending' | 'verified' | 'rejected'
├─ submitDocument(type, data)
├─ getDocumentStatus(type)
└─ canUseOCR(type)

tradingStore
├─ sellers: Seller[]
├─ filters: FilterOptions
├─ selectedSeller: Seller | null
├─ searchSellers(location, filters)
├─ selectSeller(id)
└─ executeTrade(trade)

walletStore
├─ energyBalance: number
├─ cashBalance: number
├─ topUp(amount)
├─ withdraw(amount)
└─ refreshBalance()

transactionStore
├─ transactions: Transaction[]
├─ addTransaction(transaction)
├─ getTransactions(filter)
└─ getTotalStats()

meterStore
├─ meters: Meter[]
├─ currentMeter: Meter | null
├─ registerMeter(data)
├─ selectMeter(id)
└─ getMeterData(meterId, dateRange)
```

---

## 📡 API Endpoints

### Backend Routes

```
/health
└─ GET - Health check (no auth)

/auth/*
├─ POST /login - Send OTP
├─ POST /verify - Verify OTP
└─ POST /refresh - Refresh token

/trading/*
├─ POST /search - Search sellers
│   Body: { location, filters }
│   Response: Seller[]
│
├─ GET /analytics - Get analytics data
│   Response: { totalTrades, volume, savings }
│
└─ POST /trade - Execute trade
    Body: { sellerId, energyAmount, tradeType }
    Response: { orderId, status }

/wallet/*
├─ GET /balance - Get wallet balance
│   Response: { energyBalance, cashBalance }
│
├─ POST /topup - Top up cash balance
│   Body: { amount }
│   Response: { orderId }
│
├─ POST /withdraw - Withdraw funds
│   Body: { amount }
│   Response: { transactionId }
│
└─ POST /verify-payment - Verify Razorpay payment
    Body: { paymentId, orderId, signature }
    Response: { verified: boolean }

/meter/*
├─ POST /register - Register meter
│   Body: { discomName, consumerNumber, meterSerialId }
│   Response: { meterId, status }
│
├─ POST /verify - Verify meter (admin)
│   Body: { meterId, status }
│   Response: { success: boolean }
│
└─ GET /list - Get user's meters
    Response: Meter[]

/energy/*
├─ GET /data - Get energy data
│   Query: { meterId, startDate, endDate }
│   Response: EnergyData[]
│
└─ POST /submit - Submit energy reading
    Body: { meterId, generation, consumption }
    Response: { success: boolean }

/kyc/*
├─ POST /submit - Submit KYC document
│   Body: { documentType, data, fileUrl }
│   Response: { documentId, status }
│
├─ GET /status - Get KYC status
│   Response: { status, documents }
│
└─ POST /verify - Verify KYC (admin)
    Body: { documentId, status, rejectionReason }
    Response: { success: boolean }
```

---

## 🛠️ Technology Stack Details

### Frontend Dependencies

```
Core
├─ react-native (0.81.5)
├─ expo (~54.0.30)
└─ typescript (5.9.2)

Navigation
├─ @react-navigation/native (7.1.26)
├─ @react-navigation/native-stack (7.9.0)
└─ @react-navigation/bottom-tabs (7.9.0)

State Management
└─ zustand (5.0.9)

UI Components
├─ expo-linear-gradient (15.0.8)
├─ @expo/vector-icons (15.0.3)
└─ react-native-chart-kit (6.12.0)

Camera & Media
├─ expo-camera (17.0.10)
├─ expo-image-picker (17.0.10)
└─ expo-document-picker (14.0.8)

OCR & ML
└─ @react-native-ml-kit/text-recognition (2.0.0)

Maps & Location
├─ expo-location (19.0.8)
└─ react-native-webview (13.15.0) [for Mapbox]

Storage
├─ expo-secure-store (15.0.8)
├─ @react-native-async-storage/async-storage (2.2.0)
└─ @nozbe/watermelondb (0.28.0)

Backend Communication
└─ @supabase/supabase-js (2.89.0)
```

### Backend Dependencies

```
Core
├─ express (4.18.2)
├─ typescript (5.3.3)
└─ dotenv (16.3.1)

Middleware
└─ cors (2.8.5)

Database & Auth
└─ @supabase/supabase-js (2.38.4)

Payments
└─ razorpay (2.9.2)

Utilities
└─ uuid (9.0.1)

Dev Tools
├─ ts-node-dev (2.0.0)
└─ @types/* (various)
```

---

## 📦 Build & Deployment

### Development Build Process

```
Local Development
    │
    ├─ Metro Bundler (JavaScript)
    │   └─> Serves JS bundle to app
    │
    └─ Native Build Tools
        ├─ Android: Gradle
        └─ iOS: Xcode
    │
    ▼
Development APK/IPA
    │
    ├─ Install on emulator
    └─ Install on physical device
```

### Production Build Process

```
EAS Build (Expo Application Services)
    │
    ├─ Android
    │   │
    │   ▼
    │   Gradle Build
    │   │
    │   ├─ APK (older devices)
    │   └─ AAB (Google Play)
    │
    └─ iOS
        │
        ▼
        Xcode Build
        │
        └─ IPA (App Store)
    │
    ▼
App Store / Google Play
```

---

## 🔍 Debugging Architecture

### Error Handling Flow

```
Error Occurs
    │
    ├─ Frontend Error
    │   │
    │   ├─ Network Error
    │   │   └─> apiClient catches
    │   │       └─> Show user-friendly message
    │   │       └─> Log to console (dev only)
    │   │
    │   ├─ Component Error
    │   │   └─> Error Boundary (not implemented)
    │   │       └─> Show fallback UI
    │   │       └─> Log error
    │   │
    │   └─ Store Error
    │       └─> Zustand store catches
    │           └─> Update error state
    │           └─> Show toast/alert
    │
    └─ Backend Error
        │
        ├─ Validation Error (400)
        │   └─> Return { success: false, error: "message" }
        │
        ├─ Auth Error (401)
        │   └─> Return { success: false, error: "Unauthorized" }
        │
        ├─ Not Found (404)
        │   └─> Return { success: false, error: "Not found" }
        │
        └─ Server Error (500)
            └─> Log error
                └─> Return { success: false, error: "Server error" }
```

---

## 🚀 Performance Optimization

### Current Optimizations

```
Frontend
├─ Image Optimization
│   └─> expo-image-picker (compressed uploads)
│
├─ State Management
│   └─> Zustand (minimal re-renders)
│
├─ List Rendering
│   └─> FlatList with keyExtractor
│
└─ Caching
    └─> Location service (5min cache)

Backend
├─ Database Indexes (see roadmap)
├─ Response Caching (not implemented)
└─ Connection Pooling (Supabase handles)
```

### Planned Optimizations (Roadmap)

```
Phase 3: Performance
├─ Replace polling with WebSocket
├─ Implement offline mode (WatermelonDB sync)
├─ Add image compression before upload
├─ Lazy load screens (React.lazy)
├─ Memoize expensive computations
├─ Add database indexes
└─ Implement Redis caching
```

---

**This architecture is designed for scalability and maintainability.**

**Last Updated:** January 5, 2026  
**Version:** 1.0.0
