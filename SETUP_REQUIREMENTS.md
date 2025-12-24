# PowerNetPro - Complete Setup Requirements Guide

This document provides a step-by-step guide for all required configurations and credentials needed to run the PowerNetPro mobile application.

---

## 📋 Table of Contents

1. [Environment Variables Setup](#1-environment-variables-setup)
2. [Backend API Configuration](#2-backend-api-configuration)
3. [Mapbox Integration](#3-mapbox-integration)
4. [Payment Gateway Setup](#4-payment-gateway-setup)
5. [Firebase Configuration](#5-firebase-configuration)
6. [Beckn Protocol Setup](#6-beckn-protocol-setup)
7. [App Configuration (app.json)](#7-app-configuration-appjson)
8. [Build Configuration](#8-build-configuration)

---

## 1. Environment Variables Setup

### Location: Create `.env` file in project root

**Steps:**
1. Create a `.env` file in the root directory (same level as `package.json`)
2. Add the following variables:

```env
# Backend API Configuration
API_BASE_URL=https://api.powernetpro.com

# Beckn Protocol Configuration
BECKN_GATEWAY_URL=https://gateway.becknprotocol.io
BECKN_DOMAIN=energy

# Mapbox Configuration
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here

# Payment Gateway Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
PHONEPE_MERCHANT_ID=your_phonepe_merchant_id
PHONEPE_SALT_KEY=your_phonepe_salt_key

# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id

# Optional: Development/Staging URLs
API_BASE_URL_STAGING=https://staging-api.powernetpro.com
API_BASE_URL_DEV=http://localhost:3000
```

**Important Notes:**
- Never commit `.env` file to git (already in `.gitignore`)
- Use different values for development, staging, and production
- For Expo, you may need to use `expo-constants` extra config (see app.json section)

---

## 2. Backend API Configuration

### Location: `app.json` (extra section) OR `.env` file

### Required API Endpoints

Your backend should implement the following endpoints:

#### Authentication Endpoints
```
POST /auth/send-otp
  Body: { phoneNumber: string }
  Response: { success: boolean, message: string }

POST /auth/verify-otp
  Body: { phoneNumber: string, otp: string }
  Response: { success: boolean, data: { token: string, user: User } }
```

#### KYC Endpoints
```
POST /kyc/upload-document
  Body: FormData { documentType, file, userId }
  Response: { success: boolean, data: { documentId: string } }

POST /kyc/liveness-check
  Body: FormData { image, userId }
  Response: { success: boolean, data: { checkId: string } }

GET /kyc/status
  Query: { userId: string }
  Response: { success: boolean, data: { status: KYCStatus, documents: [] } }
```

#### Meter Endpoints
```
POST /meters/register
  Body: { discomName, consumerNumber, meterSerialId, address, userId }
  Response: { success: boolean, data: { meterId: string } }

POST /meters/verify
  Body: { meterId: string }
  Response: { success: boolean, data: { verified: boolean } }

POST /meters/hardware-request
  Body: { userId, location: { lat, lng }, loadCapacity }
  Response: { success: boolean, data: { requestId: string } }

GET /meters/status
  Query: { meterId: string }
  Response: { success: boolean, data: { status: MeterStatus } }
```

#### Energy Data Endpoints
```
GET /energy/data
  Query: { meterId: string, startDate: string, endDate: string }
  Response: { success: boolean, data: EnergyData[] }

GET /energy/live
  Query: { meterId: string }
  Response: { success: boolean, data: { generation: number, consumption: number } }
```

#### Trading Endpoints
```
POST /trading/search
  Body: { location: { lat, lng, radius }, minPrice?, maxPrice?, greenEnergyOnly?, minRating? }
  Response: { success: boolean, data: Seller[] }

POST /trading/orders
  Body: { sellerId, energyAmount, pricePerUnit }
  Response: { success: boolean, data: Order }

GET /trading/orders/:orderId/status
  Response: { success: boolean, data: { order: Order, progress?: {} } }

POST /trading/orders/:orderId/cancel
  Response: { success: boolean }

GET /trading/orders/active
  Response: { success: boolean, data: Order[] }
```

#### Wallet Endpoints
```
GET /wallet/balance
  Query: { userId: string }
  Response: { success: boolean, data: { energyBalance: number, cashBalance: number } }

GET /wallet/transactions
  Query: { userId: string, limit?, offset? }
  Response: { success: boolean, data: Transaction[] }

POST /wallet/topup
  Body: { userId, amount, paymentMethod }
  Response: { success: boolean, data: { transactionId: string } }
```

### Configuration in app.json:
```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://api.powernetpro.com"
    }
  }
}
```

---

## 3. Mapbox Integration

### Location: `.env` file AND `app.json`

### Steps to Get Mapbox Access Token:

1. **Sign up for Mapbox:**
   - Go to https://www.mapbox.com/
   - Create a free account (50,000 map loads/month free)

2. **Get Access Token:**
   - Log in to Mapbox account
   - Go to Account → Access Tokens
   - Copy your default public token OR create a new token
   - Token format: `pk.eyJ1Ijoi...` (starts with `pk.`)

3. **Add to Configuration:**

   **Option A: Environment Variable (.env)**
   ```env
   MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91cl91c2VybmFtZSIsImEiOiJjbGV4YW1wbGUifQ.example
   ```

   **Option B: app.json (for Expo)**
   ```json
   {
     "expo": {
       "extra": {
         "mapboxAccessToken": "pk.eyJ1Ijoi..."
       }
     }
   }
   ```

4. **Install Mapbox SDK (if not already installed):**
   ```bash
   npm install @rnmapbox/maps
   ```

5. **Update MarketplaceScreen.tsx:**
   - The map view placeholder is ready
   - Replace the placeholder with actual Mapbox MapView component when token is configured

---

## 4. Payment Gateway Setup

### Location: `.env` file

### Option A: Razorpay Setup

1. **Sign up for Razorpay:**
   - Go to https://razorpay.com/
   - Create a business account
   - Complete KYC verification

2. **Get API Keys:**
   - Go to Dashboard → Settings → API Keys
   - Generate Test Keys (for development)
   - Generate Live Keys (for production)
   - Copy Key ID and Key Secret

3. **Add to .env:**
   ```env
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_key_secret_here
   ```

4. **Install Razorpay SDK:**
   ```bash
   npm install react-native-razorpay
   ```

5. **Update paymentService.ts:**
   - Uncomment and implement Razorpay integration
   - Use Key ID and Key Secret from environment variables

### Option B: PhonePe Setup

1. **Sign up for PhonePe:**
   - Go to https://merchant.phonepe.com/
   - Create merchant account
   - Complete onboarding

2. **Get Credentials:**
   - Merchant ID
   - Salt Key (from merchant dashboard)
   - API Key

3. **Add to .env:**
   ```env
   PHONEPE_MERCHANT_ID=your_merchant_id
   PHONEPE_SALT_KEY=your_salt_key
   PHONEPE_API_KEY=your_api_key
   ```

4. **Install PhonePe SDK:**
   ```bash
   npm install phonepe-pg
   ```

---

## 5. Supabase Configuration

### Location: `app.json` AND `.env` file

### Steps to Set Up Supabase:

1. **Create Supabase Project:**
   - Go to https://supabase.com/
   - Sign up with GitHub/Google/Email
   - Click "New Project"
   - Enter project name: "PowerNetPro"
   - Set database password (save it!)
   - Choose region (e.g., `ap-south-1` for India)
   - Click "Create new project"
   - Wait for project setup (1-2 minutes)

2. **Get Supabase Credentials:**
   - Go to Project Settings → API
   - Copy **Project URL** (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - Copy **anon public** key (starts with `eyJhbGci...`)
   - Copy **service_role** key (keep secret! server-side only)

3. **Add to .env:**
   ```env
   SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Server-side only
   ```

4. **Set Up Database Schema:**
   - Go to SQL Editor in Supabase Dashboard
   - Run the SQL from `SUPABASE_SETUP_GUIDE.md` Section 6
   - This creates all required tables

5. **Enable Authentication:**
   - Go to Authentication → Providers
   - Enable **Phone** provider
   - Configure SMS provider (Twilio recommended)
   - See `SUPABASE_SETUP_GUIDE.md` for details

6. **Set Up Storage Buckets:**
   - Go to Storage in Supabase Dashboard
   - Create buckets: `kyc-documents`, `electricity-bills`, `profile-images`
   - Configure storage policies
   - See `SUPABASE_SETUP_GUIDE.md` Section 8

7. **Configure Row Level Security (RLS):**
   - Enable RLS on all tables
   - Create security policies
   - See `SUPABASE_SETUP_GUIDE.md` Section 9

8. **Install Supabase SDK:**
   ```bash
   npm install @supabase/supabase-js
   npm install @react-native-async-storage/async-storage
   ```

**📖 For detailed setup instructions, see `SUPABASE_SETUP_GUIDE.md`**

---

## 6. Beckn Protocol Setup

### Location: `app.json` (already configured)

### Current Configuration:
```json
{
  "expo": {
    "extra": {
      "becknGatewayUrl": "https://gateway.becknprotocol.io",
      "becknDomain": "energy"
    }
  }
}
```

### Steps:

1. **Register with Beckn Network:**
   - Contact Beckn Foundation for network access
   - Get gateway credentials if required
   - Register your application as a BAP (Buyer App)

2. **Update Gateway URL (if using custom gateway):**
   - Update `becknGatewayUrl` in app.json
   - Or set `BECKN_GATEWAY_URL` in .env

3. **Configure Domain:**
   - Current domain: `energy`
   - Change if using different Beckn domain

4. **Test Connection:**
   - The app will automatically use Beckn Protocol for seller discovery
   - Falls back to API if Beckn is unavailable

---

## 7. App Configuration (app.json)

### Location: `app.json` (root directory)

### Current Configuration:
```json
{
  "expo": {
    "name": "PowerNetPro",
    "slug": "powernetpro",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.powernetpro.app"
    },
    "android": {
      "package": "com.powernetpro.app"
    },
    "extra": {
      "apiBaseUrl": "https://api.powernetpro.com",
      "becknGatewayUrl": "https://gateway.becknprotocol.io",
      "becknDomain": "energy"
    }
  }
}
```

### What to Update:

1. **Bundle Identifiers:**
   - iOS: `com.powernetpro.app` (change if needed)
   - Android: `com.powernetpro.app` (change if needed)

2. **Add Mapbox Token (Optional):**
   ```json
   {
     "expo": {
       "extra": {
         "mapboxAccessToken": "pk.eyJ1Ijoi..."
       }
     }
   }
   ```

3. **Update API URLs:**
   - Change `apiBaseUrl` to your backend URL
   - Use different URLs for dev/staging/prod

---

## 8. Build Configuration

### Location: `eas.json` (already exists)

### EAS Build Setup:

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Configure Project:**
   ```bash
   eas build:configure
   ```

4. **Set Environment Variables for Builds:**
   - Go to Expo Dashboard → Your Project → Secrets
   - Add all environment variables as secrets
   - Or use `eas.json` to configure build-specific variables

5. **Update eas.json for Environment Variables:**
   ```json
   {
     "build": {
       "production": {
         "env": {
           "API_BASE_URL": "https://api.powernetpro.com",
           "MAPBOX_ACCESS_TOKEN": "pk.eyJ1Ijoi...",
           "RAZORPAY_KEY_ID": "rzp_live_..."
         }
       },
       "development": {
         "env": {
           "API_BASE_URL": "https://dev-api.powernetpro.com"
         }
       }
     }
   }
   ```

---

## 📝 Quick Setup Checklist

### Immediate Requirements (Minimum to Run):
- [ ] Create `.env` file with `API_BASE_URL`
- [ ] Set up backend API endpoints (or use mock data)
- [ ] Configure `app.json` with correct bundle identifiers

### For Full Functionality:
- [ ] Get Mapbox access token
- [ ] Set up Razorpay/PhonePe account
- [ ] Configure Firebase project
- [ ] Register with Beckn network (optional)
- [ ] Set up push notifications

### For Production:
- [ ] Update all production API URLs
- [ ] Get production payment gateway keys
- [ ] Configure production Firebase project
- [ ] Set up EAS build secrets
- [ ] Test all integrations

---

## 🔒 Security Notes

1. **Never commit sensitive data:**
   - `.env` file is in `.gitignore`
   - Never commit API keys, tokens, or secrets

2. **Use different credentials for:**
   - Development
   - Staging
   - Production

3. **Rotate keys regularly:**
   - Update API keys every 90 days
   - Revoke old keys when updating

4. **Use environment-specific configs:**
   - Development: Local/mock services
   - Staging: Test credentials
   - Production: Live credentials

---

## 🆘 Troubleshooting

### Environment Variables Not Loading:
- Ensure `.env` file is in root directory
- Restart Expo dev server after adding variables
- For Expo, use `app.json` extra config instead

### Mapbox Not Working:
- Verify token starts with `pk.`
- Check token has correct permissions
- Ensure SDK is installed

### Payment Gateway Issues:
- Verify keys are correct (test vs live)
- Check merchant account is active
- Ensure SDK is properly installed

### Firebase Connection Issues:
- Verify `google-services.json` is in correct location
- Check package name matches Firebase config
- Ensure Firebase services are enabled

---

## 📞 Support Resources

- **Mapbox Docs:** https://docs.mapbox.com/
- **Razorpay Docs:** https://razorpay.com/docs/
- **Firebase Docs:** https://firebase.google.com/docs
- **Beckn Protocol:** https://docs.becknprotocol.io/
- **Expo Docs:** https://docs.expo.dev/

---

**Last Updated:** Based on current implementation status
**Version:** 1.0.0

