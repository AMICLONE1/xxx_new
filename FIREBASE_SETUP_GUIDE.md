# Firebase Setup Guide - PowerNetPro

Complete step-by-step guide to set up Firebase for PowerNetPro mobile application.

---

## 📋 Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Create Firebase Project](#2-create-firebase-project)
3. [Android App Setup](#3-android-app-setup)
4. [iOS App Setup](#4-ios-app-setup)
5. [Install Firebase Dependencies](#5-install-firebase-dependencies)
6. [Configure Firebase in Code](#6-configure-firebase-in-code)
7. [Enable Firebase Services](#7-enable-firebase-services)
8. [Environment Variables](#8-environment-variables)
9. [Testing Firebase Integration](#9-testing-firebase-integration)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

Before starting, ensure you have:
- ✅ Google account
- ✅ Expo project set up
- ✅ Android/iOS development environment ready
- ✅ Node.js and npm installed

---

## 2. Create Firebase Project

### Step 2.1: Go to Firebase Console

1. Open your browser and go to: **https://console.firebase.google.com/**
2. Sign in with your Google account

### Step 2.2: Create New Project

1. Click **"Add project"** or **"Create a project"**
2. Enter project name: **"PowerNetPro"** (or your preferred name)
3. Click **"Continue"**

### Step 2.3: Configure Google Analytics (Optional but Recommended)

1. Choose whether to enable Google Analytics
   - **Recommended:** Enable for better insights
2. Select or create a Google Analytics account
3. Choose Analytics location (country)
4. Click **"Create project"**

### Step 2.4: Wait for Project Creation

- Firebase will create your project (takes 30-60 seconds)
- Click **"Continue"** when ready

### Step 2.5: Access Project Dashboard

- You'll be redirected to the Firebase project dashboard
- Note the project ID (shown in project settings)

---

## 3. Android App Setup

### Step 3.1: Add Android App to Firebase

1. In Firebase Console, click **"Add app"** or the Android icon
2. You'll see the "Add Firebase to your Android app" screen

### Step 3.2: Register Android App

1. **Android package name:** Enter `com.powernetpro.app`
   - ⚠️ This MUST match the package name in `app.json`
   - Current package: `com.powernetpro.app`

2. **App nickname (optional):** Enter "PowerNetPro Android"

3. **Debug signing certificate SHA-1 (optional):** 
   - For development, you can skip this
   - For production, you'll need to add SHA-1
   - To get SHA-1:
     ```bash
     # For Windows
     keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
     
     # For Mac/Linux
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```

4. Click **"Register app"**

### Step 3.3: Download google-services.json

1. Click **"Download google-services.json"**
2. **IMPORTANT:** Save this file - you'll need it later
3. Click **"Next"**

### Step 3.4: Add google-services.json to Project

**For Expo Managed Workflow:**
- You'll need to use `expo-build-properties` or eject to bare workflow
- Or use `@react-native-firebase/app` with custom native code

**For Bare React Native / Ejected Expo:**

1. Create `android/app/` directory if it doesn't exist
2. Copy `google-services.json` to: `android/app/google-services.json`
3. Verify the file is in the correct location:
   ```
   android/
     app/
       google-services.json  ← Should be here
       build.gradle
   ```

### Step 3.5: Configure Android Build Files

**Update `android/build.gradle` (Project level):**

```gradle
buildscript {
    dependencies {
        // Add this line
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

**Update `android/app/build.gradle` (App level):**

Add at the bottom of the file:
```gradle
apply plugin: 'com.google.gms.google-services'
```

### Step 3.6: Complete Android Setup

1. In Firebase Console, click **"Next"**
2. Skip the "Add Firebase SDK" step (we'll do this via npm)
3. Click **"Continue to console"**

---

## 4. iOS App Setup

### Step 4.1: Add iOS App to Firebase

1. In Firebase Console, click **"Add app"** again
2. Click the **iOS icon** (Apple logo)

### Step 4.2: Register iOS App

1. **iOS bundle ID:** Enter `com.powernetpro.app`
   - ⚠️ This MUST match the bundle identifier in `app.json`
   - Current bundle ID: `com.powernetpro.app`

2. **App nickname (optional):** Enter "PowerNetPro iOS"

3. **App Store ID (optional):** Leave blank for now

4. Click **"Register app"**

### Step 4.3: Download GoogleService-Info.plist

1. Click **"Download GoogleService-Info.plist"**
2. **IMPORTANT:** Save this file - you'll need it later
3. Click **"Next"**

### Step 4.4: Add GoogleService-Info.plist to Project

**For Expo Managed Workflow:**
- You'll need to use `expo-build-properties` or eject to bare workflow
- Or use `@react-native-firebase/app` with custom native code

**For Bare React Native / Ejected Expo:**

1. Open Xcode
2. Right-click on your project in the navigator
3. Select **"Add Files to [ProjectName]"**
4. Select `GoogleService-Info.plist`
5. Make sure **"Copy items if needed"** is checked
6. Select your app target
7. Click **"Add"**

**Or manually:**
1. Copy `GoogleService-Info.plist` to: `ios/GoogleService-Info.plist`
2. Add it to Xcode project

### Step 4.5: Configure iOS Build Files

**Update `ios/Podfile`:**

Add Firebase pods (if using CocoaPods):
```ruby
pod 'Firebase/Core'
pod 'Firebase/Auth'
pod 'Firebase/Firestore'
pod 'Firebase/Storage'
pod 'Firebase/Messaging'
```

Then run:
```bash
cd ios
pod install
```

### Step 4.6: Complete iOS Setup

1. In Firebase Console, click **"Next"**
2. Skip the "Add Firebase SDK" step (we'll do this via npm)
3. Click **"Continue to console"**

---

## 5. Install Firebase Dependencies

### Step 5.1: Install Core Firebase Package

```bash
npm install @react-native-firebase/app
```

### Step 5.2: Install Firebase Services

```bash
# Authentication (for phone auth)
npm install @react-native-firebase/auth

# Firestore (for database)
npm install @react-native-firebase/firestore

# Cloud Storage (for file uploads)
npm install @react-native-firebase/storage

# Cloud Messaging (for push notifications)
npm install @react-native-firebase/messaging

# Analytics (optional)
npm install @react-native-firebase/analytics
```

### Step 5.3: Install Peer Dependencies

```bash
npm install @react-native-async-storage/async-storage
```

### Step 5.4: For Expo Projects

If you're using Expo managed workflow, you'll need:

```bash
# Install expo-build-properties for native config
npx expo install expo-build-properties

# Or prebuild to generate native folders
npx expo prebuild
```

---

## 6. Configure Firebase in Code

### Step 6.1: Get Firebase Configuration Values

1. Go to Firebase Console → Project Settings (gear icon)
2. Scroll down to **"Your apps"** section
3. Click on your Android or iOS app
4. Copy the following values:

**For Android (from google-services.json):**
```json
{
  "project_info": {
    "project_number": "123456789012",
    "project_id": "powernetpro",
    "storage_bucket": "powernetpro.appspot.com"
  },
  "client": [{
    "client_info": {
      "android_client_info": {
        "package_name": "com.powernetpro.app"
      }
    },
    "oauth_client": [{
      "client_id": "...",
      "client_type": 3
    }],
    "api_key": [{
      "current_key": "AIzaSy..."
    }]
  }]
}
```

**For iOS (from GoogleService-Info.plist):**
```xml
<key>API_KEY</key>
<string>AIzaSy...</string>
<key>GCM_SENDER_ID</key>
<string>123456789012</string>
<key>PROJECT_ID</key>
<string>powernetpro</string>
<key>STORAGE_BUCKET</key>
<string>powernetpro.appspot.com</string>
```

### Step 6.2: Create Firebase Config File

Create `src/config/firebase.ts`:

```typescript
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import Constants from 'expo-constants';

// Get Firebase config from environment variables or app.json
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || process.env.FIREBASE_API_KEY,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || process.env.FIREBASE_AUTH_DOMAIN,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || process.env.FIREBASE_PROJECT_ID,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: Constants.expoConfig?.extra?.firebaseAppId || process.env.FIREBASE_APP_ID,
  measurementId: Constants.expoConfig?.extra?.firebaseMeasurementId || process.env.FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let storage: FirebaseStorage;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  firestore = getFirestore(app);
  storage = getStorage(app);
} else {
  app = getApps()[0];
  auth = getAuth(app);
  firestore = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, firestore, storage };
```

### Step 6.3: Update app.json with Firebase Config

Add Firebase config to `app.json`:

```json
{
  "expo": {
    "extra": {
      "firebaseApiKey": "AIzaSy...",
      "firebaseAuthDomain": "powernetpro.firebaseapp.com",
      "firebaseProjectId": "powernetpro",
      "firebaseStorageBucket": "powernetpro.appspot.com",
      "firebaseMessagingSenderId": "123456789012",
      "firebaseAppId": "1:123456789012:android:abcdef",
      "firebaseMeasurementId": "G-XXXXXXXXXX"
    }
  }
}
```

---

## 7. Enable Firebase Services

### Step 7.1: Enable Authentication

1. Go to Firebase Console → **Authentication**
2. Click **"Get started"**
3. Click **"Sign-in method"** tab
4. Enable **"Phone"** authentication:
   - Click on "Phone"
   - Toggle **"Enable"**
   - Click **"Save"**

### Step 7.2: Enable Firestore Database

1. Go to Firebase Console → **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for development)
   - ⚠️ **Important:** Update security rules for production!
4. Select location (choose closest to your users)
5. Click **"Enable"**

**Security Rules (for development):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

**Security Rules (for production - example):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /meters/{meterId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
  }
}
```

### Step 7.3: Enable Cloud Storage

1. Go to Firebase Console → **Storage**
2. Click **"Get started"**
3. Choose **"Start in test mode"** (for development)
4. Select location (same as Firestore)
5. Click **"Done"**

**Storage Rules (for development):**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

### Step 7.4: Enable Cloud Messaging (FCM)

1. Go to Firebase Console → **Cloud Messaging**
2. Click **"Get started"** (if first time)
3. For Android:
   - Go to Project Settings → Cloud Messaging
   - Copy **"Server key"** (you'll need this for push notifications)
4. For iOS:
   - Upload APNs certificate (for production)
   - Or use APNs Auth Key (recommended)

---

## 8. Environment Variables

### Step 8.1: Add to .env File

Add Firebase config to your `.env` file:

```env
# Firebase Configuration
FIREBASE_API_KEY=AIzaSyExample123456789
FIREBASE_AUTH_DOMAIN=powernetpro.firebaseapp.com
FIREBASE_PROJECT_ID=powernetpro
FIREBASE_STORAGE_BUCKET=powernetpro.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:android:abcdef123456
FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Step 8.2: Get Values from Firebase Console

1. Go to Firebase Console → Project Settings (gear icon)
2. Scroll to **"Your apps"** section
3. Click on your app
4. Copy values from:
   - **Android:** `google-services.json`
   - **iOS:** `GoogleService-Info.plist`

Or use the web config:
1. Click **"</>"** (web icon) to add a web app
2. Copy the `firebaseConfig` object values

---

## 9. Testing Firebase Integration

### Step 9.1: Test Authentication

Create a test file `src/services/firebase/testAuth.ts`:

```typescript
import { auth } from '@/config/firebase';
import { signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';

export const testPhoneAuth = async (phoneNumber: string) => {
  try {
    // This is a simplified example
    // In production, you'll need to set up reCAPTCHA
    console.log('Testing Firebase Auth connection...');
    console.log('Auth instance:', auth);
    return { success: true };
  } catch (error) {
    console.error('Firebase Auth test failed:', error);
    return { success: false, error };
  }
};
```

### Step 9.2: Test Firestore

Create a test file `src/services/firebase/testFirestore.ts`:

```typescript
import { firestore } from '@/config/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

export const testFirestore = async () => {
  try {
    // Test write
    const docRef = await addDoc(collection(firestore, 'test'), {
      message: 'Hello Firebase!',
      timestamp: new Date(),
    });
    console.log('Document written with ID:', docRef.id);

    // Test read
    const querySnapshot = await getDocs(collection(firestore, 'test'));
    querySnapshot.forEach((doc) => {
      console.log('Document:', doc.id, '=>', doc.data());
    });

    return { success: true };
  } catch (error) {
    console.error('Firebase Firestore test failed:', error);
    return { success: false, error };
  }
};
```

### Step 9.3: Test Storage

Create a test file `src/services/firebase/testStorage.ts`:

```typescript
import { storage } from '@/config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const testStorage = async (file: Blob) => {
  try {
    const storageRef = ref(storage, 'test/test-file.txt');
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    console.log('File uploaded, URL:', url);
    return { success: true, url };
  } catch (error) {
    console.error('Firebase Storage test failed:', error);
    return { success: false, error };
  }
};
```

### Step 9.4: Run Tests in App

Add test buttons in a development screen or use React Native Debugger to test.

---

## 10. Troubleshooting

### Issue: "Firebase App named '[DEFAULT]' already exists"

**Solution:**
```typescript
import { getApps, initializeApp } from 'firebase/app';

if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}
```

### Issue: "google-services.json not found"

**Solutions:**
1. Verify file is in `android/app/google-services.json`
2. Check file name is exactly `google-services.json` (case-sensitive)
3. Rebuild the app: `npx expo run:android`

### Issue: "GoogleService-Info.plist not found"

**Solutions:**
1. Verify file is added to Xcode project
2. Check file is in `ios/` directory
3. Clean build: `cd ios && xcodebuild clean`

### Issue: "Firebase Auth not working"

**Checklist:**
- [ ] Phone authentication is enabled in Firebase Console
- [ ] Correct API key in config
- [ ] reCAPTCHA is configured (for web)
- [ ] App is registered with correct package/bundle ID

### Issue: "Firestore permission denied"

**Solutions:**
1. Check Firestore security rules
2. Verify user is authenticated
3. Check database is in correct mode (test vs production)

### Issue: "Storage upload fails"

**Checklist:**
- [ ] Storage is enabled in Firebase Console
- [ ] Storage rules allow upload
- [ ] File size is within limits
- [ ] Correct storage bucket name

### Issue: "Push notifications not working"

**For Android:**
- [ ] FCM server key is configured
- [ ] `google-services.json` is in project
- [ ] App has notification permissions

**For iOS:**
- [ ] APNs certificate/key is uploaded
- [ ] `GoogleService-Info.plist` is in project
- [ ] Push notification capability is enabled in Xcode

---

## 📝 Quick Reference

### Firebase Console URLs

- **Main Console:** https://console.firebase.google.com/
- **Project Settings:** https://console.firebase.google.com/project/YOUR_PROJECT_ID/settings
- **Authentication:** https://console.firebase.google.com/project/YOUR_PROJECT_ID/authentication
- **Firestore:** https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore
- **Storage:** https://console.firebase.google.com/project/YOUR_PROJECT_ID/storage
- **Cloud Messaging:** https://console.firebase.google.com/project/YOUR_PROJECT_ID/settings/cloudmessaging

### Important Files

| File | Location | Purpose |
|------|----------|---------|
| `google-services.json` | `android/app/` | Android Firebase config |
| `GoogleService-Info.plist` | `ios/` | iOS Firebase config |
| `.env` | Root | Environment variables |
| `app.json` | Root | Expo config with Firebase values |
| `src/config/firebase.ts` | `src/config/` | Firebase initialization code |

### Common Commands

```bash
# Install Firebase packages
npm install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore

# Rebuild after adding native files
npx expo prebuild
npx expo run:android
npx expo run:ios

# Clean build (if issues)
cd android && ./gradlew clean
cd ios && pod install
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Firebase project created
- [ ] Android app registered with correct package name
- [ ] iOS app registered with correct bundle ID
- [ ] `google-services.json` downloaded and placed correctly
- [ ] `GoogleService-Info.plist` downloaded and added to Xcode
- [ ] Firebase packages installed
- [ ] Firebase config added to `.env` and `app.json`
- [ ] Authentication enabled (Phone)
- [ ] Firestore database created
- [ ] Cloud Storage enabled
- [ ] Cloud Messaging configured
- [ ] Test connection works
- [ ] Security rules configured

---

## 🎯 Next Steps

After Firebase is set up:

1. **Integrate Authentication:**
   - Update `src/services/api/authService.ts` to use Firebase Auth
   - Implement phone number authentication

2. **Set up Firestore Collections:**
   - Create collections: `users`, `meters`, `orders`, `transactions`
   - Set up security rules

3. **Implement Real-time Listeners:**
   - Listen to energy data updates
   - Listen to order status changes

4. **Set up Push Notifications:**
   - Configure FCM tokens
   - Handle notification messages

5. **Test in Production:**
   - Update security rules
   - Test with real devices
   - Monitor Firebase Console for errors

---

**Need Help?**
- Firebase Documentation: https://firebase.google.com/docs
- React Native Firebase: https://rnfirebase.io/
- Firebase Console: https://console.firebase.google.com/

