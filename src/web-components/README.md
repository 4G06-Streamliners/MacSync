# @teamd/web-components

Team D web component library for Large Event Platform standalone applications.

## Installation

```bash
pnpm add @teamd/web-components
```

## Components

### LocalLoginForm

Development-focused login form with Team D branding, inline styles, and optional quick login grid for seed users.

#### Basic Usage (Legacy Mode)

```tsx
import { LocalLoginForm } from '@teamd/web-components';
import { useAuth } from './contexts/AuthContext';
import { useNavigate } from '@tanstack/react-router';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  return (
    <LocalLoginForm
      title="Team D User Portal"
      subtitle="Sign in to access your dashboard"
      onLogin={login}
      onSuccess={() => navigate({ to: '/' })}
    />
  );
}
```

#### Quick Login with Built-in API Integration

```tsx
import { LocalLoginForm } from '@teamd/web-components';
import type { AuthUser } from '@large-event/api-types';
import { useNavigate } from '@tanstack/react-router';

export default function LoginPage() {
  const navigate = useNavigate();

  const handleLoginSuccess = (user: AuthUser, token: string) => {
    // Component already stored auth in sessionStorage
    // Just update your app state
    console.log('Logged in:', user);
    navigate({ to: '/' });
  };

  return (
    <LocalLoginForm
      enableQuickLogin
      apiUrl="/api/auth/login"
      storagePrefix="teamd"
      layout="card"
      onLoginSuccess={handleLoginSuccess}
    />
  );
}
```

#### Custom Seed Users

```tsx
import { LocalLoginForm, type SeedUser } from '@teamd/web-components';

const customUsers: SeedUser[] = [
  { email: 'admin@example.com', label: 'Admin', badge: 'Full Access' },
  { email: 'user@example.com', label: 'User', badge: 'Limited' },
];

export default function LoginPage() {
  return (
    <LocalLoginForm
      enableQuickLogin
      seedUsers={customUsers}
      apiUrl="/api/auth/login"
      onLoginSuccess={(user, token) => console.log('Logged in:', user)}
    />
  );
}
```

#### Custom Theme

```tsx
import { LocalLoginForm } from '@teamd/web-components';

export default function LoginPage() {
  return (
    <LocalLoginForm
      enableQuickLogin
      apiUrl="/api/auth/login"
      primaryColor="#17a2b8" // Cyan instead of purple
      title="Custom Portal"
      subtitle="Welcome back!"
      onLoginSuccess={(user, token) => console.log('Logged in:', user)}
    />
  );
}
```

**Props:**

**Display Props:**
- `title?`: Form title (default: "Team D Local Development")
- `subtitle?`: Subtitle text (default: "Quick login for development")
- `showBranding?`: Show Team D branding footer (default: true)

**Layout Props:**
- `layout?`: 'fullscreen' (centers in viewport) or 'card' (just the card) (default: 'fullscreen')
- `maxWidth?`: Max width of form card (auto: 400px without quick login, 600px with)

**Color Customization:**
- `primaryColor?`: Primary button color (default: #8b5cf6 purple)

**Callback Props (provide one):**
- `onLogin?`: Legacy callback - Simple email login function returning Promise<boolean>
- `onLoginSuccess?`: New callback - Receives full user and token data: `(user: AuthUser, token: string) => void`
- `onSuccess?`: Optional success callback after login completes

**Quick Login Feature:**
- `enableQuickLogin?`: Enable quick login grid with seed users (default: false)
- `seedUsers?`: Custom seed users for quick login (uses default 13 seed users if not provided)

**Built-in API Integration:**
- `apiUrl?`: API endpoint for login (e.g., '/api/auth/login'). Set to enable built-in fetch.
- `storagePrefix?`: Storage prefix for sessionStorage keys (default: 'teamd')
- `authSource?`: Store auth source in sessionStorage (default: 'local')

**Types:**
```tsx
interface SeedUser {
  email: string;
  label: string;
  badge: string;
}
```

## Styling

Team D components use inline styles with a purple color scheme.

### Team D Colors

```tsx
import { teamDColors } from '@teamd/web-components';

const MyComponent = () => (
  <div style={{ backgroundColor: teamDColors.primary }}>
    Team D Purple!
  </div>
);
```

Available colors:
- `primary`: #8b5cf6 (purple)
- `background`: #f9fafb
- `bgGray`: #f3f4f6
- `textDark`: #1f2937
- `textLight`: #6b7280
- `border`: #dee2e6
- `selected`: #007bff
- `error`: #dc2626

### Team D Styles

```tsx
import { teamDStyles } from '@teamd/web-components';

const MyCard = () => (
  <div style={teamDStyles.card}>
    <button style={teamDStyles.button}>Click Me</button>
  </div>
);
```

## Authentication Setup

Team D web components integrate with the shared auth infrastructure:

```tsx
import {
  createAuthContext,
  createAuthClient,
  createTokenStorage,
  sessionStorageAdapter,
} from '@teamd/web-components';

// Create auth client for URL/storage handling
const authClient = createAuthClient({
  storagePrefix: 'teamd',
  apiUrl: window.location.origin,
  debug: false,
});

// Create token storage
const tokenStorage = createTokenStorage({
  storage: sessionStorageAdapter,
  prefix: 'teamd',
});

// Create HTTP client
const httpClient = createFetchClient({
  baseURL: window.location.origin,
  authType: 'bearer',
  storage: sessionStorageAdapter,
  tokenKey: 'teamd-auth-token',
});

// Create auth API
const authApi = createAuthApi({
  httpClient,
  authType: 'bearer',
});

// Create auth context
const { AuthProvider, useAuth } = createAuthContext({
  authApi,
  tokenStorage,
  enableInstanceManagement: false,
});

export { AuthProvider, useAuth };
```

## Development

```bash
# Build package
pnpm build

# Watch mode
pnpm dev

# Clean dist
pnpm clean
```

## Publishing

```bash
# Publish to Verdaccio
pnpm publish --registry http://localhost:4873
```

## License

MIT
