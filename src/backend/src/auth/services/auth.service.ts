/**
 * @file auth.service.ts
 * @brief User Authorization Module (M8) - Core Service Implementation
 * @module M8
 * @description
 * Secrets: Identity verification, session tokens
 * Services: Authenticates users, issues and validates session tokens,
 *           provides identity context to other modules
 * Type: Library
 * 
 * @semantics
 * State Variables:
 * - activeSessions: Map<string, SessionToken> - Maps token strings to session data
 * - tokenExpiryTimes: Map<string, Date> - Maps token strings to expiration timestamps
 * 
 * Environment Variables:
 * - SystemTime: Current system time (Date.now())
 * 
 * State Invariant:
 * - Every token in activeSessions must have a corresponding entry in tokenExpiryTimes
 * - No expired tokens should remain in activeSessions (cleaned periodically)
 */

import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  Credentials,
  UserProfile,
  SessionToken,
} from '../types';
import {
  InvalidCredentialsException,
  TokenInvalidException,
  AuthProviderException,
  SessionNotFoundException,
} from '../exceptions';
import {
  TOKEN_EXPIRY_MIN,
  TOKEN_PREFIX,
  AUTH_SERVER_URL,
} from '../constants';

/**
 * @class AuthService
 * @brief Core authentication service implementing M8 functionality
 * @implements Exported Access Programs: login, logout, validateToken
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /**
   * @member activeSessions
   * @brief Dictionary mapping session tokens to their associated data
   * @semantics Maps token string to SessionToken object containing user profile and metadata
   */
  private readonly activeSessions = new Map<string, SessionToken>();

  /**
   * @member tokenExpiryTimes
   * @brief Dictionary mapping session tokens to their expiration timestamps
   * @semantics Maps token string to Date object representing expiration time
   */
  private readonly tokenExpiryTimes = new Map<string, Date>();

  constructor() {
    // Start background task to clean expired tokens every 5 minutes
    this.startTokenCleanupTask();
  }

  /**
   * @function login
   * @brief Authenticates a user and issues a session token
   * 
   * @description
   * Pseudocode:
   * 1. Validate credentials format (non-empty username and password)
   * 2. Call external authentication provider at AUTH_SERVER_URL
   * 3. If provider returns error, throw InvalidCredentialsException
   * 4. If provider unreachable, throw AuthProviderException
   * 5. On success, extract UserProfile from provider response
   * 6. Generate unique session token with TOKEN_PREFIX
   * 7. Calculate expiry time: SystemTime + TOKEN_EXPIRY_MIN
   * 8. Update activeSessions[token] = SessionToken object
   * 9. Update tokenExpiryTimes[token] = expiry time
   * 10. Return SessionToken to caller
   * 
   * @param credentials - User credentials (username, password, optional apiKey)
   * @returns SessionToken containing token string and user profile
   * @throws InvalidCredentialsException - When username or password is incorrect
   * @throws AuthProviderException - When external auth provider fails or is unreachable
   * 
   * @precondition credentials.username and credentials.password are non-empty strings
   * @postcondition On success, a new entry exists in activeSessions and tokenExpiryTimes
   */
  async login(credentials: Credentials): Promise<SessionToken> {
    this.logger.log(`Login attempt for user: ${credentials.username}`);

    // Step 1: Validate credentials format
    if (!credentials.username || !credentials.password) {
      throw new InvalidCredentialsException(
        'Username and password are required',
      );
    }

    try {
      // Step 2-5: Call external authentication provider
      const userProfile = await this.authenticateWithProvider(credentials);

      // Step 6: Generate unique session token
      const token = this.generateToken();

      // Step 7: Calculate expiry time
      const issuedAt = new Date();
      const expiresAt = new Date(
        issuedAt.getTime() + TOKEN_EXPIRY_MIN * 60 * 1000,
      );

      // Step 8-9: Create session token and update state
      const sessionToken: SessionToken = {
        token,
        userProfile,
        issuedAt,
        expiresAt,
      };

      this.activeSessions.set(token, sessionToken);
      this.tokenExpiryTimes.set(token, expiresAt);

      this.logger.log(
        `User ${userProfile.username} logged in successfully. Token expires at ${expiresAt.toISOString()}`,
      );

      // Step 10: Return session token
      return sessionToken;
    } catch (error) {
      if (
        error instanceof InvalidCredentialsException ||
        error instanceof AuthProviderException
      ) {
        throw error;
      }
      this.logger.error(`Unexpected error during login: ${error.message}`);
      throw new AuthProviderException('Authentication failed');
    }
  }

  /**
   * @function logout
   * @brief Invalidates a session token and removes it from active sessions
   * 
   * @description
   * Pseudocode:
   * 1. Check if token exists in activeSessions
   * 2. If not found, throw SessionNotFoundException
   * 3. Remove token from activeSessions
   * 4. Remove token from tokenExpiryTimes
   * 5. Log successful logout
   * 6. Return void
   * 
   * @param token - The session token to invalidate
   * @returns void
   * @throws SessionNotFoundException - When token does not exist in activeSessions
   * @throws TokenInvalidException - When token format is malformed
   * 
   * @precondition token is a non-empty string
   * @postcondition Token is removed from both activeSessions and tokenExpiryTimes
   */
  async logout(token: string): Promise<void> {
    this.logger.log(`Logout attempt with token: ${this.maskToken(token)}`);

    // Step 1: Validate token format
    if (!token || typeof token !== 'string') {
      throw new TokenInvalidException('Invalid token format');
    }

    // Step 2: Check if session exists
    const session = this.activeSessions.get(token);
    if (!session) {
      throw new SessionNotFoundException(
        'Session not found or already logged out',
      );
    }

    // Step 3-4: Remove from both maps
    this.activeSessions.delete(token);
    this.tokenExpiryTimes.delete(token);

    // Step 5: Log successful logout
    this.logger.log(
      `User ${session.userProfile.username} logged out successfully`,
    );
  }

  /**
   * @function validateToken
   * @brief Validates a session token and returns associated user profile
   * 
   * @description
   * Pseudocode:
   * 1. Check if token exists in activeSessions
   * 2. If not found, throw TokenInvalidException (reason: token does not exist)
   * 3. Get expiry time from tokenExpiryTimes
   * 4. Get current system time
   * 5. If current time > expiry time, remove token and throw TokenInvalidException (reason: expired)
   * 6. Extract UserProfile from SessionToken in activeSessions
   * 7. Return UserProfile to caller
   * 
   * @param token - The session token to validate
   * @returns UserProfile of the authenticated user
   * @throws TokenInvalidException - When token is invalid, expired, or malformed
   * 
   * @precondition token is a non-empty string
   * @postcondition If token is expired, it is removed from activeSessions and tokenExpiryTimes
   */
  async validateToken(token: string): Promise<UserProfile> {
    // Step 1: Check token format
    if (!token || typeof token !== 'string') {
      throw new TokenInvalidException('Invalid token format');
    }

    // Step 2: Check if session exists
    const session = this.activeSessions.get(token);
    if (!session) {
      throw new TokenInvalidException(
        'Token does not exist in active sessions',
      );
    }

    // Step 3-5: Check expiration
    const expiryTime = this.tokenExpiryTimes.get(token);
    const currentTime = new Date();

    if (!expiryTime || currentTime > expiryTime) {
      // Clean up expired token
      this.activeSessions.delete(token);
      this.tokenExpiryTimes.delete(token);
      this.logger.warn(
        `Expired token detected for user: ${session.userProfile.username}`,
      );
      throw new TokenInvalidException('Token has expired');
    }

    // Step 6-7: Return user profile
    this.logger.debug(
      `Token validated successfully for user: ${session.userProfile.username}`,
    );
    return session.userProfile;
  }

  /**
   * @function getIdentityContext
   * @brief Provides identity context to other modules (specifically M2)
   * @description Wrapper around validateToken for semantic clarity when modules
   *              request identity context rather than just validation
   * 
   * @param token - The session token to get identity for
   * @returns UserProfile containing user identity information
   * @throws TokenInvalidException - When token is invalid or expired
   */
  async getIdentityContext(token: string): Promise<UserProfile> {
    return this.validateToken(token);
  }

  /**
   * @function authenticateWithProvider
   * @brief Communicates with external authentication provider
   * @description Simulates HTTP call to AUTH_SERVER_URL to verify credentials
   * 
   * @param credentials - User credentials to verify
   * @returns UserProfile from the authentication provider
   * @throws InvalidCredentialsException - When provider rejects credentials
   * @throws AuthProviderException - When provider is unreachable
   * 
   * @note In production, this would make actual HTTP requests to the provider
   */
  private async authenticateWithProvider(
    credentials: Credentials,
  ): Promise<UserProfile> {
    // TODO: Implement actual HTTP client call to AUTH_SERVER_URL
    // For now, this is a mock implementation
    
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Mock authentication logic (replace with actual API call)
    if (credentials.username === 'test@example.com' && credentials.password === 'password123') {
      return {
        userId: '12345',
        username: credentials.username,
        email: credentials.username,
        roles: ['user'],
        createdAt: new Date(),
      };
    }

    // Simulate provider rejection
    throw new InvalidCredentialsException(
      'Invalid username or password',
    );
  }

  /**
   * @function generateToken
   * @brief Generates a unique session token
   * @description Creates a cryptographically secure random token with prefix
   * 
   * @returns Unique token string in format: TOKEN_PREFIX + random_hex
   */
  private generateToken(): string {
    const randomString = randomBytes(32).toString('hex');
    return `${TOKEN_PREFIX}${randomString}`;
  }

  /**
   * @function startTokenCleanupTask
   * @brief Starts a background task to remove expired tokens
   * @description Runs every 5 minutes to maintain state invariant
   */
  private startTokenCleanupTask(): void {
    setInterval(() => {
      this.cleanupExpiredTokens();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * @function cleanupExpiredTokens
   * @brief Removes all expired tokens from state variables
   * @description Maintains state invariant by ensuring no expired tokens remain
   */
  private cleanupExpiredTokens(): void {
    const currentTime = new Date();
    let cleanedCount = 0;

    for (const [token, expiryTime] of this.tokenExpiryTimes.entries()) {
      if (currentTime > expiryTime) {
        this.activeSessions.delete(token);
        this.tokenExpiryTimes.delete(token);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired tokens`);
    }
  }

  /**
   * @function maskToken
   * @brief Masks token for logging purposes
   * @description Shows only first and last 4 characters for security
   */
  private maskToken(token: string): string {
    if (token.length <= 8) return '****';
    return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
  }

  /**
   * @function getActiveSessionCount
   * @brief Returns the number of currently active sessions
   * @description Utility method for monitoring and diagnostics
   */
  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  /**
   * @function getSessionsForUser
   * @brief Returns all active session tokens for a specific user
   * @description Helper method for session management and security monitoring
   */
  getSessionsForUser(userId: string): SessionToken[] {
    return Array.from(this.activeSessions.values()).filter(
      (session) => session.userProfile.userId === userId,
    );
  }
}
