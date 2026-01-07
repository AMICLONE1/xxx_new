# PowerNetPro - Technical Debt & Optimization TODOs

> Last Updated: June 2025  
> Priority: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## 🔴 Critical Priority

### 1. Type Safety - Fix `any` Types
**Files:**
- [ ] `src/store/authStore.ts` (Line ~287)
- [ ] `src/services/database/databaseService.ts` (Line ~195)
- [ ] `src/services/api/authService.ts` (Lines ~98-99, ~260)

**Action:** Create proper TypeScript interfaces for:
```typescript
// Supabase Auth Response
interface SupabaseAuthData {
  user: SupabaseUser | null;
  session: Session | null;
  error: AuthError | null;
}

// User mapping function
interface SupabaseUserToUserParams {
  id: string;
  email?: string;
  phone?: string;
  created_at: string;
  user_metadata: Record<string, unknown>;
}
```

### 2. Backend Production URL
**Problem:** API defaults to `localhost` causing production failures.

**Action:**
- [ ] Add environment-based URL configuration
- [ ] Update `.env.production` with actual backend URL
- [ ] Test production build with correct API endpoint

### 3. Razorpay Integration
**Status:** Currently a stub implementation.

**Action:**
- [ ] Complete payment flow implementation
- [ ] Add test mode credentials
- [ ] Implement webhook handlers
- [ ] Add error handling for failed payments

---

## 🟠 High Priority

### 4. Error Boundaries
**Problem:** `ErrorBoundary.tsx` exists but not applied consistently.

**Action:**
```tsx
// Wrap all screens in navigation
<ErrorBoundary fallback={<ErrorFallback />}>
  <Screen />
</ErrorBoundary>
```

- [ ] Create reusable screen wrapper HOC
- [ ] Apply to all stack screens
- [ ] Add Sentry/error reporting integration

### 5. Large Screen Decomposition
**Problem:** Files over 1000 lines are hard to maintain.

| File | Lines | Action |
|------|-------|--------|
| `MarketplaceScreen.tsx` | 1761 | Extract: FilterModal, SellerCard, BuyerCard, MapView |
| `AnalyticsScreen.tsx` | 1708 | Extract: ChartSection, StatsCards, SiteManagement |
| `HomeScreen.tsx` | 1026 | Extract: EnergyFlowDiagram, WalletCard, QuickActions |

### 6. Separate Stylesheet Files
**Action:**
- [ ] Create `*.styles.ts` files for each large component
- [ ] Use `StyleSheet.compose()` for shared styles
- [ ] Follow naming convention: `ComponentName.styles.ts`

---

## 🟡 Medium Priority

### 7. State Management Consolidation
**Problem:** User data duplicated between stores.

**Current:**
```typescript
// authStore.ts
user: User | null;

// userStore.ts  
userData: User | null;
```

**Action:**
- [ ] Make `authStore` the single source of truth for user data
- [ ] Update components to use `useAuthStore()` for user info
- [ ] Deprecate or remove `userStore.userData`

### 8. API Retry Logic
**Action:**
```typescript
// Add to apiClient
const fetchWithRetry = async (url: string, options: RequestInit, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (i === retries - 1) throw error;
      await delay(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
};
```

### 9. Loading State Skeletons
**Action:**
- [ ] Add skeleton components for cards
- [ ] Replace `ActivityIndicator` with content-aware placeholders
- [ ] Use `react-native-skeleton-placeholder` or similar

### 10. Input Validation
**Forms needing validation:**
- [ ] KYC form - Aadhaar/PAN number formats
- [ ] Meter registration - All fields
- [ ] Trading bot configuration - Price limits
- [ ] Wallet withdrawal - Amount validation

---

## 🟢 Low Priority

### 11. Constants Extraction
**Hardcoded values to move:**
```typescript
// src/utils/constants.ts additions
export const DEFAULT_LOCATION = {
  lat: 18.5204, // Pune
  lng: 73.8567,
};

export const GRID_EMISSION_FACTOR = 0.82; // kg CO2 per kWh
export const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds
export const LOCATION_REFRESH_INTERVAL = 60000; // 60 seconds
```

### 12. Unit Tests
**Priority test files:**
- [ ] `src/utils/helpers.test.ts`
- [ ] `src/store/authStore.test.ts`
- [ ] `src/services/api/tradingService.test.ts`
- [ ] `src/components/analytics/SiteSelector.test.tsx`

### 13. Security Hardening
- [ ] Add rate limiting on login attempts
- [ ] Implement request signing for API calls
- [ ] Review CORS configuration (currently allow-all)
- [ ] Remove sensitive data from debug logs
- [ ] Add JWT token refresh logic

### 14. Performance Monitoring
- [ ] Add React Profiler to identify slow components
- [ ] Implement FlatList optimization (getItemLayout, etc.)
- [ ] Add image lazy loading
- [ ] Measure and optimize bundle size

---

## Completed This Session ✅

- [x] Fix memory leaks in MarketplaceScreen intervals
- [x] Add useCallback to HomeScreen navigation handlers
- [x] Remove duplicate formatEnergy/formatCurrency in AnalyticsScreen
- [x] Create centralized logger utility
- [x] Document all session changes

---

## Quick Reference: Code Quality Commands

```bash
# Type checking
npx tsc --noEmit

# Find any types
grep -r ": any" src/ --include="*.ts" --include="*.tsx"

# Find console.log (should use logger)
grep -r "console.log" src/ --include="*.ts" --include="*.tsx"

# Check for large files
find src -name "*.tsx" -exec wc -l {} + | sort -n | tail -20

# Run ESLint
npx eslint src/ --ext .ts,.tsx
```

---

## Architecture Improvements (Future)

1. **Feature-based folder structure** - Group by feature not by type
2. **React Query/TanStack Query** - Replace manual API state management
3. **Zod validation** - Runtime type validation for API responses
4. **MSW (Mock Service Worker)** - Better API mocking for tests
5. **Storybook** - Component documentation and testing

---

*This TODO list should be reviewed weekly and updated as items are completed or priorities change.*
