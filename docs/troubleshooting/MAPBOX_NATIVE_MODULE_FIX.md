# Fix: Mapbox Native Module Error

## Error Message
```
@rnmapbox/maps native code not available. Make sure you have linked the library and rebuild your app.
```

## Problem
`@rnmapbox/maps` is a **native module** that requires native code compilation. It **cannot run in Expo Go**. You need to create a **development build**.

## ✅ Solution: Create Development Build

### Option 1: Local Development Build (Recommended for Testing)

#### Step 1: Install EAS CLI (if not installed)
```bash
npm install -g eas-cli
```

#### Step 2: Login to Expo
```bash
eas login
```

#### Step 3: Configure EAS Build (if not done)
```bash
eas build:configure
```

#### Step 4: Create Development Build

**For Android:**
```bash
eas build --profile development --platform android
```

**For iOS (requires Mac):**
```bash
eas build --profile development --platform ios
```

#### Step 5: Install the Build
- **Android**: Download APK from EAS and install on device/emulator
- **iOS**: Install via TestFlight or direct install

#### Step 6: Run Development Server
```bash
npx expo start --dev-client
```

---

### Option 2: Local Build with Prebuild (Alternative)

#### Step 1: Generate Native Code
```bash
npx expo prebuild
```

#### Step 2: Run Native Build

**Android:**
```bash
npx expo run:android
```

**iOS (requires Mac):**
```bash
npx expo run:ios
```

---

### Option 3: Use Expo Go with Fallback (Quick Test)

If you want to test other features without Mapbox, the app will show a placeholder in map view when Mapbox is unavailable.

**Note**: Map view won't work in Expo Go, but list view will work fine.

---

## 🔧 Configuration Added

The Mapbox plugin has been added to `app.json`:

```json
{
  "plugins": [
    [
      "@rnmapbox/maps",
      {
        "RNMapboxMapsDownloadToken": "your_token_here"
      }
    ]
  ]
}
```

## 📱 Quick Start (After Build)

1. **Install the development build** on your device/emulator
2. **Start the dev server:**
   ```bash
   npx expo start --dev-client
   ```
3. **Open the app** - Mapbox will now work!

## ⚠️ Important Notes

1. **Expo Go Limitation**: Mapbox **cannot** work in Expo Go because it requires native code
2. **Development Build Required**: You must create a development build
3. **Token Configuration**: Token is already in `app.json` and plugin config
4. **Rebuild Needed**: After adding the plugin, you must rebuild

## 🚀 Recommended Workflow

1. **For Development:**
   - Create development build once
   - Use `npx expo start --dev-client` for hot reload
   - Test map features

2. **For Testing:**
   - Use list view in Expo Go (works fine)
   - Or create development build for full testing

3. **For Production:**
   - Create production build with EAS
   - Mapbox will work in production build

## 🔍 Verify Installation

After creating the build, verify:
1. App opens without errors
2. Marketplace screen loads
3. Map view shows (not placeholder)
4. Markers appear on map
5. User location shows

## 📝 Troubleshooting

### Build Fails
- Check EAS account is set up
- Verify token is correct
- Check build logs for errors

### Map Still Not Showing
- Verify token in `app.json` is correct
- Check plugin is in `app.json`
- Rebuild the app
- Clear cache: `npx expo start --clear`

### App Crashes
- Check native dependencies are installed
- Verify Expo SDK version compatibility
- Check build logs

## ✅ Status

- ✅ Plugin added to `app.json`
- ✅ Token configured
- ⏳ **Action Required**: Create development build

---

**Next Step**: Run `eas build --profile development --platform android` (or ios) to create the build.

