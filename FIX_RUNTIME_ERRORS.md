# Runtime Error Fix Guide

## React Native Reanimated Worklets Error

If you see the error: `[Worklets] Mismatch between JavaScript part and native part of Worklets`

### Solution Steps:

1. **Stop the current Metro bundler** (Ctrl+C)

2. **Clear all caches:**
   ```bash
   # Clear Metro bundler cache
   npx expo start --clear
   
   # Or manually clear:
   rm -rf node_modules
   npm install
   ```

3. **For iOS (if applicable):**
   ```bash
   cd ios
   pod install
   cd ..
   ```

4. **For Android (if applicable):**
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

5. **Rebuild the app:**
   ```bash
   # For Expo Go - just restart
   npx expo start --clear
   
   # For development build:
   npx expo run:android
   # or
   npx expo run:ios
   ```

6. **If the error persists:**
   - Delete `node_modules` folder
   - Delete `package-lock.json`
   - Run `npm install`
   - Clear watchman cache: `watchman watch-del-all` (if installed)
   - Clear Metro cache: `npx expo start --clear`

### Common Causes:
- Native modules not properly linked after dependency installation
- Cache issues between JavaScript and native code
- Version mismatch in react-native-reanimated dependencies

### Verification:
After following these steps, the app should start without the Worklets error.

