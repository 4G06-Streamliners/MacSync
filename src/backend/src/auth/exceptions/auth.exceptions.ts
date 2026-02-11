/**
 * @file auth.exceptions.ts
 * @brief Custom exceptions for the User Authorization Module
 * @details Defines specific exception types thrown by auth operations
 */

import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * @class InvalidCredentialsException
 * @brief Thrown when login credentials are incorrect
 * @details Trigger condition: Username not found OR password does not match
 */
export class InvalidCredentialsException extends HttpException {
  constructor(message = 'Invalid username or password') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

/**
 * @class TokenInvalidException
 * @brief Thrown when a session token is invalid or expired
 * @details Trigger conditions:
 * - Token does not exist in activeSessions
 * - Token has expired (current time > expiryTime)
 * - Token format is malformed
 */
export class TokenInvalidException extends HttpException {
  constructor(message = 'Invalid or expired session token') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

/**
 * @class AuthProviderException
 * @brief Thrown when external authentication provider fails
 * @details Trigger conditions:
 * - Cannot reach AUTH_SERVER_URL
 * - Provider returns error response
 * - Network timeout or connection error
 */
export class AuthProviderException extends HttpException {
  constructor(message = 'Authentication provider error') {
    super(message, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

/**
 * @class SessionNotFoundException
 * @brief Thrown when attempting to logout a non-existent session
 * @details Trigger condition: Token not found in activeSessions during logout
 */
export class SessionNotFoundException extends HttpException {
  constructor(message = 'Session not found') {
    super(message, HttpStatus.NOT_FOUND);
  }
}
