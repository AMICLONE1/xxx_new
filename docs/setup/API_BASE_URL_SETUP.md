# Setting Up API Base URL Permanently

## Overview

The `apiBaseUrl` can be configured in multiple ways. This guide shows you all options and recommends the best approach.

## Current Configuration

The API base URL is currently set in:
- **Primary:** `app.json` → `extra.apiBaseUrl`
- **Fallback:** Environment variable `API_BASE_URL`
- **Default:** `https://api.powernetpro.com` (if nothing is set)

## Configuration Options

### Option 1: Using `.env` File (Recommended for Development)

**Best for:** Local development, different environments, team collaboration

#### Step 1: Create `.env` file

Create a `.env` file in the project root (same level as `package.json`):

```env
API_BASE_URL=http://localhost:3000
```

Or for production:
```env
API_BASE_URL=https://your-actual-backend.com
```

#### Step 2: Install dotenv (if not already installed)

```bash
npm install dotenv
```

#### Step 3: Update `app.json` to use environment variable

The code already supports this! It checks in this order:
1. `Constants.expoConfig?.extra?.apiBaseUrl` (from app.json)
2. `process.env.API_BASE_URL` (from .env file)
3. Default: `https://api.powernetpro.com`

**Note:** For Expo, you need to use `expo-constants` which reads from `app.json`. To use `.env` directly, you may need `react-native-dotenv` or configure it in `babel.config.js`.

#### Step 4: Restart Expo

```bash
npx expo start --clear
```

---

### Option 2: Update `app.json` Directly (Simplest)

**Best for:** Quick changes, production builds

#### Step 1: Edit `app.json`

```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://your-backend-url.com"
    }
  }
}
```

#### Step 2: Restart Expo

```bash
npx expo start --clear
```

**Pros:**
- ✅ Simple and direct
- ✅ Works immediately
- ✅ No additional setup

**Cons:**
- ❌ Hard to manage different environments
- ❌ Changes require app.json modification

---

### Option 3: Environment-Specific Configuration (Best for Production)

**Best for:** Different URLs for dev/staging/production

#### Step 1: Update `app.json` with multiple URLs

```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://api.powernetpro.com",
      "apiBaseUrlStaging": "https://staging-api.powernetpro.com",
      "apiBaseUrlDev": "http://localhost:3000"
    }
  }
}
```

#### Step 2: Update `src/services/api/client.ts` to select based on environment

```typescript
import Constants from 'expo-constants';

const getApiBaseUrl = () => {
  const extra = Constants.expoConfig?.extra || {};
  
  // Use environment variable if set
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  
  // Use environment-specific URL
  if (__DEV__) {
    return extra.apiBaseUrlDev || extra.apiBaseUrl;
  }
  
  // Check for staging flag (you can add this)
  if (extra.useStaging) {
    return extra.apiBaseUrlStaging || extra.apiBaseUrl;
  }
  
  // Default to production
  return extra.apiBaseUrl || 'https://api.powernetpro.com';
};

const API_BASE_URL = getApiBaseUrl();
```

---

### Option 4: Using EAS Build Secrets (For Production)

**Best for:** Secure production builds with EAS

#### Step 1: Set secret in EAS

```bash
eas secret:create --scope project --name API_BASE_URL --value https://api.powernetpro.com
```

#### Step 2: Use in `app.json` or build configuration

EAS secrets can be accessed during build time.

---

## Recommended Setup

### For Development:

1. **Create `.env` file:**
   ```env
   API_BASE_URL=http://localhost:3000
   ```

2. **Keep `app.json` with production URL:**
   ```json
   {
     "expo": {
       "extra": {
         "apiBaseUrl": "https://api.powernetpro.com"
       }
     }
   }
   ```

3. **Update code to prioritize `.env`:**
   The current code already does this! It checks `process.env.API_BASE_URL` first.

### For Production:

1. **Update `app.json`:**
   ```json
   {
     "expo": {
       "extra": {
         "apiBaseUrl": "https://your-production-backend.com"
       }
     }
   }
   ```

2. **Build the app:**
   ```bash
   eas build --platform android
   ```

---

## Current Implementation

The API client (`src/services/api/client.ts`) already supports multiple sources:

```typescript
const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ||  // From app.json
  process.env.API_BASE_URL ||                  // From .env
  'https://api.powernetpro.com';              // Default
```

**Priority Order:**
1. `app.json` → `extra.apiBaseUrl` (highest priority)
2. `process.env.API_BASE_URL` (from .env)
3. Default fallback

---

## Quick Setup Guide

### To Set Your Backend URL Permanently:

**Option A: Simple (app.json only)**
```json
// app.json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://your-backend.com"
    }
  }
}
```

**Option B: With .env file**
1. Create `.env`:
   ```env
   API_BASE_URL=https://your-backend.com
   ```
2. Restart: `npx expo start --clear`

---

## Testing Your Configuration

After setting up, verify it's working:

1. **Check the URL being used:**
   Add a console log in `src/services/api/client.ts`:
   ```typescript
   console.log('API Base URL:', API_BASE_URL);
   ```

2. **Test API call:**
   - Open Marketplace screen
   - Check console logs
   - Should see your configured URL

---

## Troubleshooting

### URL Not Updating?

1. **Clear cache:**
   ```bash
   npx expo start --clear
   ```

2. **Check priority:**
   - `app.json` takes priority over `.env`
   - If both are set, `app.json` wins

3. **Verify format:**
   - No trailing slash: `https://api.example.com` ✅
   - Not: `https://api.example.com/` ❌

### Want to Disable API Calls?

Set to a non-existent URL or use mock data only:
```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "http://localhost:9999"  // Will fail, uses mock data
    }
  }
}
```

---

## Summary

**Permanent Setup Options:**

1. ✅ **app.json** - Simplest, works immediately
2. ✅ **.env file** - Better for different environments
3. ✅ **Environment-specific** - Best for dev/staging/prod
4. ✅ **EAS Secrets** - Best for secure production

**Recommended:** Use `app.json` for now, switch to `.env` when you need multiple environments.

---

**Last Updated:** December 2024

