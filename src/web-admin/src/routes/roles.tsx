import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { createAuthClient } from '@large-event/api-client';
import type { AuthUser } from '@large-event/api-types';
import type { Role, UserRolesResponse, AssignRoleRequest } from '@teamd/api-types';
import { useHasRole } from '../hooks/useHasRole';

const authClient = createAuthClient({
  storagePrefix: 'teamd',
  apiUrl: window.location.origin,
  debug: false,
});

function RoleManagementPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<Map<number, string[]>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { hasRole: isAdmin } = useHasRole(user, 'admin');

  // Get user from auth client on mount
  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = authClient.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    };
    checkAuth();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'teamd-auth-user' && !e.newValue) {
        setUser(null);
      } else if (e.key === 'teamd-auth-user' && e.newValue) {
        const currentUser = authClient.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Fetch users, roles, and user roles on mount
  useEffect(() => {
    if (!isAdmin || !user) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const token = sessionStorage.getItem('teamd-auth-token');
        if (!token) throw new Error('No auth token');

        // Fetch users
        const usersRes = await fetch('/api/users', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const usersData = await usersRes.json();
        setUsers(usersData.data.users || []);

        // Fetch roles
        const rolesRes = await fetch('/api/roles', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const rolesData = await rolesRes.json();
        setRoles(rolesData.data.roles || []);

        // Fetch roles for each user
        const rolesMap = new Map<number, string[]>();
        for (const user of usersData.data.users || []) {
          const userRolesRes = await fetch(`/api/users/${user.id}/roles`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          const userRolesData: UserRolesResponse = await userRolesRes.json();
          rolesMap.set(user.id, userRolesData.roleNames || []);
        }
        setUserRoles(rolesMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin]);

  const handleAssignRole = async (userId: number, roleName: string) => {
    try {
      const token = sessionStorage.getItem('teamd-auth-token');
      if (!token) throw new Error('No auth token');

      const requestBody: AssignRoleRequest = { roleName };
      const response = await fetch(`/api/users/${userId}/roles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to assign role');
      }

      // Update local state
      const currentRoles = userRoles.get(userId) || [];
      if (!currentRoles.includes(roleName)) {
        userRoles.set(userId, [...currentRoles, roleName]);
        setUserRoles(new Map(userRoles));
      }

      setSuccess(`Role '${roleName}' assigned successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign role');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleRevokeRole = async (userId: number, roleName: string) => {
    try {
      const token = sessionStorage.getItem('teamd-auth-token');
      if (!token) throw new Error('No auth token');

      const response = await fetch(`/api/users/${userId}/roles/${roleName}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to revoke role');
      }

      // Update local state
      const currentRoles = userRoles.get(userId) || [];
      userRoles.set(userId, currentRoles.filter(r => r !== roleName));
      setUserRoles(new Map(userRoles));

      setSuccess(`Role '${roleName}' revoked successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke role');
      setTimeout(() => setError(null), 3000);
    }
  };

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>You need admin role to access this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Role Management</h1>
        <Link
          to="/"
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-semibold"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search users by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => {
            const userRoleNames = userRoles.get(user.id) || [];
            return (
              <div key={user.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{user.name || user.email}</h3>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                  <div className="flex gap-2">
                    {userRoleNames.map((roleName) => (
                      <span
                        key={roleName}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                      >
                        {roleName}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  {roles.map((role) => {
                    const hasRole = userRoleNames.includes(role.name);
                    return (
                      <button
                        key={role.id}
                        onClick={() =>
                          hasRole
                            ? handleRevokeRole(user.id, role.name)
                            : handleAssignRole(user.id, role.name)
                        }
                        className={`px-3 py-1 rounded text-sm ${
                          hasRole
                            ? 'bg-red-100 text-red-800 hover:bg-red-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {hasRole ? `Remove ${role.name}` : `Assign ${role.name}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/roles')({
  component: RoleManagementPage,
});