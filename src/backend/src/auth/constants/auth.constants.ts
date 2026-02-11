/**
 * @file auth.constants.ts
 * @brief Exported constants for the User Authorization Module (M8)
 * @details Defines configuration values to avoid magic numbers
 */

/**
 * @const TOKEN_EXPIRY_MIN
 * @brief Session token expiration time in minutes
 * @details Default: 60 minutes (1 hour)
 * Configurable via environment variable AUTH_TOKEN_EXPIRY_MIN
 */
export const TOKEN_EXPIRY_MIN = parseInt(
  process.env.AUTH_TOKEN_EXPIRY_MIN || '60',
  10,
);

/**
 * @const REFRESH_TOKEN_EXPIRY_MIN
 * @brief Refresh token expiration time in minutes
 * @details Default: 10080 minutes (7 days)
 * Configurable via environment variable AUTH_REFRESH_TOKEN_EXPIRY_MIN
 */
export const REFRESH_TOKEN_EXPIRY_MIN = parseInt(
  process.env.AUTH_REFRESH_TOKEN_EXPIRY_MIN || '10080',
  10,
);

/**
 * @const AUTH_SERVER_URL
 * @brief URL of the external authentication provider
 * @details Must be configured via environment variable
 * Falls back to localhost for development
 */
export const AUTH_SERVER_URL =
  process.env.AUTH_SERVER_URL || 'http://localhost:8080/auth';

/**
 * @const TOKEN_PREFIX
 * @brief Prefix for generated session tokens
 * @details Used to identify token format and version
 */
export const TOKEN_PREFIX = 'MST_'; // MacSync Token

/**
 * @const MAX_ACTIVE_SESSIONS_PER_USER
 * @brief Maximum number of concurrent sessions allowed per user
 * @details Default: 5 sessions
 */
export const MAX_ACTIVE_SESSIONS_PER_USER = parseInt(
  process.env.MAX_ACTIVE_SESSIONS_PER_USER || '5',
  10,
);
