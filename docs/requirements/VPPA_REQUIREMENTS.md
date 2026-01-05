# Virtual Power Purchase Agreement (VPPA) - Requirements Document

## Document Information
- **Version**: 1.0
- **Date**: January 2025
- **Status**: Draft for Review
- **Project**: PowerNetPro Mobile Application

---

## 1. Executive Summary

This document outlines the requirements for implementing a **Virtual Power Purchase Agreement (VPPA)** system in the PowerNetPro application. The VPPA is a mandatory legal agreement that users must sign **before** they can participate in energy trading. The system supports two distinct agreement types: **Buyer VPPA** and **Seller VPPA**.

### Key Principles
- **Pre-trading Requirement**: Users cannot place orders or list as sellers without a valid, signed VPPA
- **Dynamic Pricing**: Agreements explicitly exclude fixed pricing terms (pricing is market-based)
- **Legal Compliance**: Generated PDF documents serve as legally binding records
- **User Experience**: Clear, intuitive flow with enhanced UI for agreement review

---

## 2. Business Requirements

### 2.1 Core Functionality

#### BR-1: Mandatory VPPA Before Trading
- **Requirement**: Users must sign at least one VPPA (Buyer or Seller) before engaging in trading activities
- **Buyer VPPA**: Required to place energy purchase orders
- **Seller VPPA**: Required to list energy for sale on the marketplace
- **Validation**: System must check VPPA status before allowing any trading action

#### BR-2: Separate Agreement Types
- **Buyer VPPA**: Agreement for users who want to purchase energy
- **Seller VPPA**: Agreement for users who want to sell energy
- **Both**: Users can sign both agreements if they want to buy and sell
- **Independence**: Each agreement type is independent and can be signed separately

#### BR-3: Dynamic Pricing Model
- **Requirement**: VPPA agreements must NOT include fixed pricing terms
- **Rationale**: Pricing is market-based and changes dynamically
- **Agreement Content**: Terms should reference "market-based pricing" or "prevailing market rates"
- **No Price Lock**: Agreements do not commit parties to specific price points

#### BR-4: Legal Document Generation
- **Requirement**: System must generate PDF documents for each signed VPPA
- **Purpose**: Legal compliance and record-keeping
- **Storage**: PDFs must be stored securely and be downloadable
- **Content**: PDF must include all terms, signatures, timestamps, and party information

#### BR-5: Digital Signature
- **Requirement**: Users sign agreements using text input (full legal name)
- **Validation**: Signature must be at least 3 characters
- **Legal Binding**: Text signature is legally binding under Indian e-signature laws
- **Storage**: Signature is stored with agreement record

---

## 3. Functional Requirements

### 3.1 User Onboarding Flow

#### FR-1: VPPA Onboarding Screen
- **Trigger**: User attempts to trade without signed VPPA OR first-time user
- **Content**:
  - Welcome message explaining VPPA requirement
  - Explanation of Buyer vs Seller VPPA
  - Options to sign:
    - "Sign Buyer VPPA" (for purchasing energy)
    - "Sign Seller VPPA" (for selling energy)
    - "Sign Both" (for buying and selling)
- **Navigation**: Routes to appropriate agreement screen based on selection

#### FR-2: Agreement Review Screen
- **Two Variants**: 
  - `BuyerVPPAScreen.tsx` - For buyer agreements
  - `SellerVPPAScreen.tsx` - For seller agreements
- **Content Display**:
  - Full agreement terms (scrollable)
  - Party information (user details, KYC status)
  - Agreement metadata (date, version, expiration)
  - Terms acceptance checkboxes
  - Digital signature input field
- **Actions**:
  - "Review Terms" - Expandable terms section
  - "Accept Terms" - Checkbox toggle
  - "I Consent to Digital Signature" - Checkbox toggle
  - "Sign Agreement" - Submit button (disabled until all conditions met)
  - "Decline" - Cancel and go back

#### FR-3: Agreement Signing Process
1. User reviews terms
2. User checks "Accept Terms" checkbox
3. User checks "Consent to Digital Signature" checkbox
4. User enters full legal name in signature field
5. User clicks "Sign Agreement"
6. System validates all inputs
7. System generates PDF document
8. System stores agreement in database
9. System uploads PDF to storage
10. System updates user's VPPA status
11. User sees success confirmation
12. User can download PDF immediately

#### FR-4: VPPA Status Management
- **Screen**: `VPPAStatusScreen.tsx`
- **Features**:
  - View signed agreements (Buyer/Seller)
  - Check agreement status (Active/Expired/Revoked)
  - View expiration dates
  - Download PDF documents
  - Renew expired agreements
  - Revoke active agreements (with confirmation)

---

### 3.2 Trading Flow Integration

#### FR-5: Order Placement Validation
- **Location**: `OrderScreen.tsx` (when user tries to place order)
- **Validation Flow**:
  1. User enters order details
  2. User clicks "Place Order"
  3. System checks if user has valid Buyer VPPA
  4. If NO VPPA:
     - Show error message: "You must sign a Buyer VPPA before placing orders"
     - Show button: "Sign Buyer VPPA Now"
     - Redirect to VPPA onboarding
  5. If VPPA EXPIRED:
     - Show warning: "Your Buyer VPPA has expired"
     - Show button: "Renew VPPA"
  6. If VPPA VALID:
     - Proceed with order placement

#### FR-6: Seller Listing Validation
- **Location**: `MarketplaceScreen.tsx` (when user tries to list as seller)
- **Validation Flow**:
  1. User attempts to list energy for sale
  2. System checks if user has valid Seller VPPA
  3. If NO VPPA:
     - Show banner: "Sign Seller VPPA to start selling energy"
     - Disable listing functionality
     - Show "Sign Seller VPPA" button
  4. If VPPA VALID:
     - Allow listing functionality

#### FR-7: Backend Trading Validation
- **Location**: `backend/src/index.ts` - `/trading/orders` endpoint
- **Middleware**: VPPA validation middleware
- **Validation**:
  - Extract user ID from auth token
  - Query database for active Buyer VPPA
  - Check if VPPA exists and is not expired
  - Return 403 error if VPPA missing/expired
  - Include error message: "Valid Buyer VPPA required for trading"

---

### 3.3 Agreement Terms Content

#### FR-8: Buyer VPPA Terms
**Must Include** (without fixed pricing):
- Agreement parties (Buyer and Platform)
- Agreement purpose (energy purchase)
- Energy delivery terms
- Delivery windows and scheduling
- Metering and measurement
- Payment terms (market-based pricing)
- Dispute resolution
- Force majeure clause
- Termination conditions
- Legal compliance statements
- Digital signature acknowledgment

#### FR-9: Seller VPPA Terms
**Must Include** (without fixed pricing):
- Agreement parties (Seller and Platform)
- Agreement purpose (energy sale)
- Energy supply terms
- Delivery obligations
- Metering and measurement
- Payment terms (market-based pricing)
- Quality standards
- Dispute resolution
- Force majeure clause
- Termination conditions
- Legal compliance statements
- Digital signature acknowledgment

#### FR-10: Dynamic Pricing Statement
**Required Text** (in both agreements):
> "Pricing for energy transactions shall be determined by prevailing market rates at the time of each transaction. This agreement does not establish fixed pricing terms. All transactions are subject to current market conditions and pricing may vary."

---

## 4. Technical Requirements

### 4.1 Database Schema

#### TR-1: VPPA Agreements Table
```sql
CREATE TABLE IF NOT EXISTS public.vppa_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  agreement_type TEXT NOT NULL CHECK (agreement_type IN ('buyer', 'seller')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'signed', 'expired', 'revoked')),
  signed_name TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  pdf_url TEXT, -- Supabase Storage URL
  terms_version TEXT DEFAULT '1.0',
  metadata JSONB, -- Additional agreement data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, agreement_type) -- One active agreement per type per user
);

-- Indexes for performance
CREATE INDEX idx_vppa_user_id ON public.vppa_agreements(user_id);
CREATE INDEX idx_vppa_status ON public.vppa_agreements(status);
CREATE INDEX idx_vppa_type ON public.vppa_agreements(agreement_type);
CREATE INDEX idx_vppa_expires ON public.vppa_agreements(expires_at);
```

#### TR-2: Row Level Security (RLS)
- Users can only read their own agreements
- Users can create their own agreements
- Users can update their own agreements (only draft status)
- System service role can read all agreements (for validation)

---

### 4.2 Backend API Endpoints

#### TR-3: VPPA Management Endpoints

**POST `/vppa/create`**
- **Purpose**: Create new VPPA agreement (draft)
- **Auth**: Required
- **Request Body**:
  ```json
  {
    "agreementType": "buyer" | "seller",
    "metadata": {} // Optional preferences
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "agreementType": "buyer",
      "status": "draft",
      "termsVersion": "1.0"
    }
  }
  ```

**GET `/vppa/status`**
- **Purpose**: Get user's VPPA status for both types
- **Auth**: Required
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "buyer": {
        "hasAgreement": true,
        "status": "signed",
        "signedAt": "2025-01-15T10:00:00Z",
        "expiresAt": "2026-01-15T10:00:00Z",
        "isValid": true
      },
      "seller": {
        "hasAgreement": false,
        "status": null,
        "isValid": false
      }
    }
  }
  ```

**GET `/vppa/:id`**
- **Purpose**: Get specific agreement details
- **Auth**: Required (must be agreement owner)
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "agreementType": "buyer",
      "status": "signed",
      "signedName": "John Doe",
      "signedAt": "2025-01-15T10:00:00Z",
      "expiresAt": "2026-01-15T10:00:00Z",
      "pdfUrl": "https://storage.supabase.co/...",
      "termsVersion": "1.0"
    }
  }
  ```

**POST `/vppa/:id/sign`**
- **Purpose**: Sign the agreement
- **Auth**: Required (must be agreement owner)
- **Request Body**:
  ```json
  {
    "signature": "Full Legal Name",
    "acceptedTerms": true,
    "consentedToDigitalSignature": true
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "status": "signed",
      "signedAt": "2025-01-15T10:00:00Z",
      "pdfUrl": "https://storage.supabase.co/..."
    }
  }
  ```
- **Side Effects**:
  - Generate PDF document
  - Upload PDF to Supabase Storage
  - Update agreement status to "signed"
  - Set expiration date (e.g., 1 year from signing)

**GET `/vppa/:id/pdf`**
- **Purpose**: Download PDF document
- **Auth**: Required (must be agreement owner)
- **Response**: PDF file download

**POST `/vppa/:id/revoke`**
- **Purpose**: Revoke/expire agreement
- **Auth**: Required (must be agreement owner)
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "status": "revoked"
    }
  }
  ```

#### TR-4: Trading Validation Middleware
- **Location**: Applied to `/trading/orders` endpoint
- **Function**: Check Buyer VPPA before order creation
- **Error Response** (403):
  ```json
  {
    "success": false,
    "error": "Valid Buyer VPPA required for trading",
    "code": "VPPA_REQUIRED"
  }
  ```

---

### 4.3 PDF Generation

#### TR-5: PDF Generation Service
- **Library**: `pdfkit` (Node.js) or `puppeteer` (HTML-to-PDF)
- **Location**: `backend/src/services/pdfGenerator.ts`
- **Function**: `generateVPPAPDF(agreementData)`
- **Input**: Agreement data, user info, terms content
- **Output**: PDF buffer
- **Content**:
  - Header with PowerNetPro branding
  - Agreement title (Buyer/Seller VPPA)
  - Parties section
  - Full terms and conditions
  - Signature section (with signed name and timestamp)
  - Footer with agreement ID and version

#### TR-6: PDF Storage
- **Storage**: Supabase Storage bucket `vppa-agreements`
- **Path Structure**: `{user_id}/{agreement_type}/{agreement_id}.pdf`
- **Access**: Private (authenticated users only)
- **Retention**: Permanent (for legal compliance)

---

### 4.4 Frontend Services

#### TR-7: VPPA Service
- **File**: `src/services/api/vppaService.ts`
- **Methods**:
  - `createVPPA(type: 'buyer' | 'seller')`
  - `getVPPAStatus()`
  - `getVPPA(agreementId: string)`
  - `signVPPA(agreementId: string, signature: string)`
  - `downloadPDF(agreementId: string)`
  - `revokeVPPA(agreementId: string)`
  - `checkTradingEligibility(type: 'buyer' | 'seller')`

#### TR-8: VPPA Store (Zustand)
- **File**: `src/store/vppaStore.ts`
- **State**:
  ```typescript
  {
    buyerVPPA: VPPAAgreement | null,
    sellerVPPA: VPPAAgreement | null,
    isLoading: boolean,
    lastChecked: Date | null
  }
  ```
- **Actions**:
  - `fetchVPPAStatus()`
  - `setBuyerVPPA(agreement)`
  - `setSellerVPPA(agreement)`
  - `clearVPPA()`
  - `isEligibleToTrade(type: 'buyer' | 'seller')`

---

### 4.5 Frontend Screens

#### TR-9: VPPA Onboarding Screen
- **File**: `src/screens/vppa/VPPAOnboardingScreen.tsx`
- **Purpose**: First-time VPPA introduction
- **UI Components**:
  - Welcome header
  - Information cards (Buyer vs Seller)
  - Action buttons (Sign Buyer, Sign Seller, Sign Both)
  - Skip option (with warning)

#### TR-10: Buyer VPPA Screen
- **File**: `src/screens/vppa/BuyerVPPAScreen.tsx`
- **Purpose**: Review and sign Buyer VPPA
- **UI Components**:
  - Scrollable terms section
  - Party information cards
  - Terms acceptance checkboxes
  - Digital signature input
  - Sign button (disabled until valid)
  - PDF preview/download option

#### TR-11: Seller VPPA Screen
- **File**: `src/screens/vppa/SellerVPPAScreen.tsx`
- **Purpose**: Review and sign Seller VPPA
- **UI Components**: Same as Buyer VPPA (different terms)

#### TR-12: VPPA Status Screen
- **File**: `src/screens/vppa/VPPAStatusScreen.tsx`
- **Purpose**: Manage signed agreements
- **UI Components**:
  - Agreement cards (Buyer/Seller)
  - Status badges
  - Expiration dates
  - Download PDF buttons
  - Renew/Revoke actions

---

### 4.6 Type Definitions

#### TR-13: TypeScript Types
- **File**: `src/types/index.ts`
- **Types to Add**:
  ```typescript
  export type VPPAType = 'buyer' | 'seller';
  export type VPPAStatus = 'draft' | 'signed' | 'expired' | 'revoked';

  export interface VPPAAgreement {
    id: string;
    userId: string;
    agreementType: VPPAType;
    status: VPPAStatus;
    signedName: string;
    signedAt?: Date;
    expiresAt?: Date;
    pdfUrl?: string;
    termsVersion: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface VPPAStatusResponse {
    buyer: {
      hasAgreement: boolean;
      status: VPPAStatus | null;
      signedAt?: Date;
      expiresAt?: Date;
      isValid: boolean;
    };
    seller: {
      hasAgreement: boolean;
      status: VPPAStatus | null;
      signedAt?: Date;
      expiresAt?: Date;
      isValid: boolean;
    };
  }
  ```

---

## 5. User Experience Requirements

### 5.1 Onboarding Flow

#### UX-1: First-Time User Experience
1. User completes registration/login
2. User navigates to trading/marketplace
3. System detects no VPPA
4. Modal or screen appears: "Sign VPPA to Start Trading"
5. User selects agreement type(s)
6. User reviews and signs agreement
7. User can now trade

#### UX-2: Returning User Experience
- VPPA status is cached
- No interruption if VPPA is valid
- Subtle reminder if VPPA expires soon (30 days before)

### 5.2 Agreement Review Experience

#### UX-3: Enhanced UI Features
- **Scrollable Terms**: Long-form terms in expandable sections
- **Progress Indicator**: Show which step user is on
- **Visual Hierarchy**: Clear sections for parties, terms, signature
- **Validation Feedback**: Real-time validation of signature input
- **Confirmation**: Success screen after signing with PDF download option

#### UX-4: Accessibility
- Screen reader support
- High contrast mode
- Large text options
- Clear error messages

---

## 6. Integration Points

### 6.1 Existing System Integration

#### INT-1: Authentication Integration
- Use existing `useAuthStore` for user identification
- Leverage existing JWT token validation

#### INT-2: KYC Integration
- Display KYC status in agreement screens
- Reference KYC verification in agreement terms

#### INT-3: Trading Flow Integration
- Modify `OrderScreen.tsx` to check VPPA
- Modify `MarketplaceScreen.tsx` to check VPPA
- Add backend validation middleware

#### INT-4: Navigation Integration
- Add VPPA screens to `AppNavigator.tsx`
- Conditional routing based on VPPA status
- Deep linking support for VPPA onboarding

---

## 7. Non-Functional Requirements

### 7.1 Performance

#### NFR-1: Response Times
- VPPA status check: < 200ms (cached)
- PDF generation: < 3 seconds
- Agreement signing: < 5 seconds (including PDF generation)

#### NFR-2: Caching
- VPPA status cached in Zustand store
- Cache invalidation on sign/revoke
- Cache TTL: 5 minutes

### 7.2 Security

#### NFR-3: Data Protection
- PDFs stored in private Supabase Storage bucket
- RLS policies enforce access control
- Signed names encrypted at rest (optional)

#### NFR-4: Validation
- Backend validates all VPPA operations
- Frontend validation for user experience
- Server-side validation is authoritative

### 7.3 Reliability

#### NFR-5: Error Handling
- Graceful degradation if PDF generation fails
- Retry mechanism for failed uploads
- Clear error messages for users

#### NFR-6: Data Integrity
- Database constraints prevent invalid states
- Unique constraints prevent duplicate agreements
- Transaction support for critical operations

---

## 8. Edge Cases & Error Scenarios

### 8.1 Agreement Expiration

#### EC-1: Expired Agreement
- **Scenario**: User's VPPA expires
- **Behavior**: 
  - Trading blocked
  - Show renewal prompt
  - Allow quick renewal flow

#### EC-2: Near Expiration
- **Scenario**: VPPA expires in < 30 days
- **Behavior**:
  - Show warning banner
  - Offer renewal option
  - Remind user periodically

### 8.2 Multiple Agreements

#### EC-3: User Signs Both Types
- **Scenario**: User signs Buyer and Seller VPPA
- **Behavior**:
  - Both agreements stored independently
  - User can trade as both buyer and seller
  - Each agreement has separate expiration

#### EC-4: Revoking Agreement
- **Scenario**: User revokes active VPPA
- **Behavior**:
  - Agreement status set to "revoked"
  - Trading blocked immediately
  - User must sign new agreement to resume trading
  - Old PDF retained for records

### 8.3 PDF Generation Failures

#### EC-5: PDF Generation Error
- **Scenario**: PDF generation fails during signing
- **Behavior**:
  - Show error message
  - Allow retry
  - Store agreement without PDF (mark for regeneration)
  - Background job to regenerate PDF

#### EC-6: Storage Upload Failure
- **Scenario**: PDF upload to Supabase Storage fails
- **Behavior**:
  - Retry upload (3 attempts)
  - If all retries fail, store agreement with error flag
  - Admin notification for manual intervention

### 8.4 Concurrent Operations

#### EC-7: Multiple Sign Attempts
- **Scenario**: User tries to sign same agreement twice
- **Behavior**:
  - Check if already signed
  - Return existing agreement if signed
  - Prevent duplicate signing

---

## 9. Testing Requirements

### 9.1 Unit Tests

#### TEST-1: Backend Services
- PDF generation service
- VPPA validation logic
- Database operations

#### TEST-2: Frontend Services
- VPPA service API calls
- Store state management
- Validation functions

### 9.2 Integration Tests

#### TEST-3: End-to-End Flows
- Complete VPPA signing flow
- Trading with VPPA validation
- PDF generation and download
- Agreement expiration handling

### 9.3 User Acceptance Tests

#### TEST-4: User Scenarios
- New user onboarding
- Buyer-only user flow
- Seller-only user flow
- Both buyer and seller flow
- Agreement renewal flow

---

## 10. Deployment Considerations

### 10.1 Database Migration

#### DEP-1: Migration Script
- Create `vppa_agreements` table
- Add indexes
- Set up RLS policies
- Backfill existing users (optional: grandfathered access)

### 10.2 Storage Setup

#### DEP-2: Supabase Storage
- Create `vppa-agreements` bucket
- Configure access policies
- Set up lifecycle rules (if needed)

### 10.3 Feature Flags

#### DEP-3: Gradual Rollout
- Feature flag for VPPA requirement
- Allow disabling for testing
- Monitor adoption metrics

---

## 11. Future Enhancements (Out of Scope)

### 11.1 Potential Future Features
- E-signature service integration (DocuSign, HelloSign)
- Signature drawing capability
- Agreement versioning and updates
- Automated renewal reminders
- Agreement analytics dashboard
- Multi-language support
- Agreement templates customization

---

## 12. Open Questions for Review

1. **Agreement Expiration**: What should be the default expiration period? (Suggested: 1 year)
2. **Grandfathering**: Should existing users be required to sign VPPA immediately, or have a grace period?
3. **Agreement Updates**: How should we handle updates to agreement terms for existing signed agreements?
4. **PDF Format**: Should PDFs include company letterhead/branding? What styling requirements?
5. **Metadata**: What specific metadata should be stored in the `metadata` JSONB field?
6. **Renewal Flow**: Should renewal require re-signing the entire agreement or simplified process?
7. **Notifications**: Should users receive email/push notifications for expiration warnings?
8. **Admin Access**: Should admins have ability to view/manage all agreements?

---

## 13. Approval & Sign-off

### Review Checklist
- [ ] Business requirements reviewed
- [ ] Technical requirements reviewed
- [ ] User experience requirements reviewed
- [ ] Integration points confirmed
- [ ] Edge cases addressed
- [ ] Open questions answered
- [ ] Timeline and resources estimated
- [ ] Approval for implementation

### Stakeholders
- **Product Owner**: ________________
- **Technical Lead**: ________________
- **Legal/Compliance**: ________________
- **UX Designer**: ________________

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-XX | Development Team | Initial requirements document |

---

**End of Document**

