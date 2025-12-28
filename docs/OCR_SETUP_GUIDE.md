# OCR Configuration Guide

## Overview

The PowerNetPro app supports two OCR methods:

1. **Native ML Kit OCR** - Requires a development build (EAS Build)
2. **Cloud OCR (Google Cloud Vision)** - Works in Expo Go

## Current Status

When running in **Expo Go**, you'll see:
```
📱 Running in Expo Go - OCR disabled
❌ Bill OCR Error: ExpoGoDetectedError
```

This is **expected behavior** because Expo Go doesn't support native modules like ML Kit.

## Option 1: Enable Cloud OCR (Quick Fix for Expo Go)

### Step 1: Get Google Cloud Vision API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Cloud Vision API**
4. Create credentials → API Key
5. Copy the API key

### Step 2: Configure the App

Add your API key to `app.json`:

```json
{
  "expo": {
    "extra": {
      "googleCloudVisionApiKey": "YOUR_API_KEY_HERE"
    }
  }
}
```

### Step 3: Restart the App

```bash
npx expo start -c
```

Cloud OCR will now work automatically in Expo Go!

## Option 2: Create Development Build (Production Recommended)

For production apps, use a development build with native ML Kit:

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Configure EAS

```bash
eas build:configure
```

### Step 3: Create Development Build

```bash
# For Android
npx expo prebuild
npx expo run:android

# Or use EAS Build
eas build --profile development --platform android
```

### Step 4: Install on Device

Install the generated APK on your device and run:

```bash
npx expo start --dev-client
```

## Comparison

| Feature | Expo Go + Cloud OCR | Development Build |
|---------|---------------------|-------------------|
| Setup Time | 5 minutes | 30+ minutes |
| Cost | Pay per API call | Free |
| Offline | ❌ No | ✅ Yes |
| Speed | Slower (network) | Fast |
| Production Ready | ⚠️ Limited | ✅ Yes |

## Recommended Approach

- **Development/Testing**: Use Cloud OCR in Expo Go
- **Production**: Create development build with ML Kit

## Security Note

⚠️ For production, move the Google Cloud Vision API key to a backend service to prevent key exposure in the mobile app.
