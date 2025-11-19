import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { createAuthClient } from '@large-event/api-client';
import type { AuthUser } from '@large-event/api-types';
import { useInstance } from '../lib/instance-provider';
import type { InstanceResponse as Instance } from '@large-event/api-types';
import { ProtectedTeamRoute, PORTAL_CONFIGS, type SeedUser } from '@large-event/web-components';

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

function TeamDDashboard({ user }: { user: AuthUser | null }) {
  const { instances, loading, error, currentInstance, setCurrentInstance } = useInstance();

  // Filter instances to only show admin portal access (web_admin or both)
  const adminInstances = instances.filter(
    (instance) => instance.accessLevel === 'web_admin' || instance.accessLevel === 'both'
  );

  // Group instances by owner organization
  const instancesByOrg = adminInstances.reduce((acc, instance) => {
    const orgName = instance.ownerOrganization.name;
    if (!acc[orgName]) {
      acc[orgName] = [];
    }
    acc[orgName].push(instance);
    return acc;
  }, {} as Record<string, Instance[]>);

  return (
    <main className="p-5 max-w-dashboard mx-auto">
      <div className="text-center py-10 px-5 bg-gray-100 rounded-lg mb-8">
        <h1 className="text-4xl text-gray-700 mb-2.5">
          Hi {user?.email}
        </h1>
        <h2 className="text-3xl text-gray-600 mb-5">
          Team D - Select an Organization
        </h2>
        <p className="text-lg text-gray-500">
          Choose an organization dashboard to manage
        </p>
      </div>

      {loading && (
        <div className="text-center py-10 text-gray-500">
          Loading instances...
        </div>
      )}

      {error && (
        <div className="bg-error-light border border-error-border rounded-lg p-5 text-error-text text-center">
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && adminInstances.length === 0 && (
        <div className="warning-box text-center">
          <strong>No admin access available.</strong> You need admin portal access to view this page.
        </div>
      )}

      {!loading && !error && Object.keys(instancesByOrg).length > 0 && (
        <div>
          {Object.entries(instancesByOrg).map(([orgName, orgInstances]) => (
            <div key={orgName} className="mb-10">
              <h3 className="text-2xl text-gray-600 mb-5 border-b-2 border-gray-300 pb-2.5">
                {orgName}
              </h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
                {orgInstances.map((instance) => (
                  <div
                    key={instance.id}
                    onClick={() => setCurrentInstance(instance)}
                    className="bg-white rounded-lg border-2 border-gray-200 p-5 cursor-pointer transition-card hover:border-teamd-purple hover:shadow-card-hover hover:-translate-y-0.5"
                  >
                    <h4 className="m-0 mb-2.5 text-teamd-purple text-xl">
                      {instance.name}
                    </h4>
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <p className="m-0 mb-2 text-[0.85rem] text-gray-600 font-bold">
                        Owner: {instance.ownerOrganization.acronym || instance.ownerOrganization.name}
                      </p>
                      <p className="m-0 text-[0.85rem] text-gray-500">
                        Access: {instance.accessLevel === 'both' ? 'Full Access' : instance.accessLevel === 'web_admin' ? 'Admin Portal' : 'User Portal'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {currentInstance && (
        <div className="fixed bottom-5 right-5 bg-success text-white py-4 px-5 rounded-lg shadow-card max-w-[300px]">
          <strong>Selected:</strong> {currentInstance.name}
        </div>
      )}
    </main>
  );
}

function Home() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

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
            window.location.replace('http://localhost:4001');
          }
        }, 100);
      }
    }
  };

  return (
    <ProtectedTeamRoute
      user={user}
      isLoading={authLoading}
      portalConfig={PORTAL_CONFIGS.admin}
      teamName="Team D"
      teamDescription="Event Services - Admin Portal"
      primaryColor="#6f42c1"
      storagePrefix="teamd"
      showAuthHeader
      enableLocalLogin
      enableQuickLogin
      seedUsers={SEED_USERS}
      onLogout={handleLogout}
      onLocalLogin={(authUser, token) => {
        console.log('Local login successful:', authUser);
        setUser(authUser);
        window.dispatchEvent(new Event('teamd-auth-changed'));
      }}
    >
      <TeamDDashboard user={user} />
    </ProtectedTeamRoute>
  );
}

export const Route = createFileRoute('/')({
  component: Home,
});
