# How to Start the Project

## 🚀 Quick Start

After the rebuild, follow these steps to start the project:

### 1. Clear Cache and Start (Recommended First Time)
```bash
npx expo start --clear
```

This will:
- Clear Metro bundler cache
- Clear Expo cache
- Start the development server
- Fix any Worklets version mismatch issues

### 2. Choose Your Platform

**For Expo Go (Quick Testing):**
- Scan the QR code with Expo Go app
- Or press `a` for Android / `i` for iOS simulator

**For Development Build:**
```bash
# Android
npx expo run:android

# iOS
npx expo run:ios
```

### 3. If You See Worklets Error

If you still see the Worklets version mismatch error:

1. **Stop the server** (Ctrl+C)
2. **Clear everything:**
   ```bash
   npx expo start --clear
   ```
3. **Close and reopen Expo Go app**
4. **Reload** (shake device > Reload)

### 4. Troubleshooting

**Metro bundler issues:**
```bash
# Clear watchman cache (if installed)
watchman watch-del-all

# Clear Metro cache
npx expo start --clear
```

**Native module issues:**
```bash
# Rebuild native modules
npx expo prebuild --clean
npx expo run:android  # or run:ios
```

## ✅ Project Status

- ✅ All dependencies installed
- ✅ All versions compatible with Expo SDK 54
- ✅ TypeScript compilation: PASSING
- ✅ All runtime errors fixed
- ✅ Ready to run!

## 📱 What to Expect

When you start the app:
1. You'll see the Login screen
2. Enter your email to receive OTP
3. Complete the onboarding flow
4. Register your meter or request hardware
5. Start trading energy!

---

**Note:** Some backend features are mocked (marked with TODO comments) and will need backend integration when ready.

