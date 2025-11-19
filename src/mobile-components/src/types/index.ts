/**
 * Team D Mobile Type Definitions
 */

// NOTE: These types mirror @large-event/api-types
// Kept inline to avoid workspace dependency resolution issues during standalone build
// IMPORTANT: Keep these in sync with shared/api-types/src

export interface AuthUser {
  id: number;
  email: string;
  name: string;  // Updated to match database schema (was firstName/lastName)
  isSystemAdmin: boolean;
}

export interface OrganizationSummary {
  id: number;
  name: string;
  acronym: string | null;
}

export type InstanceAccessLevel = 'web_user' | 'web_admin' | 'both';

export interface InstanceResponse {
  id: number;
  name: string;
  accessLevel: InstanceAccessLevel;
  ownerOrganization: OrganizationSummary;
}

/**
 * Props passed to Team D mobile components by mobile app
 */
export interface TeamComponentProps {
  user: AuthUser;
  token: string;
  instances: InstanceResponse[];
  onNavigateBack?: () => void;
}
