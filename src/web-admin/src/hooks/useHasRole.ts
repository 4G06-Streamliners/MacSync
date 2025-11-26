import { useState, useEffect } from 'react';
import type { AuthUser } from '@large-event/api-types';
import type { UserRolesResponse } from '@teamd/api-types';

/**
 * Hook to check if the current user has a specific role
 * Reads roles from JWT token or fetches from API
 */
export function useHasRole(user: AuthUser | null, roleName: string): {
  hasRole: boolean;
  isLoading: boolean;
  error: Error | null;
} {
  const [hasRole, setHasRole] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setHasRole(false);
      setIsLoading(false);
      return;
    }

    // First check if roles are in the JWT token (from user.roles)
    // Note: roles may not be in the AuthUser type from @large-event/api-types
    // but they might be present at runtime if the API includes them
    const userWithRoles = user as AuthUser & { roles?: string[] };
    if (userWithRoles.roles && Array.isArray(userWithRoles.roles)) {
      const hasRoleInToken = userWithRoles.roles.includes(roleName);
      setHasRole(hasRoleInToken);
      setIsLoading(false);
      return;
    }

    // If not in token, fetch from API
    const fetchUserRoles = async () => {
      try {
        setIsLoading(true);
        const token = sessionStorage.getItem('teamd-auth-token');
        if (!token) {
          setHasRole(false);
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/users/me/roles', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user roles');
        }

        const data: UserRolesResponse = await response.json();
        const hasRoleValue = data.roleNames.includes(roleName);
        setHasRole(hasRoleValue);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setHasRole(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRoles();
  }, [user, roleName]);

  return { hasRole, isLoading, error };
}