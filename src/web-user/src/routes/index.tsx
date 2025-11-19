import { createFileRoute } from '@tanstack/react-router';
import { ProtectedTeamRoute, PORTAL_CONFIGS, type SeedUser } from '@large-event/web-components';
import { useState, useEffect } from 'react';
import { useInstance } from '../lib/instance-provider';
import { createAuthClient } from '@large-event/api-client';
import type { AuthUser, InstanceResponse as Instance } from '@large-event/api-types';

const authClient = createAuthClient({
  storagePrefix: 'teamd',
  apiUrl: window.location.origin,
  debug: false,
});

// Seed users for quick login
const SEED_USERS: SeedUser[] = [
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

function HomePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { instances, loading, error, currentInstance, setCurrentInstance } = useInstance();
  const [isLocalAuth, setIsLocalAuth] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // Check for URL-based auth or stored sessionStorage auth
      const currentUser = authClient.getCurrentUser();

      if (currentUser) {
        setUser(currentUser);
        // Dispatch event to trigger instance fetching
        window.dispatchEvent(new Event('teamd-auth-changed'));
      }

      setAuthLoading(false);
    };

    checkAuth();

    // Listen for storage changes (if user logs out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'teamd-auth-user' && !e.newValue) {
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    // Check if user is authenticated via local auth (not main portal)
    const authSource = sessionStorage.getItem('teamd-auth-source');
    setIsLocalAuth(authSource === 'local');
  }, [user]);

  const handleLogout = async () => {
    const authSource = sessionStorage.getItem('teamd-auth-source');
    const isLocalAuth = authSource === 'local';

    try {
      // Clear HTTP-only cookie via API
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout API failed:', error);
    } finally {
      if (isLocalAuth) {
        // Local auth: just clear and reload
        authClient.clearStoredAuth();
        window.location.reload();
      } else {
        // Main portal auth: notify opener tab and close
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'teamd-logout' }, '*');
        }

        // Clear all local session storage
        sessionStorage.removeItem('teamd-auth-user');
        sessionStorage.removeItem('teamd-auth-token');
        sessionStorage.removeItem('teamd-auth-source');
        sessionStorage.removeItem('teamd-current-instance');

        // Try to close the tab
        window.close();

        // Fallback: redirect if tab didn't close
        setTimeout(() => {
          if (!window.closed) {
            window.location.replace('http://localhost:4000');
          }
        }, 100);
      }
    }
  };

  // Filter instances to only show user portal access (web_user or both)
  const userInstances = instances.filter(
    (instance) => instance.accessLevel === 'web_user' || instance.accessLevel === 'both'
  );

  // Group instances by owner organization
  const instancesByOrg = userInstances.reduce((acc, instance) => {
    const orgName = instance.ownerOrganization.name;
    if (!acc[orgName]) {
      acc[orgName] = [];
    }
    acc[orgName].push(instance);
    return acc;
  }, {} as Record<string, Instance[]>);

  return (
    <ProtectedTeamRoute
      user={user}
      isLoading={authLoading}
      portalConfig={PORTAL_CONFIGS.user}
      teamName="Team D"
      teamDescription="Event Services - User Portal"
      primaryColor="#8b5cf6"
      storagePrefix="teamd"
      enableLocalLogin
      enableQuickLogin
      seedUsers={SEED_USERS}
      onLocalLogin={(authUser, token) => {
        console.log('Local login successful:', authUser);
        setUser(authUser);
        window.dispatchEvent(new Event('teamd-auth-changed'));
      }}
    >
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <header style={{
          backgroundColor: '#8b5cf6',
          color: 'white',
          padding: '20px 0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                margin: 0
              }}>
                Team D - Event Services
              </h1>
              <p style={{
                fontSize: '0.9rem',
                margin: '4px 0 0 0',
                opacity: 0.9
              }}>
                Team D Large Event Support
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '0.9rem' }}>Welcome, {user?.email}</span>
              <button
                onClick={handleLogout}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                {isLocalAuth ? 'Logout' : 'Logout & Close'}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={{
          flex: 1,
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '40px 20px',
          width: '100%'
        }}>
          {/* Welcome Section */}
          <div style={{
            textAlign: 'center',
            marginBottom: '40px'
          }}>
            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '16px'
            }}>
              Hi {user?.email}
            </h2>
            <p style={{
              fontSize: '1.2rem',
              color: '#6b7280',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Select an event to access
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Loading instances...
            </div>
          )}

          {/* Error State */}
          {error && (
            <div style={{
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              padding: '20px',
              color: '#c33',
              textAlign: 'center'
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* No Access State */}
          {!loading && !error && userInstances.length === 0 && (
            <div style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              padding: '20px',
              color: '#856404',
              textAlign: 'center'
            }}>
              <strong>No user access available.</strong> You need user portal access to view this page.
            </div>
          )}

          {/* Instances Grid by Organization */}
          {!loading && !error && Object.keys(instancesByOrg).length > 0 && (
            <div>
              {Object.entries(instancesByOrg).map(([orgName, orgInstances]) => (
                <div key={orgName} style={{ marginBottom: '40px' }}>
                  <h3 style={{
                    fontSize: '1.5rem',
                    color: '#495057',
                    marginBottom: '20px',
                    borderBottom: '2px solid #dee2e6',
                    paddingBottom: '10px'
                  }}>
                    {orgName}
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '20px'
                  }}>
                    {orgInstances.map((instance) => (
                      <div
                        key={instance.id}
                        style={{
                          backgroundColor: 'white',
                          border: currentInstance?.id === instance.id ? '3px solid #007bff' : '1px solid #dee2e6',
                          borderRadius: '8px',
                          padding: '20px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: currentInstance?.id === instance.id
                            ? '0 4px 12px rgba(0,123,255,0.3)'
                            : '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        onClick={() => setCurrentInstance(instance)}
                        onMouseEnter={(e) => {
                          if (currentInstance?.id !== instance.id) {
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentInstance?.id !== instance.id) {
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }
                        }}
                      >
                        <h4 style={{
                          fontSize: '1.25rem',
                          color: '#212529',
                          marginBottom: '10px',
                          fontWeight: '600'
                        }}>
                          {instance.name}
                        </h4>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          fontSize: '0.9rem',
                          color: '#6c757d'
                        }}>
                          <div>
                            <strong>Organization:</strong> {instance.ownerOrganization.name}
                            {instance.ownerOrganization.acronym && ` (${instance.ownerOrganization.acronym})`}
                          </div>
                          <div>
                            <strong>Access:</strong> {instance.accessLevel === 'both' ? 'Full Access' : instance.accessLevel === 'web_admin' ? 'Admin Portal' : 'User Portal'}
                          </div>
                        </div>
                        {currentInstance?.id === instance.id && (
                          <div style={{
                            marginTop: '15px',
                            padding: '8px',
                            backgroundColor: '#d1ecf1',
                            borderRadius: '4px',
                            color: '#0c5460',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            textAlign: 'center'
                          }}>
                            ✓ Currently Selected
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer style={{
          backgroundColor: '#1f2937',
          color: '#9ca3af',
          padding: '30px 0',
          marginTop: 'auto'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 20px',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              © 2025 Team D Event Services. Large event support and coordination.
            </p>
          </div>
        </footer>
      </div>
    </ProtectedTeamRoute>
  );
}

export const Route = createFileRoute('/')({
  component: HomePage,
});
