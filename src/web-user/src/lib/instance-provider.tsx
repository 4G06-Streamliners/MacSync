/**
 * TeamD Instance Provider
 * Wraps the shared InstanceProvider with TeamD-specific configuration
 */

import type { ReactNode } from 'react';
import {
  InstanceProvider as SharedInstanceProvider,
  createInstanceApi,
  sessionStorageAdapter,
} from '@large-event/api-client';
import TeamDConfig from '../../../../teamd.config.mts';
import { createTeamDHttpClient } from './teamd-http-client';

// Create HTTP client with TeamD configuration
// Uses wrapper to unwrap Team D's { success, data } response format
const httpClient = createTeamDHttpClient({
  baseURL: `${TeamDConfig.api.url.local}/api`,
  authType: 'bearer',
  storage: sessionStorageAdapter,
  tokenKey: 'teamd-auth-token',
});

// Create instance API
const instanceApi = createInstanceApi(httpClient);

export function InstanceProvider({ children }: { children: ReactNode }) {
  return (
    <SharedInstanceProvider
      config={{
        instanceApi,
        storage: sessionStorageAdapter,
        storageKey: 'teamd-current-instance',
        refreshEventName: 'teamd-auth-changed',
        autoFetch: false,
      }}
    >
      {children}
    </SharedInstanceProvider>
  );
}

// Re-export the hook with teamD-specific name
export { useInstanceContext as useInstance } from '@large-event/api-client';
