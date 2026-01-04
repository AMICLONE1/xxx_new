# PowerNetPro Mobile Application

A React Native mobile application for PowerNetPro, enabling P2P energy trading with KYC verification, smart meter integration, Beckn protocol-based marketplace, wallet system, and automated trading capabilities.

## Technology Stack

- **Framework**: React Native (Expo SDK 54+)
- **Language**: TypeScript (strict mode)
- **State Management**: Zustand
- **Local Database**: WatermelonDB (primary), MMKV (key-value cache)
- **Backend Sync**: Firebase/Supabase (Real-time)
- **Charts**: Victory Native
- **KYC/OCR**: Google ML Kit
- **Maps**: Mapbox SDK
- **Navigation**: React Navigation v6
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Payments**: Razorpay/PhonePe SDK
- **Notifications**: Firebase Cloud Messaging (FCM)

## Project Structure

```
/src
  /components      # Reusable UI components
  /screens         # Screen components
    /auth          # Authentication screens
    /kyc           # KYC verification screens
    /meter         # Meter registration screens
    /trading       # Trading and marketplace screens
    /wallet        # Wallet screens
    /home          # Home dashboard
    /profile       # Profile screens
  /navigation      # Navigation configuration
  /store           # Zustand stores
  /services        # API services, external integrations
    /api           # API client and services
    /beckn         # Beckn protocol integration
    /mlkit         # ML Kit OCR service
  /utils           # Helper functions, constants
  /types           # TypeScript type definitions
  /hooks           # Custom React hooks
  /database        # WatermelonDB schema and models
  /assets          # Images, fonts, etc.
```

## 📚 Documentation

### 🎯 Start Here (New Team Members)

- **[⚡ QUICK START GUIDE](QUICK_START_GUIDE.md)** - Get up and running in 15 minutes!
- **[📖 COMPLETE SETUP GUIDE](COMPLETE_SETUP_GUIDE.md)** - Comprehensive setup from scratch (15,000+ words)
  - Prerequisites & system requirements
  - Installation steps for frontend, backend, database
  - OCR installation & configuration
  - Known issues, bugs, and security concerns
  - Complete troubleshooting guide
- **[🗺️ DEVELOPMENT ROADMAP](DEVELOPMENT_ROADMAP.md)** - Future improvements & feature roadmap

### 📁 Additional Documentation

**All legacy documentation is organized in the [`docs/`](docs/) directory:**

- **[📖 Documentation Index](docs/README.md)** - Complete documentation guide
- **[🚀 Setup Guide](docs/setup/SETUP_GUIDE.md)** - Original setup instructions
- **[⚙️ Supabase Setup](docs/setup/SUPABASE_SETUP.md)** - Supabase configuration
- **[🔧 Troubleshooting](docs/troubleshooting/COMMON_ISSUES.md)** - Common issues and solutions
- **[📊 Implementation Status](docs/development/IMPLEMENTATION_STATUS.md)** - Feature completion status

## Getting Started

### 🚀 Quick Setup (15 minutes)

**For experienced developers, follow these steps:**

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/xxx_MA_PNP.git
cd xxx_MA_PNP
npm install
cd backend && npm install && cd ..

# 2. Setup environment files
# Copy .env.example to .env (root and backend/)
# Fill in Supabase credentials

# 3. Start backend (Terminal 1)
cd backend && npm run dev

# 4. Start mobile app (Terminal 2)
npm start
# Press 'a' for Android or 'i' for iOS
```

**👉 For detailed instructions, see [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)**

### Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (for Android) or Xcode (for iOS)
- Supabase account (free tier works)

### Full Setup Guide

**If you're new to the project or encounter issues, follow the comprehensive guide:**

📖 **[COMPLETE_SETUP_GUIDE.md](COMPLETE_SETUP_GUIDE.md)** covers:
- Prerequisites & system requirements
- Step-by-step installation
- Database setup (Supabase)
- OCR configuration (ML Kit)
- Known issues & troubleshooting
- Security concerns
- All environment variables

**Estimated setup time:** 1-2 hours for first-time setup

## Development

### Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run on Web
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

### Code Style

This project uses:
- ESLint for linting
- Prettier for code formatting
- TypeScript strict mode

## Features

### ✅ Implemented Features
- **Authentication**: Phone/Email OTP via Supabase
- **KYC Verification**: Aadhaar, PAN, Electricity Bill OCR scanning (ML Kit)
- **Meter Registration**: DISCOM integration with verification
- **Energy Marketplace**: Map-based seller discovery (Mapbox)
- **Trading**: Buy/sell energy with transaction recording
- **Wallet System**: Energy credits and cash balance management
- **Transaction History**: Complete history with charts (Line, Bar, Pie)
- **Real-time Updates**: Auto-refresh sellers and location (30s/60s)
- **Profile Management**: User info, KYC status, settings

### ⚠️ Partially Implemented
- **Payments**: Razorpay integrated but flow incomplete
- **Energy Data**: Using mock data, not real meters yet
- **Trading Bot**: UI exists, logic not implemented
- **Beckn Protocol**: Stub implementation

### 📋 Roadmap

See **[DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md)** for detailed implementation plan.

**Phase 1 (6 weeks)**: Security hardening, bug fixes, database optimization  
**Phase 2 (10 weeks)**: Complete Razorpay, real meter data, WebSocket  
**Phase 3 (8 weeks)**: Offline mode, performance optimization  
**Phase 4 (16 weeks)**: AI trading bot, blockchain, advanced analytics

## 📊 Project Status

**Current Status**: 🟡 Development (70% MVP complete)

| Component | Status | Notes |
|-----------|--------|-------|
| Authentication | ✅ Complete | Phone/Email OTP working |
| KYC | ✅ Complete | OCR scanning functional |
| Trading | 🟡 Partial | Backend stub, needs completion |
| Payments | 🟡 Partial | Razorpay SDK added, flow incomplete |
| Real-time Data | ✅ Complete | Auto-refresh implemented |
| Security | 🔴 Needs Work | 13 vulnerabilities documented |

**See [PROJECT_STATUS.md](PROJECT_STATUS.md) for detailed status.**

## 🐛 Known Issues

**15 documented issues** including:
- API hardcoded to localhost (use environment variables)
- OCR only works in dev builds (not Expo Go)
- Razorpay integration incomplete
- No real-time meter data (using mock data)
- Location fallback to Pune (silent)

**See [COMPLETE_SETUP_GUIDE.md](COMPLETE_SETUP_GUIDE.md#-known-issues--limitations) for full list and workarounds.**

## 🔒 Security

**13 security concerns documented**, including:
- API keys exposed in source code
- No rate limiting
- CORS allows all origins
- RLS policies not fully tested

**See [COMPLETE_SETUP_GUIDE.md](COMPLETE_SETUP_GUIDE.md#-security-concerns) for mitigation strategies.**

## Contributing

We welcome contributions! Please see **[CONTRIBUTING.md](CONTRIBUTING.md)** for:
- Code of conduct
- Development workflow
- Coding standards
- Commit guidelines
- Pull request process
- Testing guidelines

**Quick Start for Contributors:**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run linter: `npm run lint:fix`
5. Commit: `git commit -m "feat(scope): add amazing feature"`
6. Push and create Pull Request

**First-time contributors:** Look for issues labeled `good first issue`.

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: See files listed above
- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/xxx_MA_PNP/issues)
- **Email**: support@powernetpro.com

## Acknowledgments

- Built with [Expo](https://expo.dev/)
- Maps by [Mapbox](https://www.mapbox.com/)
- OCR by [Google ML Kit](https://developers.google.com/ml-kit)
- Backend by [Supabase](https://supabase.com/)
- Charts by [react-native-chart-kit](https://github.com/indiespirit/react-native-chart-kit)

---

**⚡ PowerNetPro** - Making renewable energy trading accessible to everyone.

**Last Updated:** January 5, 2026  
**Maintained by:** PowerNetPro Development Team
   ```

3. Configure the project:
   ```bash
   eas build:configure
   ```

4. Build for production:
   ```bash
   eas build --platform android
   eas build --platform ios
   ```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linting and type checking
4. Submit a pull request

## License

Proprietary - PowerNetPro

