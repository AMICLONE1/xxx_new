# Clear Expo Cache - Step by Step

## ⚠️ Issue
Expo is still using cached `app.json` with old Supabase URL.

## ✅ Solution

### Step 1: Stop Expo
Press `Ctrl+C` in the terminal where Expo is running.

### Step 2: Clear All Caches

Run these commands:

```bash
# Delete Expo cache
rm -rf .expo

# Delete node_modules cache
rm -rf node_modules/.cache

# On Windows PowerShell:
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
```

### Step 3: Restart Expo with Clear Flag

```bash
npm start -- --clear
```

Or:
```bash
npx expo start -c
```

### Step 4: Reload App
- Shake device → Reload
- Or press `r` in terminal

---

## 🔍 Verify

After restart, check manifest. Should show:
```json
"apiBaseUrl": "https://xxxmapnp-production.up.railway.app"
```

---

## 💡 Alternative: Force Rebuild

If still not working:

```bash
# Stop Expo
# Delete all caches
rm -rf .expo node_modules/.cache

# Reinstall dependencies (optional)
npm install

# Start fresh
npm start -- --clear
```

