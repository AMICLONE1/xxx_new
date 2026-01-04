# OCR Not Working - Fix Guide

## Why OCR Shows "Manual Entry"

The OCR (Optical Character Recognition) feature in the Electric Bill Scan screen requires **native code** from ML Kit. This **does not work in Expo Go**.

### Current Behavior
When you run the app in Expo Go and try to scan an electricity bill:
1. The app detects it's running in Expo Go
2. ML Kit is not available (requires native build)
3. The app falls back to manual entry mode

## Solutions

### Option 1: Build a Development Build (RECOMMENDED)

This is the best solution for testing OCR properly.

**Step 1: Install EAS CLI**
```bash
npm install -g eas-cli
```

**Step 2: Login to Expo**
```bash
eas login
```

**Step 3: Build Development APK (Android)**
```bash
eas build --profile development --platform android
```

**Step 4: Download and Install**
- Download the APK from the EAS dashboard
- Install it on your Android device
- Run `npx expo start --dev-client`
- Scan the QR code with the development build app

### Option 2: Configure Google Cloud Vision API (Works in Expo Go)

If you can't build a development build, you can use Google Cloud Vision API as a fallback.

**Step 1: Create a Google Cloud Project**
1. Go to https://console.cloud.google.com
2. Create a new project or select existing
3. Enable the **Cloud Vision API**

**Step 2: Create API Key**
1. Go to APIs & Services > Credentials
2. Create an API key
3. (Optional) Restrict the key to Cloud Vision API

**Step 3: Add to app.json**
Add the API key to your `app.json`:
```json
{
  "expo": {
    "extra": {
      "googleCloudVisionApiKey": "YOUR_ACTUAL_API_KEY_HERE"
    }
  }
}
```

**Step 4: Restart the App**
```bash
npx expo start --clear
```

### Option 3: Manual Entry (Current Workaround)

If you don't want to set up OCR:
1. Upload the electricity bill image
2. The app will show empty form fields
3. Manually enter all the details:
   - Consumer Number
   - Meter Number
   - DISCOM Name
   - Bill Amount
   - etc.

## Testing OCR

### In Development Build:
- OCR should work automatically
- Upload a clear bill image
- Data should be extracted

### In Expo Go with Cloud Vision:
- Requires API key configured
- Works with internet connection
- May have usage limits

### In Expo Go without Cloud Vision:
- Falls back to manual entry
- All fields must be entered manually

## Troubleshooting

### "ML Kit not linked" Error
- You're running in Expo Go
- Solution: Use development build

### "Cloud OCR not configured"
- Google Cloud Vision API key not set
- Solution: Add API key to app.json

### "OCR returned empty result"
- Image is unclear or blurry
- Solution: Take a clearer photo

### Network Errors in Cloud OCR
- No internet connection
- API key may be invalid
- Solution: Check connection and API key

## File Locations

- OCR Service: `src/services/mlkit/ocrService.ts`
- Cloud OCR Service: `src/services/cloudOcrService.ts`
- Electric Bill Screen: `src/screens/kyc/ElectricityBillScanScreen.tsx`
