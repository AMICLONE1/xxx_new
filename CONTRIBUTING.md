# Contributing to PowerNetPro

**Welcome!** Thank you for your interest in contributing to PowerNetPro. This guide will help you get started.

---

## 📋 Table of Contents

1. [Code of Conduct](#-code-of-conduct)
2. [Getting Started](#-getting-started)
3. [Development Workflow](#-development-workflow)
4. [Coding Standards](#-coding-standards)
5. [Commit Guidelines](#-commit-guidelines)
6. [Pull Request Process](#-pull-request-process)
7. [Testing Guidelines](#-testing-guidelines)
8. [Documentation](#-documentation)
9. [Issue Guidelines](#-issue-guidelines)
10. [Need Help?](#-need-help)

---

## 📜 Code of Conduct

### Our Pledge
We are committed to providing a friendly, safe, and welcoming environment for all contributors.

### Our Standards
- **Be respectful** - Treat everyone with respect and kindness
- **Be collaborative** - Work together towards common goals
- **Be constructive** - Provide helpful feedback
- **Be inclusive** - Welcome people of all backgrounds and identities

### Unacceptable Behavior
- Harassment, discrimination, or offensive comments
- Personal attacks or trolling
- Publishing others' private information
- Any conduct that could be considered inappropriate in a professional setting

---

## 🚀 Getting Started

### 1. Fork the Repository

```bash
# Click "Fork" button on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/xxx_MA_PNP.git
cd xxx_MA_PNP

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/xxx_MA_PNP.git
```

### 2. Set Up Development Environment

Follow **[QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)** for complete setup instructions.

**Quick checklist:**
- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] Environment files configured (`.env` files)
- [ ] Backend running (`cd backend && npm run dev`)
- [ ] Frontend running (`npm start`)
- [ ] Can run app in emulator/simulator

### 3. Choose an Issue

**For first-time contributors:**
- Look for issues labeled `good first issue`
- Start with documentation improvements or small bug fixes
- Ask questions if anything is unclear

**For experienced contributors:**
- Check `high priority` or `critical` labels
- Review **[DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md)** for strategic work
- See **[PROJECT_STATUS.md](PROJECT_STATUS.md)** for current sprint goals

---

## 💻 Development Workflow

### 1. Create a Feature Branch

```bash
# Update your fork
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description

# Examples:
git checkout -b feature/add-2fa-authentication
git checkout -b fix/marketplace-map-crash
git checkout -b docs/update-setup-guide
```

### 2. Make Your Changes

**Follow these principles:**
- Write clean, readable code
- Add comments for complex logic
- Keep functions small and focused
- Use TypeScript types properly
- Handle errors gracefully
- Test your changes thoroughly

### 3. Test Locally

```bash
# Run the app
npm start

# Test on Android
npx expo run:android

# Test on iOS (macOS only)
npx expo run:ios

# Run linter
npm run lint

# Run formatter
npm run format

# Type check
npm run type-check
```

### 4. Commit Your Changes

See [Commit Guidelines](#-commit-guidelines) below.

### 5. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name

# Go to GitHub and create Pull Request
# Fill in the PR template
```

---

## 📏 Coding Standards

### TypeScript Style

**Use strict typing:**
```typescript
// ❌ Bad
const fetchData = async (id: any) => {
  const data = await fetch(`/api/users/${id}`);
  return data.json();
};

// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

const fetchUser = async (userId: string): Promise<User> => {
  const response = await fetch(`/api/users/${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }
  return response.json();
};
```

**Use meaningful names:**
```typescript
// ❌ Bad
const d = new Date();
const x = users.filter(u => u.a);

// ✅ Good
const currentDate = new Date();
const activeUsers = users.filter(user => user.isActive);
```

**Avoid magic numbers:**
```typescript
// ❌ Bad
setTimeout(() => {}, 30000);

// ✅ Good
const REFRESH_INTERVAL_MS = 30 * 1000; // 30 seconds
setTimeout(() => {}, REFRESH_INTERVAL_MS);
```

### React/React Native Style

**Use functional components:**
```typescript
// ❌ Bad (class component)
class UserProfile extends React.Component {
  // ...
}

// ✅ Good (functional component)
const UserProfile: React.FC<Props> = ({ userId }) => {
  // ...
};
```

**Use hooks properly:**
```typescript
// ✅ Good
const [users, setUsers] = useState<User[]>([]);

useEffect(() => {
  loadUsers();
}, []); // Dependency array

// ❌ Bad - missing dependencies
useEffect(() => {
  if (userId) {
    loadUser(userId);
  }
}, []); // Should include [userId]
```

**Handle loading and error states:**
```typescript
// ✅ Good
const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUser().catch(err => setError(err.message))
              .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!user) return <EmptyState />;

  return <View>{/* User content */}</View>;
};
```

### File Organization

```
src/
├── components/
│   ├── common/          # Reusable components (Button, Input, etc.)
│   ├── mapbox/          # Map-related components
│   └── index.ts         # Export all components
├── screens/
│   ├── auth/            # Authentication screens
│   │   ├── LoginScreen.tsx
│   │   └── index.ts
│   └── trading/         # Trading screens
├── services/
│   ├── api/             # API client
│   │   ├── client.ts
│   │   └── tradingService.ts
│   └── index.ts
├── store/               # Zustand stores
│   └── userStore.ts
├── types/               # TypeScript types
│   └── index.ts
└── utils/               # Helper functions
    └── formatters.ts
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **Components** | PascalCase | `UserProfile`, `MarketplaceScreen` |
| **Files** | PascalCase (components) | `UserProfile.tsx`, `LoginScreen.tsx` |
| **Files** | camelCase (services) | `tradingService.ts`, `userStore.ts` |
| **Variables** | camelCase | `const userId`, `let isActive` |
| **Constants** | UPPER_SNAKE_CASE | `const MAX_RETRIES = 3` |
| **Interfaces** | PascalCase | `interface User`, `interface Props` |
| **Types** | PascalCase | `type UserRole = 'admin' | 'user'` |
| **Functions** | camelCase | `function fetchUsers()` |
| **Private functions** | _camelCase | `function _validateInput()` |

---

## 📝 Commit Guidelines

We follow **Conventional Commits** for clear, semantic commit history.

### Commit Message Format

```
<type>(<scope>): <subject>

<body (optional)>

<footer (optional)>
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(wallet): add Razorpay integration` |
| `fix` | Bug fix | `fix(map): resolve location fallback issue` |
| `docs` | Documentation | `docs(setup): update OCR installation steps` |
| `style` | Code style (formatting, semicolons) | `style(trading): fix indentation` |
| `refactor` | Code refactoring | `refactor(api): simplify error handling` |
| `perf` | Performance improvement | `perf(map): reduce auto-refresh interval` |
| `test` | Add/update tests | `test(wallet): add payment flow tests` |
| `chore` | Build/tooling changes | `chore(deps): update expo to 54.0.31` |
| `ci` | CI/CD changes | `ci: add GitHub Actions workflow` |
| `revert` | Revert previous commit | `revert: revert "feat(wallet): add Razorpay"` |

### Scopes

Common scopes in our project:
- `auth` - Authentication
- `kyc` - KYC verification
- `trading` - Trading/marketplace
- `wallet` - Wallet/payments
- `map` - Map/location
- `ocr` - OCR functionality
- `backend` - Backend API
- `database` - Database schema/queries
- `docs` - Documentation

### Examples

**Good commits:**
```bash
git commit -m "feat(wallet): implement Razorpay payment gateway"
git commit -m "fix(map): handle location permission denial gracefully"
git commit -m "docs(setup): add OCR troubleshooting section"
git commit -m "refactor(api): extract rate limiter to middleware"
git commit -m "perf(trading): replace polling with WebSocket"
```

**Bad commits:**
```bash
git commit -m "fixed bug"
git commit -m "updates"
git commit -m "WIP"
git commit -m "changes to the map"
```

### Commit Body (Optional)

For complex changes, add a body:

```bash
git commit -m "feat(wallet): implement Razorpay payment gateway

- Add Razorpay React Native SDK
- Implement order creation flow
- Add payment verification endpoint
- Handle payment success/failure states
- Update wallet balance after successful payment

Closes #123"
```

---

## 🔄 Pull Request Process

### 1. Before Creating PR

**Checklist:**
- [ ] Code follows project style guide
- [ ] All tests pass (when implemented)
- [ ] Linter passes (`npm run lint`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Changes tested locally (Android/iOS)
- [ ] Documentation updated if needed
- [ ] No console.logs in production code
- [ ] Environment variables documented

### 2. Creating the PR

**Title Format:**
```
<type>(<scope>): <description>

Examples:
feat(wallet): add Razorpay integration
fix(map): resolve location fallback issue
docs(setup): improve OCR installation guide
```

**Description Template:**
```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update

## Related Issues
Fixes #123
Related to #456

## Changes Made
- Added Razorpay SDK integration
- Implemented payment verification
- Updated wallet balance logic
- Added error handling for payment failures

## Testing Done
- [x] Tested on Android emulator
- [x] Tested on iOS simulator
- [x] Tested on physical device
- [x] Tested payment success flow
- [x] Tested payment failure flow
- [x] Tested network error scenarios

## Screenshots (if applicable)
[Add screenshots here]

## Checklist
- [x] Code follows project style guide
- [x] Self-review completed
- [x] Comments added for complex logic
- [x] Documentation updated
- [x] No new warnings or errors
- [x] All existing tests pass
```

### 3. Code Review Process

**What reviewers look for:**
- Code quality and readability
- Proper error handling
- TypeScript types usage
- Security concerns
- Performance implications
- Test coverage (when implemented)

**Responding to feedback:**
- Be open to suggestions
- Ask questions if unclear
- Make requested changes promptly
- Don't take criticism personally

### 4. After Approval

- Wait for CI checks to pass (when implemented)
- Squash commits if requested
- Merge will be done by maintainers

---

## 🧪 Testing Guidelines

### Manual Testing (Current State)

**Test checklist for UI changes:**
- [ ] Tested on Android emulator
- [ ] Tested on iOS simulator
- [ ] Tested on physical device (if possible)
- [ ] Tested in portrait orientation
- [ ] Tested in landscape orientation (if relevant)
- [ ] Tested with slow network
- [ ] Tested with no network
- [ ] Tested with different screen sizes

**Test checklist for backend changes:**
- [ ] API endpoint returns correct data
- [ ] Proper error responses (400, 401, 404, 500)
- [ ] Authentication works correctly
- [ ] Rate limiting works (if applicable)
- [ ] Database changes persist correctly
- [ ] No SQL injection vulnerabilities

### Automated Testing (Future)

**When testing is implemented, you'll need to:**
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- UserProfile.test.tsx

# Generate coverage report
npm test -- --coverage
```

**Writing tests (example):**
```typescript
// src/components/common/__tests__/Button.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Button from '../Button';

describe('Button', () => {
  it('renders correctly', () => {
    const { getByText } = render(<Button title="Click me" onPress={() => {}} />);
    expect(getByText('Click me')).toBeTruthy();
  });

  it('calls onPress when clicked', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Click me" onPress={onPress} />);
    
    fireEvent.press(getByText('Click me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button title="Click me" onPress={onPress} disabled />
    );
    
    fireEvent.press(getByText('Click me'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

---

## 📚 Documentation

### When to Update Documentation

**Update documentation when you:**
- Add a new feature
- Change existing behavior
- Fix a bug that was caused by unclear docs
- Add new dependencies
- Change environment variables
- Modify database schema
- Update API endpoints

### Documentation Files to Update

| Change Type | Files to Update |
|-------------|-----------------|
| **Setup changes** | `QUICK_START_GUIDE.md`, `COMPLETE_SETUP_GUIDE.md` |
| **New feature** | `README.md`, `DEVELOPMENT_ROADMAP.md`, `PROJECT_STATUS.md` |
| **Bug fix** | `COMPLETE_SETUP_GUIDE.md` (Known Issues section) |
| **Security fix** | `COMPLETE_SETUP_GUIDE.md` (Security Concerns section) |
| **API changes** | `backend/README.md`, inline code comments |
| **Database changes** | `database/COMPLETE_SCHEMA.sql`, `database/README.md` |

### Documentation Style

**Be clear and concise:**
```markdown
// ❌ Bad
The thing that you need to do is to make sure that you have the right version 
of Node installed and also npm should be there too.

// ✅ Good
Install Node.js 18+ (includes npm).
```

**Use code blocks with syntax highlighting:**
```markdown
// ✅ Good
```bash
npm install
npm start
```
```

**Add examples:**
```markdown
// ✅ Good
## Configuration

Set the API URL in `.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
```

For physical devices, use your computer's IP:
```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3000
```
```

---

## 🐛 Issue Guidelines

### Before Creating an Issue

1. **Search existing issues** - Your issue might already exist
2. **Read documentation** - Especially `COMPLETE_SETUP_GUIDE.md`
3. **Try troubleshooting** - Check section 14 in setup guide

### Creating a Bug Report

**Title:**
```
[Component] Brief description of bug

Examples:
[Map] Location not updating after permission granted
[Wallet] Payment modal crashes on Android
[Backend] /trading/search returns 500 error
```

**Template:**
```markdown
## Description
Brief description of the bug.

## Steps to Reproduce
1. Open app
2. Navigate to Marketplace
3. Tap on any seller marker
4. App crashes

## Expected Behavior
Should open seller details modal.

## Actual Behavior
App crashes with error: "Cannot read property 'id' of undefined"

## Environment
- **OS**: Android 13 / iOS 16
- **Device**: Pixel 5 Emulator / iPhone 14 Pro
- **App Version**: 1.0.0
- **Expo Version**: 54.0.30
- **Node Version**: 18.17.0

## Screenshots/Logs
[Attach screenshots or error logs]

## Additional Context
This only happens on Android, works fine on iOS.
```

### Creating a Feature Request

**Template:**
```markdown
## Feature Description
Brief description of the proposed feature.

## Problem It Solves
Explain the problem this feature addresses.

## Proposed Solution
Describe how you envision this working.

## Alternatives Considered
Any alternative solutions you've thought about.

## Additional Context
Any mockups, diagrams, or examples.

## Priority
- [ ] Critical - Blocks development
- [ ] High - Important for MVP
- [ ] Medium - Nice to have
- [ ] Low - Future consideration
```

---

## ❓ Need Help?

### Getting Help

1. **Read documentation first**:
   - [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)
   - [COMPLETE_SETUP_GUIDE.md](COMPLETE_SETUP_GUIDE.md)
   - [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md)

2. **Check existing issues** on GitHub

3. **Ask in discussions** (preferred for questions)

4. **Create an issue** (for bugs or specific problems)

### Communication Channels

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Questions, ideas, general chat
- **Email**: support@powernetpro.com (for sensitive issues)

### Response Time

- **Critical bugs**: 24-48 hours
- **Feature requests**: 1-2 weeks
- **Questions**: 2-3 days
- **Pull requests**: 3-5 days

---

## 🏆 Recognition

### Contributors

All contributors will be:
- Listed in the project's README
- Mentioned in release notes
- Credited in documentation

### Types of Contributions

**We value all types of contributions:**
- Code (features, bug fixes)
- Documentation
- Bug reports
- Feature ideas
- Code reviews
- Design work
- Testing
- Community support

---

## 📜 Legal

By contributing to PowerNetPro, you agree that:
- Your contributions will be licensed under the project's MIT License
- You have the right to contribute the code/content
- Your contributions are your own original work

---

## 🎉 Thank You!

Thank you for contributing to PowerNetPro! Your efforts help make sustainable energy trading accessible to everyone.

**Questions?** Don't hesitate to ask in GitHub Discussions or via email.

**Happy Contributing! 🚀**

---

**Last Updated:** January 5, 2026  
**Maintained by:** PowerNetPro Development Team
