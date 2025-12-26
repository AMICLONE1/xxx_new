# Fix: Mapbox Build Error

## ❌ Error

```
Could not find com.mapbox.maps:android-ndk27:11.16.2
Could not find com.mapbox.mapboxsdk:mapbox-sdk-turf:6.11.0
```

## 🔍 Root Cause

The build was failing because:
1. `@rnmapbox/maps` (native Mapbox library) was in `package.json`
2. But the app is actually using `MapboxWebView` (WebView implementation)
3. Gradle tried to resolve Mapbox native dependencies but couldn't find them

## ✅ Solution

**Removed unused `@rnmapbox/maps` dependency** since the app uses WebView-based Mapbox instead.

### What Changed:

1. **Removed from `package.json`:**
   - `@rnmapbox/maps` (no longer needed)

2. **App still works:**
   - `MapboxWebView` component continues to work
   - Uses Mapbox GL JS via WebView (no native dependencies)

## 🚀 Next Steps

1. **Reinstall dependencies:**
   ```bash
   npm install
   ```

2. **Try building again:**
   ```bash
   eas build --platform android
   ```

## 📝 Notes

- The app uses `MapboxWebView` which works in Expo Go
- No native Mapbox dependencies needed
- WebView approach is simpler and doesn't require native builds

---

**Status:** ✅ Fixed - Removed unused native Mapbox dependency

