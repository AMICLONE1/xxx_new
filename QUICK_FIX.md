# Quick Fix for Worklets Error

## Immediate Solution:

1. **Stop the Metro bundler** (if running)

2. **Run these commands in order:**
   ```bash
   # Clear all caches
   npx expo start --clear
   ```

3. **If using Expo Go:**
   - Close the Expo Go app completely
   - Restart Metro: `npx expo start --clear`
   - Reload the app (shake device > Reload)

4. **If using a development build:**
   ```bash
   # For Android
   npx expo run:android
   
   # For iOS  
   npx expo run:ios
   ```

5. **If error persists:**
   ```bash
   # Nuclear option - full clean
   rm -rf node_modules
   rm package-lock.json
   npm install
   npx expo start --clear
   ```

## Why This Happens:
The native part of react-native-reanimated (0.5.1) doesn't match the JavaScript part (0.7.1). This usually means:
- Native modules weren't rebuilt after installing dependencies
- Cache is stale
- App needs a fresh rebuild

## Prevention:
Always run `npx expo start --clear` after:
- Installing new dependencies
- Updating react-native-reanimated
- Switching branches
- After long periods of inactivity

