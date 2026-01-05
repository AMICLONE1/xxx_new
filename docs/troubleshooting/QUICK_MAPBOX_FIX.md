# 🚀 Quick Fix: Mapbox Native Module Error

## ⚠️ Error
```
@rnmapbox/maps native code not available. Make sure you have linked the library and rebuild your app.
```

## ✅ Solution: Create Development Build

**Mapbox requires native code and cannot run in Expo Go.** You need to create a development build.

### Quick Steps:

1. **Install EAS CLI** (if not installed):
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Create Development Build**:

   **For Android:**
   ```bash
   eas build --profile development --platform android
   ```

   **For iOS (requires Mac):**
   ```bash
   eas build --profile development --platform ios
   ```

4. **Wait for build to complete** (10-20 minutes)

5. **Install the APK/IPA** on your device/emulator

6. **Start dev server**:
   ```bash
   npx expo start --dev-client
   ```

7. **Open the app** - Mapbox will now work! 🎉

---

## 🔧 What Was Fixed

✅ **Added Mapbox plugin to `app.json`**
✅ **Added graceful fallback** - App won't crash in Expo Go
✅ **Better error messages** - Clear instructions shown

---

## 📱 Alternative: Use List View

If you want to test other features without building:
- **List view works fine in Expo Go** ✅
- Just use the list view instead of map view
- Map view will show helpful instructions

---

## ⏱️ Build Time

- **Android**: ~15-20 minutes
- **iOS**: ~20-30 minutes

After the first build, subsequent builds are faster.

---

## ✅ After Build

Once you have the development build:
- Mapbox will work perfectly
- All map features will be available
- Hot reload will work
- You can develop normally

---

**Status**: Plugin configured ✅ | **Action Required**: Create development build

