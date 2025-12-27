# PowerNetPro Admin Application – Core Operations TRD
**Version:** 1.0  
**Status:** Draft for Development  
**Target Platform:** Web Application (React/Next.js)  
**Date:** December 2025

---

## 1. Executive Summary

The PowerNetPro Admin Application (Core Operations) is a comprehensive web-based administrative platform designed to manage the day-to-day operations of the PowerNetPro P2P energy trading ecosystem. This application enables administrators to verify users, approve meters, manage KYC processes, handle withdrawal requests, monitor trades, and ensure platform compliance.

This TRD focuses on **core operational workflows** that are essential for platform management, including user verification, meter approval, KYC processing, financial operations, and basic monitoring.

---

## 2. Product Scope

### 2.1 In-Scope (Core Operations)

**User Management:**
- User account overview and management
- User status management (active, suspended, banned)
- User profile viewing and editing
- User search and filtering

**KYC Management:**
- Document review and verification
- Liveness check verification
- Business document verification (GST, Society Registration)
- KYC status management (approve/reject)
- Rejection reason management

**Meter Management:**
- Meter registration review
- Meter verification (approve/reject)
- Hardware installation request management
- Meter status tracking
- Energy data monitoring

**Financial Operations:**
- Withdrawal request approval/rejection
- Transaction monitoring
- Wallet balance management
- Refund processing
- Payment gateway reconciliation

**Trading Operations:**
- Order monitoring and oversight
- Dispute resolution
- Order cancellation (admin override)
- Trade history review

**Basic Analytics:**
- User statistics dashboard
- Trading volume metrics
- Financial summary
- Platform health indicators

### 2.2 Out-of-Scope (This Document)

- Advanced analytics and reporting (see Advanced Admin TRD)
- System configuration and settings
- Compliance and audit logging (see Advanced Admin TRD)
- API management
- Third-party integrations management

---

## 3. System Architecture

### 3.1 High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Web Application                     │
│                  (React/Next.js Frontend)                    │
└──────────────────────┬──────────────────────────────────────┘
                        │
                        │ HTTPS/REST API
                        │
┌───────────────────────▼──────────────────────────────────────┐
│                    Admin Backend API                         │
│              (Node.js/Express + Supabase)                    │
└───────────────────────┬──────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│   Supabase   │ │  Payment   │ │  Utility   │
│  Database    │ │  Gateway   │ │   APIs     │
│  (PostgreSQL)│ │ (Razorpay) │ │  (DISCOM)  │
└──────────────┘ └────────────┘ └────────────┘
```

### 3.2 Key Components

**Frontend:**
- React/Next.js web application
- Admin dashboard with role-based access
- Real-time updates via WebSocket/SSE
- Responsive design for desktop/tablet

**Backend:**
- RESTful API endpoints
- Authentication & authorization (JWT)
- Role-based access control (RBAC)
- Audit logging

**Database:**
- Supabase PostgreSQL (shared with mobile app)
- Admin-specific tables (audit logs, admin actions)

---

## 4. Technical Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Frontend Framework** | Next.js 14+ (React) | Server-side rendering, SEO, fast development |
| **Language** | TypeScript | Type safety, better maintainability |
| **State Management** | Zustand / React Query | Lightweight, perfect for admin dashboards |
| **UI Library** | Tailwind CSS + shadcn/ui | Modern, customizable, accessible components |
| **Charts** | Recharts / Chart.js | Rich data visualization |
| **Authentication** | NextAuth.js / Supabase Auth | Secure admin authentication |
| **Backend** | Node.js/Express (shared API) | Consistent with mobile app backend |
| **Database** | Supabase PostgreSQL | Shared database with mobile app |
| **File Storage** | Supabase Storage | Document and image storage |
| **Real-time** | Supabase Realtime / WebSocket | Live updates for admin actions |

---

## 5. Functional Requirements

### 5.1 Module: Authentication & Authorization

**FR-AUTH-01: Admin Login**
- Admin users must authenticate via email/password or SSO
- Support for multi-factor authentication (MFA)
- Session management with configurable timeout
- Password reset functionality

**FR-AUTH-02: Role-Based Access Control (RBAC)**
- Support for multiple admin roles:
  - **Super Admin:** Full system access
  - **Operations Admin:** User, KYC, Meter management
  - **Financial Admin:** Withdrawal, transaction management
  - **Support Admin:** User support, dispute resolution
  - **Viewer:** Read-only access
- Permission-based feature access
- Role assignment and management

**FR-AUTH-03: Session Management**
- Active session monitoring
- Force logout capability
- Session history tracking
- IP address logging

---

### 5.2 Module: User Management

**FR-USER-01: User Overview Dashboard**
- Display all registered users in a table/grid
- Columns: User ID, Name, Email, Phone, KYC Status, Account Status, Registration Date, Last Login
- Pagination (50 users per page)
- Export to CSV/Excel

**FR-USER-02: User Search & Filtering**
- Search by: User ID, Email, Phone, Name
- Filter by: KYC Status, Account Status, Registration Date Range, User Type
- Advanced filters: Has Meter, Has Active Orders, Wallet Balance Range

**FR-USER-03: User Profile View**
- Complete user profile display:
  - Basic info (name, email, phone, registration date)
  - KYC status and documents
  - Associated meters
  - Wallet balances (energy & cash)
  - Trading history summary
  - Account status and flags
- Action buttons: Suspend, Ban, Reset Password, Send Notification

**FR-USER-04: User Status Management**
- **Suspend Account:** Temporarily disable user access
  - Reason required
  - Duration (temporary or indefinite)
  - Notification sent to user
- **Ban Account:** Permanently disable user
  - Reason required
  - Appeal process available
  - Notification sent to user
- **Activate Account:** Restore suspended/banned account
- **Delete Account:** Soft delete (DPDP compliance)
  - Data anonymization option
  - Audit log entry

**FR-USER-05: User Communication**
- Send in-app notifications
- Send email notifications
- View user's notification history
- Communication templates

---

### 5.3 Module: KYC Management

**FR-KYC-01: KYC Dashboard**
- Overview of all KYC submissions
- Status breakdown: Pending, Verified, Rejected
- Pending count badge
- Filter by: Status, Document Type, Submission Date

**FR-KYC-02: Document Review**
- View uploaded documents (Aadhaar, PAN, Electricity Bill, GST, Society Registration)
- Document viewer with zoom, rotate, download
- OCR extracted data display
- Side-by-side comparison (document vs extracted data)
- Flag suspicious documents

**FR-KYC-03: Liveness Check Review**
- View liveness check selfie
- Compare with ID document photo
- Face matching score display
- Manual verification option
- Flag for fraud detection

**FR-KYC-04: KYC Approval Workflow**
- **Approve KYC:**
  - Single-click approval for verified documents
  - Bulk approval for multiple users
  - Auto-approve based on rules (optional)
  - Notification sent to user
- **Reject KYC:**
  - Required rejection reason (dropdown + custom)
  - Common reasons: Document unclear, Document expired, Name mismatch, Address mismatch, Fraud detected
  - Notification sent to user with reason
  - Allow resubmission

**FR-KYC-05: Business Verification**
- GST certificate verification
  - GST number validation
  - Certificate authenticity check
  - Business name matching
- Society Registration verification
  - Registration number validation
  - Document authenticity
  - Society details matching

**FR-KYC-06: KYC Status Management**
- View user's complete KYC history
- Track document resubmissions
- View rejection reasons history
- Manual status override (super admin only)

**FR-KYC-07: KYC Analytics**
- Approval rate metrics
- Average processing time
- Rejection reasons breakdown
- Document type statistics

---

### 5.4 Module: Meter Management

**FR-MTR-01: Meter Registration Dashboard**
- List all meter registration requests
- Status: Pending, Verified, Rejected, Requested (hardware)
- Filter by: Status, DISCOM, Registration Date, User
- Sort by: Date, Status, DISCOM

**FR-MTR-02: Meter Verification Workflow**
- View meter registration details:
  - User information
  - DISCOM name
  - Consumer number
  - Meter serial ID
  - Uploaded electricity bill
  - Address (if provided)
- **Approve Meter:**
  - Verify consumer number format
  - Cross-check with utility API (if available)
  - Manual verification option
  - Notification sent to user
- **Reject Meter:**
  - Required rejection reason
  - Common reasons: Invalid consumer number, Bill unclear, Meter not found, Duplicate registration
  - Notification sent to user

**FR-MTR-03: Hardware Installation Request Management**
- View hardware installation requests
- Request details:
  - User information
  - Installation address (GPS + text)
  - Load capacity requested
  - Request date
  - Status timeline
- **Status Management:**
  - Order Received → Technician Assigned → Meter Installed → Onboarding Complete
  - Update status with notes
  - Assign technician
  - Schedule installation date
  - Mark as completed
- **Request Rejection:**
  - Reject with reason
  - Refund processing (if deposit paid)

**FR-MTR-04: Meter Status Monitoring**
- View all verified meters
- Meter details:
  - Associated user
  - DISCOM and consumer number
  - Verification date
  - Energy data status (last sync time)
  - Data quality indicators
- **Meter Actions:**
  - Suspend meter (stop data collection)
  - Re-verify meter
  - Delete meter (with user confirmation)
  - View energy data history

**FR-MTR-05: Energy Data Monitoring**
- View energy data for specific meter
- Data quality checks:
  - Missing data alerts
  - Anomaly detection (spikes, zeros)
  - Data sync status
- Manual data correction (super admin only)
- Trigger data sync manually

**FR-MTR-06: Meter Analytics**
- Total meters registered
- Verification rate
- Hardware installation requests count
- DISCOM distribution
- Data quality metrics

---

### 5.5 Module: Financial Operations

**FR-FIN-01: Withdrawal Request Dashboard**
- List all withdrawal requests
- Status: Pending, Approved, Rejected, Processing, Completed, Failed
- Filter by: Status, Amount Range, Date Range, User
- Pending requests highlighted

**FR-FIN-02: Withdrawal Approval Workflow**
- View withdrawal request details:
  - User information
  - Requested amount
  - Bank account details (masked)
  - Request date
  - User's wallet balance
  - Previous withdrawal history
- **Approve Withdrawal:**
  - Verify wallet balance
  - Check AML flags (if balance > ₹10,000)
  - Verify bank account (if needed)
  - Process payment via payment gateway
  - Update wallet balance
  - Create transaction record
  - Notification sent to user
- **Reject Withdrawal:**
  - Required rejection reason
  - Common reasons: Insufficient balance, Invalid bank account, AML flag, Suspicious activity
  - Notification sent to user

**FR-FIN-03: Transaction Monitoring**
- View all transactions (top-ups, withdrawals, energy purchases/sales, refunds)
- Filter by: Type, Status, Date Range, User, Amount Range
- Transaction details:
  - Transaction ID
  - User information
  - Type and amount
  - Status
  - Timestamp
  - Payment gateway reference (if applicable)
- Export transaction history

**FR-FIN-04: Wallet Management**
- View user wallet balances
- Manual balance adjustment (super admin only)
  - Reason required
  - Audit log entry
  - Notification sent to user
- Wallet freeze/unfreeze
- View wallet transaction history

**FR-FIN-05: Refund Processing**
- Create refund for:
  - Failed orders
  - Cancelled orders
  - Disputed transactions
- Refund workflow:
  - Select transaction
  - Enter refund amount
  - Reason required
  - Process refund
  - Update wallet balance
  - Notification sent to user

**FR-FIN-06: Payment Gateway Reconciliation**
- View payment gateway transactions
- Match with internal transactions
- Identify discrepancies
- Manual reconciliation
- Export reconciliation reports

**FR-FIN-07: Financial Analytics**
- Total wallet balances (energy & cash)
- Daily/weekly/monthly transaction volume
- Withdrawal approval rate
- Average withdrawal amount
- Top users by balance

---

### 5.6 Module: Trading Operations

**FR-TRD-01: Order Monitoring Dashboard**
- View all orders (active and completed)
- Status: Pending, Confirmed, In Progress, Completed, Cancelled
- Filter by: Status, Date Range, Buyer, Seller, Amount Range
- Real-time order updates

**FR-TRD-02: Order Details View**
- Complete order information:
  - Order ID
  - Buyer and seller information
  - Energy amount (kWh)
  - Price per unit
  - Total price
  - Status and timeline
  - Delivery progress (if in progress)
  - Payment status
- Order actions:
  - Cancel order (admin override)
  - Refund order
  - View invoice

**FR-TRD-03: Dispute Resolution**
- View disputed orders
- Dispute details:
  - Order information
  - Dispute reason
  - User messages
  - Evidence (screenshots, documents)
- **Resolution Actions:**
  - Approve buyer claim (refund)
  - Approve seller claim (complete order)
  - Partial resolution (split refund)
  - Reject dispute
  - Escalate to senior admin

**FR-TRD-04: Order Cancellation (Admin Override)**
- Cancel any order (super admin only)
- Reason required
- Automatic refund processing
- Notification sent to buyer and seller
- Audit log entry

**FR-TRD-05: Trading Analytics**
- Total orders count
- Order status breakdown
- Trading volume (kWh and ₹)
- Average order value
- Top buyers and sellers
- Dispute rate

---

### 5.7 Module: Basic Analytics Dashboard

**FR-ANA-01: Overview Dashboard**
- Key metrics cards:
  - Total users (with growth trend)
  - Active users (last 30 days)
  - Total meters registered
  - Total trading volume (kWh)
  - Total revenue (₹)
  - Pending KYC count
  - Pending withdrawal count
- Quick action buttons:
  - Review Pending KYC
  - Approve Withdrawals
  - View Active Orders

**FR-ANA-02: User Statistics**
- User growth chart (daily/weekly/monthly)
- User status breakdown (pie chart)
- KYC status breakdown
- User registration by source
- Geographic distribution (if available)

**FR-ANA-03: Trading Statistics**
- Trading volume chart (daily/weekly/monthly)
- Order status breakdown
- Average order value trend
- Peak trading hours
- Top energy sellers

**FR-ANA-04: Financial Statistics**
- Wallet balance summary
- Transaction volume (daily/weekly/monthly)
- Withdrawal vs top-up ratio
- Average transaction amount
- Payment gateway success rate

**FR-ANA-05: Platform Health**
- System uptime
- API response times
- Error rate
- Active sessions
- Data sync status

---

## 6. Non-Functional Requirements

### 6.1 Performance

**NFR-PERF-01: Page Load Time**
- Dashboard must load within 2 seconds
- List pages (users, orders) must load within 3 seconds
- Document viewer must load within 1 second

**NFR-PERF-02: Real-time Updates**
- Order status updates within 5 seconds
- KYC status changes reflected within 10 seconds
- Withdrawal status updates within 5 seconds

**NFR-PERF-03: Scalability**
- Support 10,000+ users
- Handle 1,000+ concurrent admin sessions
- Process 100+ KYC reviews per hour

### 6.2 Security

**NFR-SEC-01: Authentication**
- Strong password requirements
- MFA enforcement for sensitive operations
- Session timeout after 30 minutes of inactivity
- IP whitelisting (optional)

**NFR-SEC-02: Authorization**
- Role-based access control (RBAC)
- Permission-based feature access
- Audit logging for all admin actions
- No direct database access from frontend

**NFR-SEC-03: Data Protection**
- All sensitive data encrypted in transit (TLS 1.3)
- PII data masked in logs
- Secure file storage for documents
- Regular security audits

### 6.3 Usability

**NFR-USE-01: User Interface**
- Intuitive navigation
- Consistent design language
- Responsive design (desktop and tablet)
- Keyboard shortcuts for common actions
- Bulk operations support

**NFR-USE-02: Accessibility**
- WCAG 2.1 AA compliance
- Screen reader support
- Keyboard navigation
- High contrast mode

### 6.4 Reliability

**NFR-REL-01: Availability**
- 99.9% uptime target
- Graceful error handling
- Offline mode for read-only operations
- Data backup and recovery

**NFR-REL-02: Error Handling**
- User-friendly error messages
- Error logging and monitoring
- Automatic retry for transient failures
- Fallback mechanisms

---

## 7. User Roles & Permissions

### 7.1 Role Definitions

**Super Admin:**
- Full system access
- User management (all actions)
- System configuration
- Audit log access
- Role management

**Operations Admin:**
- User management (view, suspend, activate)
- KYC management (approve/reject)
- Meter management (verify, approve hardware)
- Order monitoring (view, cancel)
- Basic analytics access

**Financial Admin:**
- Withdrawal approval/rejection
- Transaction monitoring
- Wallet management
- Refund processing
- Financial analytics

**Support Admin:**
- User profile viewing
- Dispute resolution
- User communication
- Order cancellation (with approval)
- Limited analytics

**Viewer:**
- Read-only access to all modules
- Export reports
- No modification capabilities

### 7.2 Permission Matrix

| Feature | Super Admin | Operations | Financial | Support | Viewer |
|---------|------------|-----------|-----------|---------|--------|
| User Management | Full | View, Suspend | View | View | View |
| KYC Management | Full | Approve/Reject | View | View | View |
| Meter Management | Full | Verify, Approve | View | View | View |
| Withdrawal Approval | Full | View | Approve/Reject | View | View |
| Transaction View | Full | View | Full | View | View |
| Order Management | Full | Cancel | View | Resolve Disputes | View |
| Analytics | Full | Basic | Financial | Limited | Read-only |
| System Config | Full | None | None | None | None |

---

## 8. Database Schema (Admin-Specific)

### 8.1 Admin Users Table

```sql
CREATE TABLE public.admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'operations_admin', 'financial_admin', 'support_admin', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 8.2 Admin Actions Audit Log

```sql
CREATE TABLE public.admin_audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_user_id UUID REFERENCES public.admin_users(id) NOT NULL,
  action_type TEXT NOT NULL, -- 'user_suspend', 'kyc_approve', 'withdrawal_approve', etc.
  target_type TEXT NOT NULL, -- 'user', 'kyc', 'meter', 'withdrawal', etc.
  target_id UUID NOT NULL,
  details JSONB, -- Additional action details
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_logs_admin_user_id ON public.admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_target ON public.admin_audit_logs(target_type, target_id);
CREATE INDEX idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at);
```

### 8.3 Withdrawal Requests Table (Enhanced)

```sql
CREATE TABLE public.withdrawals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  request_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  bank_account_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed', 'failed')),
  rejection_reason TEXT,
  approved_by UUID REFERENCES public.admin_users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  payment_gateway_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX idx_withdrawals_created_at ON public.withdrawals(created_at);
```

---

## 9. API Endpoints (Admin-Specific)

### 9.1 Authentication

```
POST   /admin/auth/login
POST   /admin/auth/logout
POST   /admin/auth/refresh
GET    /admin/auth/me
POST   /admin/auth/reset-password
POST   /admin/auth/enable-mfa
```

### 9.2 User Management

```
GET    /admin/users                    # List users with filters
GET    /admin/users/:id                # Get user details
PUT    /admin/users/:id                # Update user
POST   /admin/users/:id/suspend        # Suspend user
POST   /admin/users/:id/activate       # Activate user
POST   /admin/users/:id/ban            # Ban user
DELETE /admin/users/:id                # Delete user (soft)
GET    /admin/users/:id/wallet         # Get user wallet
PUT    /admin/users/:id/wallet         # Adjust wallet balance
GET    /admin/users/:id/transactions   # Get user transactions
POST   /admin/users/:id/notify         # Send notification
```

### 9.3 KYC Management

```
GET    /admin/kyc                      # List KYC submissions
GET    /admin/kyc/:id                  # Get KYC details
GET    /admin/kyc/:id/documents        # Get KYC documents
POST   /admin/kyc/:id/approve          # Approve KYC
POST   /admin/kyc/:id/reject           # Reject KYC
GET    /admin/kyc/analytics            # KYC analytics
```

### 9.4 Meter Management

```
GET    /admin/meters                   # List meters
GET    /admin/meters/:id               # Get meter details
POST   /admin/meters/:id/verify        # Verify meter
POST   /admin/meters/:id/reject        # Reject meter
GET    /admin/meters/:id/energy-data   # Get meter energy data
POST   /admin/meters/:id/sync          # Trigger data sync
GET    /admin/hardware-requests        # List hardware requests
PUT    /admin/hardware-requests/:id    # Update request status
```

### 9.5 Financial Operations

```
GET    /admin/withdrawals              # List withdrawal requests
GET    /admin/withdrawals/:id         # Get withdrawal details
POST   /admin/withdrawals/:id/approve # Approve withdrawal
POST   /admin/withdrawals/:id/reject  # Reject withdrawal
GET    /admin/transactions            # List transactions
GET    /admin/transactions/:id        # Get transaction details
POST   /admin/refunds                 # Create refund
GET    /admin/financial/analytics     # Financial analytics
```

### 9.6 Trading Operations

```
GET    /admin/orders                  # List orders
GET    /admin/orders/:id              # Get order details
POST   /admin/orders/:id/cancel      # Cancel order (admin)
GET    /admin/disputes               # List disputes
POST   /admin/disputes/:id/resolve   # Resolve dispute
GET    /admin/trading/analytics      # Trading analytics
```

### 9.7 Analytics

```
GET    /admin/analytics/overview      # Overview dashboard
GET    /admin/analytics/users         # User statistics
GET    /admin/analytics/trading       # Trading statistics
GET    /admin/analytics/financial     # Financial statistics
GET    /admin/analytics/health        # Platform health
```

---

## 10. User Experience & Screen Flows

### 10.1 Login Flow

1. Admin navigates to admin portal URL
2. Login page displayed
3. Enter email and password
4. If MFA enabled, enter MFA code
5. Redirect to dashboard
6. Session established

### 10.2 KYC Approval Flow

1. Admin navigates to KYC Dashboard
2. View pending KYC list
3. Click on pending KYC
4. Review documents (zoom, rotate, download)
5. Review OCR extracted data
6. Review liveness check (if applicable)
7. Click "Approve" or "Reject"
8. If reject, enter reason
9. Confirmation dialog
10. Status updated, user notified
11. Return to KYC list

### 10.3 Withdrawal Approval Flow

1. Admin navigates to Withdrawals Dashboard
2. View pending withdrawal requests
3. Click on pending withdrawal
4. Review withdrawal details:
   - User information
   - Amount
   - Bank account (masked)
   - Wallet balance
   - Previous withdrawals
5. Check AML flags (if applicable)
6. Click "Approve" or "Reject"
7. If reject, enter reason
8. Confirmation dialog
9. If approve, payment processed
10. Status updated, user notified
11. Return to withdrawals list

### 10.4 Meter Verification Flow

1. Admin navigates to Meters Dashboard
2. View pending meter registrations
3. Click on pending meter
4. Review meter details:
   - User information
   - DISCOM and consumer number
   - Meter serial ID
   - Uploaded bill
5. Verify consumer number format
6. Cross-check with utility API (if available)
7. Click "Approve" or "Reject"
8. If reject, enter reason
9. Confirmation dialog
10. Status updated, user notified
11. Return to meters list

---

## 11. Development Roadmap

### Phase 1: Foundation (Weeks 1-2)
- Project setup (Next.js, TypeScript, Tailwind)
- Authentication & authorization
- Basic dashboard layout
- User management module

### Phase 2: Core Operations (Weeks 3-4)
- KYC management module
- Meter management module
- Financial operations module
- Basic analytics dashboard

### Phase 3: Trading & Advanced (Weeks 5-6)
- Trading operations module
- Dispute resolution
- Enhanced analytics
- Audit logging

### Phase 4: Polish & Testing (Weeks 7-8)
- UI/UX improvements
- Performance optimization
- Security hardening
- Testing & bug fixes
- Documentation

---

## 12. Success Metrics

- **KYC Processing Time:** Average < 2 hours from submission to approval/rejection
- **Withdrawal Processing Time:** Average < 4 hours from request to approval
- **Meter Verification Time:** Average < 24 hours from registration to verification
- **Admin Productivity:** 50+ KYC reviews per admin per day
- **System Uptime:** 99.9%
- **User Satisfaction:** Admin satisfaction score > 4.5/5

---

## 13. Compliance & Regulatory

- **DPDP Compliance:** User data deletion and anonymization
- **Audit Trail:** All admin actions logged
- **Data Retention:** Configurable retention policies
- **Access Control:** Role-based permissions enforced
- **Security:** Regular security audits and penetration testing

---

**End of Core Operations TRD**

