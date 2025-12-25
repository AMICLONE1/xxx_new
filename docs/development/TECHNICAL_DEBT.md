# Technical Debt & Code Quality Issues

## 🔴 Critical Issues

### 1. Authentication Token Not Retrieved
**File:** `src/services/api/client.ts:89`
```typescript
const token = ''; // TODO: Retrieve from auth store or secure storage
```
**Impact:** All authenticated API calls will fail  
**Fix Time:** 2 hours  
**Priority:** CRITICAL

---

### 2. Payment Service Not Implemented
**File:** `src/services/payments/paymentService.ts`
- All methods have TODO comments
- No actual payment SDK integration
**Impact:** Users cannot top-up or withdraw  
**Fix Time:** 3-5 days  
**Priority:** CRITICAL

---

### 3. Backend API Not Connected
**Files:** Multiple service files
- Services have structure but use mock data
- No real API endpoints connected
**Impact:** App works but doesn't persist data  
**Fix Time:** 2-3 weeks (backend + frontend)  
**Priority:** CRITICAL

---

## 🟡 High Priority Issues

### 4. Missing Error Boundaries
**Impact:** App crashes on unexpected errors  
**Fix:** Add React Error Boundaries  
**Time:** 1 day

### 5. No Loading States
**Files:** Multiple screens
**Impact:** Poor UX during API calls  
**Fix:** Add loading indicators  
**Time:** 2 days

### 6. No Retry Logic
**Files:** API client
**Impact:** Network failures cause permanent errors  
**Fix:** Implement exponential backoff  
**Time:** 1 day

---

## 🟢 Medium Priority Issues

### 7. Code Duplication
- Similar error handling in multiple places
- Similar loading state logic
**Fix:** Create reusable hooks/components  
**Time:** 2 days

### 8. Missing Type Safety
- Some `any` types still present
- Missing return types
**Fix:** Add proper types  
**Time:** 3 days

### 9. No Unit Tests
**Impact:** No confidence in code changes  
**Fix:** Add Jest tests  
**Time:** 1-2 weeks

---

## 📝 Code Quality Improvements

### Immediate (This Week)
- [ ] Fix auth token retrieval
- [ ] Add error boundaries
- [ ] Add loading states to critical screens
- [ ] Remove all `any` types

### Short-term (This Month)
- [ ] Add retry logic to API client
- [ ] Create reusable hooks
- [ ] Add unit tests (critical paths)
- [ ] Improve error messages

### Long-term (Next Quarter)
- [ ] 80%+ test coverage
- [ ] Performance optimization
- [ ] Code splitting
- [ ] Bundle size optimization

---

**Total Estimated Fix Time:** 4-6 weeks

