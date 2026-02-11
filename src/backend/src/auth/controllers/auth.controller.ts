/**
 * @file auth.controller.ts
 * @brief Example controller demonstrating usage of User Authorization Module (M8)
 * @description This controller shows how other modules can integrate with M8
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { Credentials, SessionToken, UserProfile } from './types';
import {
  InvalidCredentialsException,
  TokenInvalidException,
  SessionNotFoundException,
} from './exceptions';

/**
 * @class AuthController
 * @brief Example HTTP controller for authentication endpoints
 * @description Demonstrates how to expose M8 functionality via REST API
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * @route POST /auth/login
   * @brief Login endpoint
   * @description Authenticates user credentials and returns session token
   * 
   * @example
   * Request:
   * POST /auth/login
   * {
   *   "username": "user@example.com",
   *   "password": "password123"
   * }
   * 
   * Response:
   * {
   *   "token": "MST_abc123...",
   *   "userProfile": {
   *     "userId": "12345",
   *     "username": "user@example.com",
   *     "email": "user@example.com",
   *     "roles": ["user"],
   *     "createdAt": "2026-02-11T10:30:00.000Z"
   *   },
   *   "issuedAt": "2026-02-11T10:30:00.000Z",
   *   "expiresAt": "2026-02-11T11:30:00.000Z"
   * }
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() credentials: Credentials): Promise<SessionToken> {
    return await this.authService.login(credentials);
  }

  /**
   * @route POST /auth/logout
   * @brief Logout endpoint
   * @description Invalidates the provided session token
   * 
   * @example
   * Request:
   * POST /auth/logout
   * Headers: { "Authorization": "Bearer MST_abc123..." }
   * 
   * Response:
   * { "message": "Logged out successfully" }
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Headers('authorization') authorization: string,
  ): Promise<{ message: string }> {
    const token = this.extractToken(authorization);
    await this.authService.logout(token);
    return { message: 'Logged out successfully' };
  }

  /**
   * @route GET /auth/validate
   * @brief Token validation endpoint
   * @description Validates session token and returns user profile
   * 
   * @example
   * Request:
   * GET /auth/validate
   * Headers: { "Authorization": "Bearer MST_abc123..." }
   * 
   * Response:
   * {
   *   "userId": "12345",
   *   "username": "user@example.com",
   *   "email": "user@example.com",
   *   "roles": ["user"],
   *   "createdAt": "2026-02-11T10:30:00.000Z"
   * }
   */
  @Get('validate')
  async validate(
    @Headers('authorization') authorization: string,
  ): Promise<UserProfile> {
    const token = this.extractToken(authorization);
    return await this.authService.validateToken(token);
  }

  /**
   * @route GET /auth/me
   * @brief Get current user profile
   * @description Returns identity context for authenticated user (demonstrates M8 → M2 integration)
   * 
   * @example
   * Request:
   * GET /auth/me
   * Headers: { "Authorization": "Bearer MST_abc123..." }
   * 
   * Response:
   * {
   *   "userId": "12345",
   *   "username": "user@example.com",
   *   "email": "user@example.com",
   *   "roles": ["user"],
   *   "createdAt": "2026-02-11T10:30:00.000Z"
   * }
   */
  @Get('me')
  async getCurrentUser(
    @Headers('authorization') authorization: string,
  ): Promise<UserProfile> {
    const token = this.extractToken(authorization);
    return await this.authService.getIdentityContext(token);
  }

  /**
   * @route GET /auth/sessions
   * @brief Get active session count (monitoring endpoint)
   * @description Returns number of currently active sessions
   * 
   * @example
   * Response:
   * { "activeSessionCount": 42 }
   */
  @Get('sessions')
  async getActiveSessions(): Promise<{ activeSessionCount: number }> {
    return {
      activeSessionCount: this.authService.getActiveSessionCount(),
    };
  }

  /**
   * @private
   * @function extractToken
   * @brief Extracts token from Authorization header
   * @description Parses "Bearer <token>" format
   */
  private extractToken(authorization: string): string {
    if (!authorization) {
      throw new TokenInvalidException('Authorization header missing');
    }

    const parts = authorization.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new TokenInvalidException(
        'Invalid authorization header format. Expected: Bearer <token>',
      );
    }

    return parts[1];
  }
}
