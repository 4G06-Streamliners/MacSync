/**
 * Team D Web User Auth Context
 * Uses shared auth infrastructure from @large-event/api
 */

import {
  createAuthContext,
  createAuthApi,
  createAuthClient,
  createFetchClient,
  createTokenStorage,
  sessionStorageAdapter,
} from '@large-event/api-client';

// Create auth client for URL token extraction
const authClient = createAuthClient({
  storagePrefix: 'teamd',
  apiUrl: window.location.origin,
  debug: false,
});

// Create HTTP client for bearer auth
const httpClient = createFetchClient({
  baseURL: window.location.origin,
  authType: 'bearer',
  storage: sessionStorageAdapter,
  tokenKey: 'teamd-auth-token',
});

// Create auth API client
const authApi = createAuthApi({
  httpClient,
  authType: 'bearer',
});

// Create token storage
const tokenStorage = createTokenStorage({
  storage: sessionStorageAdapter,
  prefix: 'teamd',
});

// Create and export auth context
export const { AuthProvider, useAuth } = createAuthContext({
  authApi,
  authClient,
  tokenStorage,
  onLogoutBehavior: 'reload',
  enableInstanceManagement: false,
  skipCookieFallback: true,
  debug: false,
});
