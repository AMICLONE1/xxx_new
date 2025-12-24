# PowerNetPro - Quick Setup Checklist

Use this checklist to set up your PowerNetPro app step by step.

## 📋 Setup Order (Recommended)

### Step 1: Basic Configuration (Required to Run)
- [ ] **Create `.env` file** in project root
  - Copy template from `SETUP_REQUIREMENTS.md`
  - Add at minimum: `API_BASE_URL`

- [ ] **Update `app.json`**
  - Verify bundle identifiers: `com.powernetpro.app`
  - Update API URLs if different from default

- [ ] **Install dependencies**
  ```bash
  npm install
  ```

- [ ] **Test basic app**
  ```bash
  npm start
  ```

---

### Step 2: Backend API Setup
- [ ] **Set up backend server** (or use mock data for testing)
  - See `SETUP_REQUIREMENTS.md` Section 2 for required endpoints
  - Minimum: Authentication endpoints

- [ ] **Update API URL in `.env`**
  ```env
  API_BASE_URL=https://your-backend-url.com
  ```

- [ ] **Test API connection**
  - Try login flow
  - Verify OTP sending/receiving

---

### Step 3: Mapbox Integration (For Marketplace Map View)
- [ ] **Sign up for Mapbox**
  - Go to: https://www.mapbox.com/
  - Create free account

- [ ] **Get access token**
  - Dashboard → Account → Access Tokens
  - Copy token (starts with `pk.`)

- [ ] **Add to `.env`**
  ```env
  MAPBOX_ACCESS_TOKEN=pk.eyJ1Ijoi...
  ```

- [ ] **Install Mapbox SDK** (if needed)
  ```bash
  npm install @rnmapbox/maps
  ```

- [ ] **Test map view**
  - Open Marketplace screen
  - Switch to Map view
  - Verify map loads

---

### Step 4: Payment Gateway Setup (For Wallet Top-up)
Choose one: Razorpay OR PhonePe

#### Option A: Razorpay
- [ ] **Sign up for Razorpay**
  - Go to: https://razorpay.com/
  - Complete business registration

- [ ] **Get API keys**
  - Dashboard → Settings → API Keys
  - Copy Key ID and Key Secret

- [ ] **Add to `.env`**
  ```env
  RAZORPAY_KEY_ID=rzp_test_...
  RAZORPAY_KEY_SECRET=...
  ```

- [ ] **Install SDK**
  ```bash
  npm install react-native-razorpay
  ```

#### Option B: PhonePe
- [ ] **Sign up for PhonePe**
  - Go to: https://merchant.phonepe.com/

- [ ] **Get credentials**
  - Merchant ID
  - Salt Key
  - API Key

- [ ] **Add to `.env`**
  ```env
  PHONEPE_MERCHANT_ID=...
  PHONEPE_SALT_KEY=...
  PHONEPE_API_KEY=...
  ```

---

### Step 5: Firebase Setup (For Real-time Data & Push Notifications)
- [ ] **Create Firebase project**
  - Go to: https://console.firebase.google.com/
  - Create new project: "PowerNetPro"

- [ ] **Add Android app**
  - Package: `com.powernetpro.app`
  - Download `google-services.json`
  - Place in: `android/app/` (when you eject/use bare workflow)

- [ ] **Add iOS app**
  - Bundle ID: `com.powernetpro.app`
  - Download `GoogleService-Info.plist`
  - Place in: `ios/` (when you eject/use bare workflow)

- [ ] **Get Firebase config**
  - Project Settings → General
  - Copy all config values

- [ ] **Add to `.env`**
  ```env
  FIREBASE_API_KEY=...
  FIREBASE_AUTH_DOMAIN=...
  FIREBASE_PROJECT_ID=...
  FIREBASE_STORAGE_BUCKET=...
  FIREBASE_MESSAGING_SENDER_ID=...
  FIREBASE_APP_ID=...
  ```

- [ ] **Enable Firebase services**
  - [ ] Authentication (Phone Auth)
  - [ ] Firestore Database
  - [ ] Cloud Storage
  - [ ] Cloud Messaging (FCM)

- [ ] **Install Firebase SDK**
  ```bash
  npm install @react-native-firebase/app
  npm install @react-native-firebase/auth
  npm install @react-native-firebase/firestore
  npm install @react-native-firebase/messaging
  ```

---

### Step 6: Beckn Protocol (Optional - For P2P Trading)
- [ ] **Register with Beckn Network**
  - Contact: Beckn Foundation
  - Get network access credentials

- [ ] **Update `app.json`** (if using custom gateway)
  ```json
  {
    "expo": {
      "extra": {
        "becknGatewayUrl": "https://your-gateway-url.com"
      }
    }
  }
  ```

- [ ] **Or add to `.env`**
  ```env
  BECKN_GATEWAY_URL=https://your-gateway-url.com
  BECKN_DOMAIN=energy
  ```

---

### Step 7: Build Configuration (For Production)
- [ ] **Install EAS CLI**
  ```bash
  npm install -g eas-cli
  ```

- [ ] **Login to Expo**
  ```bash
  eas login
  ```

- [ ] **Configure project**
  ```bash
  eas build:configure
  ```

- [ ] **Set build secrets** (in Expo Dashboard)
  - Go to: Expo Dashboard → Your Project → Secrets
  - Add all environment variables
  - Or configure in `eas.json`

- [ ] **Test build**
  ```bash
  eas build --platform android --profile development
  ```

---

## 🔍 Verification Checklist

After setup, verify each feature:

### Authentication
- [ ] Phone number login works
- [ ] OTP sending/receiving works
- [ ] User session persists

### KYC
- [ ] Document scanning works
- [ ] OCR extraction works
- [ ] Document upload works

### Marketplace
- [ ] Seller discovery works
- [ ] Filters work correctly
- [ ] Map view loads (if Mapbox configured)
- [ ] Order placement works

### Wallet
- [ ] Balance display works
- [ ] Top-up flow works (if payment gateway configured)
- [ ] Transaction history loads

### Energy Dashboard
- [ ] Live data displays
- [ ] Charts render correctly
- [ ] Fault detection works

---

## 📝 File Locations Summary

| Configuration | File Location |
|--------------|---------------|
| Environment Variables | `.env` (root directory) |
| App Config | `app.json` (root directory) |
| Build Config | `eas.json` (root directory) |
| Firebase Android | `android/app/google-services.json` |
| Firebase iOS | `ios/GoogleService-Info.plist` |

---

## ⚠️ Important Notes

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Use different credentials** for dev/staging/production
3. **Test each integration** before moving to production
4. **Keep credentials secure** - Rotate keys regularly

---

## 🆘 Need Help?

- See detailed instructions: `SETUP_REQUIREMENTS.md`
- Check implementation status: `IMPLEMENTATION_STATUS.md`
- Review code comments in service files

---

**Quick Start Command:**
```bash
# 1. Install dependencies
npm install

# 2. Create .env file (copy from SETUP_REQUIREMENTS.md)

# 3. Start development server
npm start

# 4. Run on device/emulator
npm run android  # or npm run ios
```

