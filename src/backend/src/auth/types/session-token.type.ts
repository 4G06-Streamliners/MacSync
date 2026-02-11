/**
 * @file session-token.type.ts
 * @brief Defines the SessionToken data type for managing user sessions
 * @details Contains token string and associated metadata
 */

import { UserProfile } from './user-profile.type';

/**
 * @interface SessionToken
 * @brief Represents a valid session token with metadata
 * @property token - The unique session token string
 * @property userProfile - The associated user profile information
 * @property issuedAt - Timestamp when the token was issued
 * @property expiresAt - Timestamp when the token expires
 */
export interface SessionToken {
  token: string;
  userProfile: UserProfile;
  issuedAt: Date;
  expiresAt: Date;
}
