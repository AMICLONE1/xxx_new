# Enable GPS Location in Android Emulator

## Quick Fix

The location service error is **NOT critical** - the app automatically falls back to Pune coordinates when GPS is unavailable. However, if you want to test with real GPS coordinates:

### Method 1: Set Location via Emulator Extended Controls

1. **Open the emulator** (Android Virtual Device)
2. Click the **three dots (...)** on the emulator toolbar (right side)
3. Select **Location** from the menu
4. Enter coordinates:
   - **Latitude**: `18.5204` (Pune)
   - **Longitude**: `73.8567` (Pune)
5. Click **Send**

### Method 2: Enable Location via Settings

1. Open **Settings** in the emulator
2. Go to **Location**
3. Toggle **Use location** to **ON**
4. Select **Google Location Accuracy** → **Improve Location Accuracy** → **ON**

### Method 3: ADB Command (Command Line)

```bash
adb emu geo fix 73.8567 18.5204
```

## Verify Location is Working

After enabling location:
1. Open **Google Maps** app in the emulator
2. You should see your location marker at the set coordinates
3. Return to PowerNetPro app and pull down to refresh

## Notes

- The app is **already working** with fallback location (Pune)
- Location errors are suppressed in production
- Mock sellers are generated based on the location (Pune by default)
- No action required unless you need to test with different GPS coordinates
