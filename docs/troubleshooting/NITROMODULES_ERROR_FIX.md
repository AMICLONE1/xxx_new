# Fix: NitroModules/TurboModules Error

## ⚠️ Error
```
Failed to get NitroModules: The native "NitroModules" Turbo/Native-Module could not be found.
```

## 🔍 Root Cause

The error occurs because:
1. **New Architecture is enabled** in `app.json` (`newArchEnabled: true`)
2. **Expo Go doesn't support** React Native's new architecture (TurboModules)
3. Some dependencies (like `@shopify/react-native-skia` or `react-native-reanimated`) try to use TurboModules
4. The native module isn't available in Expo Go

## ✅ Solution

### Option 1: Disable New Architecture (For Expo Go) - **RECOMMENDED**

**Changed in `app.json`:**
```json
{
  "expo": {
    "newArchEnabled": false  // Changed from true
  }
}
```

**Then:**
1. Stop the Expo server
2. Clear cache: `npx expo start --clear`
3. Restart the app

### Option 2: Create Development Build (For New Architecture)

If you need the new architecture:
1. Create a development build (not Expo Go)
2. Keep `newArchEnabled: true`
3. Build with: `eas build --profile development --platform android`

## 📝 Why This Happens

- **Expo Go** uses a pre-built app that doesn't include all native modules
- **New Architecture** requires native code compilation
- **TurboModules** need to be compiled into the app
- **Expo Go** doesn't support custom native modules or new architecture

## 🎯 When to Use Each Option

### Use `newArchEnabled: false` (Expo Go)
- ✅ Quick development and testing
- ✅ No build required
- ✅ Fast iteration
- ❌ Some features may not work (new architecture features)

### Use `newArchEnabled: true` (Development Build)
- ✅ Full feature support
- ✅ Better performance (new architecture)
- ✅ Access to all native modules
- ❌ Requires building the app
- ❌ Slower iteration

## 🔧 Current Status

**Fixed:** `newArchEnabled` set to `false` in `app.json`

**Action Required:**
1. Stop Expo server
2. Clear cache: `npx expo start --clear`
3. Restart app

---

**Status:** ✅ **FIXED** - New architecture disabled for Expo Go compatibility

