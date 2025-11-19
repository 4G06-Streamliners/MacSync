import React, { useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser } from '@large-event/api-types';
import { teamDColors } from '../../utils/styles';

/**
 * Seed user for quick login
 */
export interface SeedUser {
  email: string;
  label: string;
  badge: string;
}

/**
 * Local login form props
 */
export interface LocalLoginFormProps {
  // === Display Props ===
  /** Form title (default: "Team D Local Development") */
  title?: string;
  /** Subtitle text (default: "Quick login for development") */
  subtitle?: string;
  /** Show Team D branding footer (default: true) */
  showBranding?: boolean;

  // === Layout Props ===
  /** Layout mode: 'fullscreen' centers form in viewport, 'card' renders just the card (default: 'fullscreen') */
  layout?: 'fullscreen' | 'card';
  /** Max width of form card (auto-adjusts based on quick login: 400px without, 600px with) */
  maxWidth?: string;

  // === Color Customization ===
  /** Primary button color (default: teamDColors.primary #8b5cf6) */
  primaryColor?: string;

  // === Callback Props (provide one) ===
  /** Legacy callback: Simple email login function returning boolean */
  onLogin?: (email: string) => Promise<boolean>;
  /** New callback: Receives full user and token data */
  onLoginSuccess?: (user: AuthUser, token: string) => void;
  /** Optional success callback after login completes */
  onSuccess?: () => void;

  // === Quick Login Feature ===
  /** Enable quick login grid with seed users (default: false) */
  enableQuickLogin?: boolean;
  /** Custom seed users for quick login (uses default if not provided) */
  seedUsers?: SeedUser[];

  // === Built-in API Integration ===
  /** API endpoint for login (default: '/api/auth/login'). Set to enable built-in fetch. */
  apiUrl?: string;
  /** Storage prefix for sessionStorage keys (default: 'teamd'). Used with apiUrl. */
  storagePrefix?: string;
  /** Store auth source in sessionStorage (default: 'local'). Used with apiUrl. */
  authSource?: string;
}

// Default seed users for quick login
const DEFAULT_SEED_USERS: SeedUser[] = [
  { email: 'admin@system.com', label: 'System Admin', badge: 'All Access' },
  { email: 'admin@mes.dev', label: 'MES Admin', badge: 'MES Org' },
  { email: 'admin@cfes.dev', label: 'CFES Admin', badge: 'CFES Org' },
  { email: 'admin@cale.dev', label: 'CALE Admin', badge: 'CALE Org' },
  { email: 'admin@fireball.dev', label: 'Fireball Admin', badge: 'Fireball Only' },
  { email: 'admin@toga.dev', label: 'Toga Admin', badge: 'Toga Only' },
  { email: 'admin@grad.dev', label: 'Grad Admin', badge: 'Grad Only' },
  { email: 'admin@graffiti.dev', label: 'Graffiti Admin', badge: 'Graffiti Only' },
  { email: 'admin@natsurvey.dev', label: 'NatSurvey Admin', badge: 'Survey Only' },
  { email: 'admin@cale2026.dev', label: 'CALE 2026 Admin', badge: 'CALE 2026 Only' },
  { email: 'user@mes.dev', label: 'MES User', badge: 'User Portal' },
  { email: 'user@cfes.dev', label: 'CFES User', badge: 'User Portal' },
  { email: 'user@cale.dev', label: 'CALE User', badge: 'User Portal' },
];

/**
 * Team D Local Login Form
 * Development-focused login form with inline styles and optional quick login
 */
export function LocalLoginForm({
  title = 'Team D Local Development',
  subtitle = 'Quick login for development',
  onLogin,
  onLoginSuccess,
  onSuccess,
  showBranding = true,
  layout = 'fullscreen',
  maxWidth,
  primaryColor = teamDColors.primary,
  enableQuickLogin = false,
  seedUsers = DEFAULT_SEED_USERS,
  apiUrl,
  storagePrefix = 'teamd',
  authSource = 'local',
}: LocalLoginFormProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Determine max width: 600px with quick login, 400px without
  const cardMaxWidth = maxWidth || (enableQuickLogin ? '600px' : '400px');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Mode 1: Built-in API integration with onLoginSuccess
      if (apiUrl && onLoginSuccess) {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: email.trim() }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // API wraps response in data property (handle both nested and flat)
          const userData = data.data?.user || data.user;
          const token = data.data?.token || data.token;

          if (userData && token) {
            // Store auth info in sessionStorage
            sessionStorage.setItem(`${storagePrefix}-auth-user`, JSON.stringify(userData));
            sessionStorage.setItem(`${storagePrefix}-auth-token`, token);
            sessionStorage.setItem(`${storagePrefix}-auth-source`, authSource);

            // Call success callback
            onLoginSuccess(userData, token);

            if (onSuccess) {
              onSuccess();
            }
          } else {
            setError('Invalid response from server');
          }
        } else {
          setError(data.error?.message || data.error || 'Login failed');
        }
      }
      // Mode 2: Legacy callback style (onLogin returns boolean)
      else if (onLogin) {
        const success = await onLogin(email.trim());
        if (!success) {
          setError('Login failed. Please check your email and try again.');
        } else if (onSuccess) {
          onSuccess();
        }
      }
      // Mode 3: Only onLoginSuccess without API integration (error)
      else {
        setError('Invalid configuration: provide either onLogin or both apiUrl and onLoginSuccess');
      }
    } catch (error) {
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = (userEmail: string) => {
    setEmail(userEmail);
  };

  // Card content
  const cardContent = (
    <div
      style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: cardMaxWidth,
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: teamDColors.textDark,
            marginBottom: '8px',
          }}
        >
          {title}
        </h1>
        <p
          style={{
            color: teamDColors.textLight,
            fontSize: '1rem',
          }}
        >
          {subtitle}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label
            htmlFor="email"
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: teamDColors.textDark,
              marginBottom: '8px',
            }}
          >
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            style={{
              width: '100%',
              padding: '12px',
              border: `1px solid ${teamDColors.border}`,
              borderRadius: '6px',
              fontSize: '16px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {error && (
          <div
            style={{
              backgroundColor: teamDColors.errorBg,
              border: `1px solid ${teamDColors.errorBorder}`,
              color: teamDColors.error,
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            backgroundColor: isLoading ? '#9ca3af' : primaryColor,
            color: 'white',
            padding: '12px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '16px',
            fontWeight: '500',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {/* Quick Login Grid */}
      {enableQuickLogin && (
        <div
          style={{
            marginTop: '25px',
            paddingTop: '20px',
            borderTop: `1px solid ${teamDColors.border}`,
          }}
        >
          <h3
            style={{
              color: teamDColors.textDark,
              fontSize: '0.9rem',
              marginBottom: '12px',
              fontWeight: '600',
            }}
          >
            Quick Login (Development)
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            {seedUsers.map((user) => (
              <button
                key={user.email}
                type="button"
                onClick={() => quickLogin(user.email)}
                disabled={isLoading}
                style={{
                  padding: '8px 10px',
                  backgroundColor: email === user.email ? '#e7f3ff' : '#f8f9fa',
                  border: email === user.email ? '2px solid #0066cc' : `1px solid ${teamDColors.border}`,
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  transition: 'all 0.2s',
                  opacity: isLoading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && email !== user.email) {
                    e.currentTarget.style.backgroundColor = '#e9ecef';
                    e.currentTarget.style.borderColor = '#adb5bd';
                  }
                }}
                onMouseLeave={(e) => {
                  if (email !== user.email) {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                    e.currentTarget.style.borderColor = teamDColors.border;
                  }
                }}
              >
                <div style={{ fontWeight: '600', color: '#212529', marginBottom: '2px' }}>
                  {user.label}
                </div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: teamDColors.textLight,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.email}
                </div>
                <div
                  style={{
                    fontSize: '0.65rem',
                    color: primaryColor,
                    fontWeight: '500',
                    marginTop: '3px',
                  }}
                >
                  {user.badge}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Team D Branding Footer */}
      {showBranding && (
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: teamDColors.bgLight,
            borderRadius: '6px',
            fontSize: '14px',
            color: teamDColors.textLight,
          }}
        >
          <p style={{ margin: 0, textAlign: 'center' }}>
            <strong>Team D User Services</strong>
            <br />
            Large event user support and coordination
          </p>
        </div>
      )}
    </div>
  );

  // Return based on layout mode
  if (layout === 'card') {
    return cardContent;
  }

  // Fullscreen layout (default)
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: teamDColors.bgGray,
        padding: '20px',
      }}
    >
      {cardContent}
    </div>
  );
}
