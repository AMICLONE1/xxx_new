# PowerNetPro Backend API

Node.js/Express backend server for PowerNetPro mobile application.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
NODE_ENV=development

# Supabase (already configured in app.json)
SUPABASE_URL=https://ncejoqiddhaxuetjhjrs.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Razorpay (get from https://razorpay.com)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret_here
```

### 3. Run Development Server

```bash
npm run dev
```

Server will run on `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
npm start
```

## 📋 API Endpoints

### Health Check
- `GET /health` - Check if server is running

### Trading
- `POST /trading/search` - Search for energy sellers
- `POST /trading/orders` - Create order
- `GET /trading/orders/:id/status` - Get order status
- `GET /trading/orders/active` - Get active orders
- `POST /trading/orders/:id/cancel` - Cancel order

### Wallet
- `POST /wallet/top-up` - Initiate top-up
- `POST /wallet/withdraw` - Request withdrawal
- `GET /wallet/withdraw/:id/status` - Check withdrawal status

### Payments
- `POST /payments/initiate` - Initiate payment
- `POST /payments/verify` - Verify payment

### KYC
- `POST /kyc/documents` - Submit KYC document
- `GET /kyc/status` - Get KYC status

## 🔧 Configuration

### Required Environment Variables

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `RAZORPAY_KEY_ID` - Razorpay public key (for payments)
- `RAZORPAY_KEY_SECRET` - Razorpay secret key (for payments)

### Optional

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - CORS origin (default: *)

## 🚢 Deployment

### Railway (Recommended)

1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Connect your repository
4. Add environment variables
5. Deploy!

### Render

1. Go to https://render.com
2. New → Web Service
3. Connect GitHub repository
4. Add environment variables
5. Deploy!

### Other Platforms

- **Heroku**: Use Procfile
- **AWS**: Use Elastic Beanstalk or EC2
- **DigitalOcean**: Use App Platform

## 📝 Notes

- All endpoints require authentication (Bearer token)
- Token is verified with Supabase Auth
- Payment endpoints require Razorpay configuration
- Database operations use Supabase

## 🔒 Security

- Always use environment variables for secrets
- Never commit `.env` file
- Use HTTPS in production
- Validate all input data
- Rate limiting recommended for production

