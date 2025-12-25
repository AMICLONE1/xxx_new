# Backend API Requirements

## 🔑 Required API Keys & Configuration

### Currently Needed:

#### 1. Backend API Base URL ⚠️ **REQUIRED**
**Current:** `https://api.powernetpro.com` (placeholder)  
**Location:** `app.json` line 56

**Action:** Update to your actual backend URL:
```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://your-actual-backend.com"
    }
  }
}
```

---

#### 2. Razorpay Keys ⏳ **FOR PAYMENT INTEGRATION**
**Status:** Pending

**Required:**
- **Razorpay Key ID** (Public key)
- **Razorpay Key Secret** (Private key - backend only)

**Where to get:**
1. Sign up at https://razorpay.com
2. Go to Settings → API Keys
3. Generate test keys (for development)
4. Generate live keys (for production)

**Configuration:**
```json
// app.json
{
  "expo": {
    "extra": {
      "razorpayKeyId": "rzp_test_xxxxxxxxxxxxx",
      "razorpayKeySecret": "your_secret_key"  // Backend only, not in app.json
    }
  }
}
```

**Note:** Key Secret should NOT be in app.json. It should be on backend only.

---

#### 3. PhonePe Keys (Optional) ⏳
**Status:** Optional

**Required:**
- **PhonePe Merchant ID**
- **PhonePe Salt Key**

**Configuration:**
```json
// app.json
{
  "expo": {
    "extra": {
      "phonepeMerchantId": "your_merchant_id",
      "phonepeSaltKey": "your_salt_key"  // Backend only
    }
  }
}
```

---

## 📋 Backend API Endpoints Required

### Authentication Endpoints
✅ **Already using Supabase** - No additional endpoints needed

### Meter Management
- ✅ `POST /meters/register` - **READY** (Connected)
- ✅ `GET /meters` - **READY** (Using Supabase)
- ✅ `POST /meters/:id/verify` - **READY** (Service ready)
- ✅ `POST /meters/request-installation` - **READY** (Connected)

### Energy Data
- ✅ `GET /energy-data/:meterId` - **READY** (Using Supabase)
- ✅ `POST /energy-data` - **READY** (Using Supabase)

### Trading
- ✅ `POST /trading/search` - **READY** (Connected, mock fallback)
- ✅ `POST /trading/orders` - **READY** (Connected)
- ✅ `GET /trading/orders/:id/status` - **READY** (Service ready)
- ✅ `GET /trading/orders/active` - **READY** (Service ready)
- ✅ `POST /trading/orders/:id/cancel` - **READY** (Service ready)

### Wallet
- ✅ `GET /wallet/balance` - **READY** (Using Supabase)
- ✅ `GET /wallet/transactions` - **READY** (Using Supabase)
- ✅ `POST /wallet/top-up` - **READY** (Connected)
- ✅ `POST /wallet/withdraw` - **READY** (Connected)
- ✅ `GET /wallet/withdraw/:id/status` - **READY** (Connected)

### KYC
- ✅ `POST /kyc/documents` - **READY** (Service ready)
- ✅ `POST /kyc/liveness` - **READY** (Service ready)
- ✅ `GET /kyc/status` - **READY** (Connected)

### Payments
- ⏳ `POST /payments/initiate` - **PENDING** (Needs Razorpay keys)
- ⏳ `POST /payments/verify` - **PENDING** (Needs Razorpay keys)

---

## 🔧 Backend API Specifications

### Request Format
- **Method:** REST (GET, POST, PUT, DELETE)
- **Content-Type:** `application/json`
- **Authentication:** Bearer token in `Authorization` header
- **Base URL:** Configurable in `app.json`

### Response Format
```typescript
{
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

### Error Codes
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limited (will retry)
- `500` - Server Error (will retry)
- `TIMEOUT` - Request timeout (will retry)
- `NETWORK_ERROR` - Network failure (will retry)

---

## 📝 What to Provide

### Immediate (To Test):
1. **Backend API URL** - Update `app.json` line 56
2. **Test API Endpoints** - Verify endpoints are working

### For Payment Integration:
1. **Razorpay Key ID** - Add to `app.json`
2. **Backend Payment Endpoints** - `/payments/initiate` and `/payments/verify`

---

## ✅ Current Status

**All code is ready!** Just need:
1. Backend API URL
2. Razorpay keys (for payment SDK)

Once provided, the app will be fully functional!

---

**Last Updated:** December 2024

