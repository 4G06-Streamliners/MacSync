/**
 * Team D Mobile Components
 *
 * Export all public components, hooks, and utilities
 * for consumption by mobile app
 */

// Components
export { TeamDPlaceholder } from './components/Placeholder';

// API Client
export { teamDInstances, teamDUsers, tokenStorage } from './services/api';

// Types
export type {
  TeamComponentProps,
  AuthUser,
  InstanceResponse,
  OrganizationSummary,
  InstanceAccessLevel,
  SignupSummary,
  SignupRecord,
  SignupStatus,
} from './types';
