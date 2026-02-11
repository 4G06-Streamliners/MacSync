/**
 * @file auth.service.spec.ts
 * @brief Unit tests for User Authorization Module (M8)
 * @description Tests all exported access programs and exception conditions
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import {
  InvalidCredentialsException,
  TokenInvalidException,
  SessionNotFoundException,
} from '../exceptions';
import { Credentials } from '../types';

describe('AuthService - User Authorization Module (M8)', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should successfully authenticate valid credentials', async () => {
      const credentials: Credentials = {
        username: 'test@example.com',
        password: 'password123',
      };

      const sessionToken = await service.login(credentials);

      expect(sessionToken).toBeDefined();
      expect(sessionToken.token).toContain('MST_');
      expect(sessionToken.userProfile.username).toBe(credentials.username);
      expect(sessionToken.userProfile.email).toBe(credentials.username);
      expect(sessionToken.issuedAt).toBeInstanceOf(Date);
      expect(sessionToken.expiresAt).toBeInstanceOf(Date);
      expect(sessionToken.expiresAt.getTime()).toBeGreaterThan(
        sessionToken.issuedAt.getTime(),
      );
    });

    it('should throw InvalidCredentialsException for empty username', async () => {
      const credentials: Credentials = {
        username: '',
        password: 'password123',
      };

      await expect(service.login(credentials)).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it('should throw InvalidCredentialsException for empty password', async () => {
      const credentials: Credentials = {
        username: 'test@example.com',
        password: '',
      };

      await expect(service.login(credentials)).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it('should throw InvalidCredentialsException for wrong password', async () => {
      const credentials: Credentials = {
        username: 'test@example.com',
        password: 'wrongpassword',
      };

      await expect(service.login(credentials)).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it('should throw InvalidCredentialsException for non-existent user', async () => {
      const credentials: Credentials = {
        username: 'nonexistent@example.com',
        password: 'password123',
      };

      await expect(service.login(credentials)).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it('should create session in activeSessions after successful login', async () => {
      const credentials: Credentials = {
        username: 'test@example.com',
        password: 'password123',
      };

      const initialCount = service.getActiveSessionCount();
      await service.login(credentials);
      const finalCount = service.getActiveSessionCount();

      expect(finalCount).toBe(initialCount + 1);
    });
  });

  describe('logout', () => {
    it('should successfully logout an active session', async () => {
      const credentials: Credentials = {
        username: 'test@example.com',
        password: 'password123',
      };

      const sessionToken = await service.login(credentials);
      const beforeCount = service.getActiveSessionCount();

      await service.logout(sessionToken.token);
      const afterCount = service.getActiveSessionCount();

      expect(afterCount).toBe(beforeCount - 1);
    });

    it('should throw SessionNotFoundException for non-existent session', async () => {
      const fakeToken = 'MST_nonexistenttoken123456789';

      await expect(service.logout(fakeToken)).rejects.toThrow(
        SessionNotFoundException,
      );
    });

    it('should throw TokenInvalidException for empty token', async () => {
      await expect(service.logout('')).rejects.toThrow(TokenInvalidException);
    });

    it('should throw TokenInvalidException for null token', async () => {
      await expect(service.logout(null as any)).rejects.toThrow(
        TokenInvalidException,
      );
    });

    it('should throw SessionNotFoundException when logging out twice', async () => {
      const credentials: Credentials = {
        username: 'test@example.com',
        password: 'password123',
      };

      const sessionToken = await service.login(credentials);
      await service.logout(sessionToken.token);

      await expect(service.logout(sessionToken.token)).rejects.toThrow(
        SessionNotFoundException,
      );
    });
  });

  describe('validateToken', () => {
    it('should successfully validate an active token', async () => {
      const credentials: Credentials = {
        username: 'test@example.com',
        password: 'password123',
      };

      const sessionToken = await service.login(credentials);
      const userProfile = await service.validateToken(sessionToken.token);

      expect(userProfile).toBeDefined();
      expect(userProfile.username).toBe(credentials.username);
      expect(userProfile.userId).toBeDefined();
    });

    it('should throw TokenInvalidException for non-existent token', async () => {
      const fakeToken = 'MST_nonexistenttoken123456789';

      await expect(service.validateToken(fakeToken)).rejects.toThrow(
        TokenInvalidException,
      );
    });

    it('should throw TokenInvalidException for empty token', async () => {
      await expect(service.validateToken('')).rejects.toThrow(
        TokenInvalidException,
      );
    });

    it('should throw TokenInvalidException for malformed token', async () => {
      await expect(service.validateToken('invalid-format')).rejects.toThrow(
        TokenInvalidException,
      );
    });

    it('should throw TokenInvalidException for logged out token', async () => {
      const credentials: Credentials = {
        username: 'test@example.com',
        password: 'password123',
      };

      const sessionToken = await service.login(credentials);
      await service.logout(sessionToken.token);

      await expect(service.validateToken(sessionToken.token)).rejects.toThrow(
        TokenInvalidException,
      );
    });
  });

  describe('getIdentityContext', () => {
    it('should return user profile for valid token', async () => {
      const credentials: Credentials = {
        username: 'test@example.com',
        password: 'password123',
      };

      const sessionToken = await service.login(credentials);
      const userProfile = await service.getIdentityContext(sessionToken.token);

      expect(userProfile).toBeDefined();
      expect(userProfile.username).toBe(credentials.username);
    });

    it('should throw TokenInvalidException for invalid token', async () => {
      await expect(
        service.getIdentityContext('invalid-token'),
      ).rejects.toThrow(TokenInvalidException);
    });
  });

  describe('State Invariants', () => {
    it('should maintain consistency between activeSessions and tokenExpiryTimes', async () => {
      const credentials: Credentials = {
        username: 'test@example.com',
        password: 'password123',
      };

      const session1 = await service.login(credentials);
      const session2 = await service.login(credentials);

      expect(service.getActiveSessionCount()).toBe(2);

      await service.logout(session1.token);

      expect(service.getActiveSessionCount()).toBe(1);

      // Verify remaining session is still valid
      const profile = await service.validateToken(session2.token);
      expect(profile).toBeDefined();
    });

    it('should handle multiple concurrent sessions for same user', async () => {
      const credentials: Credentials = {
        username: 'test@example.com',
        password: 'password123',
      };

      const session1 = await service.login(credentials);
      const session2 = await service.login(credentials);
      const session3 = await service.login(credentials);

      // All sessions should be independent
      expect(session1.token).not.toBe(session2.token);
      expect(session2.token).not.toBe(session3.token);

      // All should validate independently
      await expect(service.validateToken(session1.token)).resolves.toBeDefined();
      await expect(service.validateToken(session2.token)).resolves.toBeDefined();
      await expect(service.validateToken(session3.token)).resolves.toBeDefined();

      // Logging out one should not affect others
      await service.logout(session2.token);

      await expect(service.validateToken(session1.token)).resolves.toBeDefined();
      await expect(service.validateToken(session2.token)).rejects.toThrow();
      await expect(service.validateToken(session3.token)).resolves.toBeDefined();
    });
  });

  describe('getSessionsForUser', () => {
    it('should return all sessions for a specific user', async () => {
      const credentials: Credentials = {
        username: 'test@example.com',
        password: 'password123',
      };

      const session1 = await service.login(credentials);
      const session2 = await service.login(credentials);

      const sessions = service.getSessionsForUser(session1.userProfile.userId);

      expect(sessions).toHaveLength(2);
      expect(sessions[0].userProfile.userId).toBe(session1.userProfile.userId);
      expect(sessions[1].userProfile.userId).toBe(session1.userProfile.userId);
    });

    it('should return empty array for user with no sessions', async () => {
      const sessions = service.getSessionsForUser('nonexistent-user-id');
      expect(sessions).toHaveLength(0);
    });
  });
});
