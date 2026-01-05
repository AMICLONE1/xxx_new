# Quick Guide: Set API Base URL Permanently

## ✅ Simplest Method (Recommended)

### Step 1: Edit `app.json`

Open `app.json` and update line 56:

```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://your-backend-url.com"  // ← Change this
    }
  }
}
```

### Step 2: Restart Expo

```bash
npx expo start --clear
```

**That's it!** The URL is now permanently set.

---

## 📝 Examples

### For Local Development:
```json
"apiBaseUrl": "http://localhost:3000"
```

### For Staging:
```json
"apiBaseUrl": "https://staging-api.powernetpro.com"
```

### For Production:
```json
"apiBaseUrl": "https://api.powernetpro.com"
```

### To Disable API (Use Mock Data Only):
```json
"apiBaseUrl": "http://localhost:9999"  // Non-existent port, will use mock data
```

---

## 🔍 Verify It's Working

After restarting, check the console logs. You should see your configured URL being used (or no errors if using mock data).

---

## 📚 More Options

For advanced setup (multiple environments, .env files, etc.), see:
- `docs/setup/API_BASE_URL_SETUP.md`

---

**Current Setting:** `https://api.powernetpro.com` (in `app.json` line 56)

