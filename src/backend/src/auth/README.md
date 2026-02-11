/**
 * @file README.md
 * @brief Documentation for User Authorization Module (M8)
 */

# User Authorization Module (M8)

## Overview
The User Authorization Module (M8) is a library module that provides authentication and session management services for the MacSync application.

## Module Specification
- **Secrets**: Identity verification, session tokens
- **Services**: Authenticates users, issues and validates session tokens, provides identity context to M2
- **Implemented By**: Software Engineering
- **Type**: Library

## Architecture

### State Variables
- `activeSessions`: Map<string, SessionToken> - Dictionary managing all active user sessions
- `tokenExpiryTimes`: Map<string, Date> - Dictionary tracking token expiration timestamps

### Environment Variables
- `AUTH_TOKEN_EXPIRY_MIN`: Token expiration time in minutes (default: 60)
- `AUTH_REFRESH_TOKEN_EXPIRY_MIN`: Refresh token expiration time in minutes (default: 10080)
- `AUTH_SERVER_URL`: External authentication provider URL
- `MAX_ACTIVE_SESSIONS_PER_USER`: Maximum concurrent sessions per user (default: 5)

## Exported Access Programs

### login(credentials: Credentials): Promise<SessionToken>
Authenticates a user and issues a session token.

**Inputs:**
- `credentials.username`: string - User's username or email
- `credentials.password`: string - User's password
- `credentials.apiKey`: string (optional) - API key for service authentication

**Outputs:**
- `SessionToken` - Contains token string, user profile, issue time, and expiry time

**Exceptions:**
- `InvalidCredentialsException` - Username not found OR password incorrect
- `AuthProviderException` - External provider unreachable or returns error

**Pseudocode:**
1. Validate credentials format (non-empty username and password)
2. Call external authentication provider at AUTH_SERVER_URL
3. If provider returns error, throw InvalidCredentialsException
4. If provider unreachable, throw AuthProviderException
5. On success, extract UserProfile from provider response
6. Generate unique session token with TOKEN_PREFIX
7. Calculate expiry time: SystemTime + TOKEN_EXPIRY_MIN
8. Update activeSessions[token] = SessionToken object
9. Update tokenExpiryTimes[token] = expiry time
10. Return SessionToken to caller

---

### logout(token: string): Promise<void>
Invalidates a session token and removes it from active sessions.

**Inputs:**
- `token`: string - The session token to invalidate

**Outputs:**
- void

**Exceptions:**
- `SessionNotFoundException` - Token not found in activeSessions
- `TokenInvalidException` - Token format is malformed

**Pseudocode:**
1. Check if token exists in activeSessions
2. If not found, throw SessionNotFoundException
3. Remove token from activeSessions
4. Remove token from tokenExpiryTimes
5. Log successful logout

---

### validateToken(token: string): Promise<UserProfile>
Validates a session token and returns the associated user profile.

**Inputs:**
- `token`: string - The session token to validate

**Outputs:**
- `UserProfile` - User identity information

**Exceptions:**
- `TokenInvalidException` - Token does not exist, has expired, or is malformed

**Exception Trigger Conditions:**
- Token does not exist in activeSessions
- Current time > token expiry time
- Token format is invalid

**Pseudocode:**
1. Check if token exists in activeSessions
2. If not found, throw TokenInvalidException (reason: token does not exist)
3. Get expiry time from tokenExpiryTimes
4. Get current system time
5. If current time > expiry time, remove token and throw TokenInvalidException (reason: expired)
6. Extract UserProfile from SessionToken
7. Return UserProfile to caller

---

### getIdentityContext(token: string): Promise<UserProfile>
Provides identity context to other modules (especially M2). Semantic wrapper around validateToken.

**Inputs:**
- `token`: string - The session token

**Outputs:**
- `UserProfile` - User identity information

**Exceptions:**
- Same as `validateToken`

## Data Types

### Credentials
```typescript
interface Credentials {
  username: string;      // Unique identifier for the user
  password: string;      // User's password
  apiKey?: string;       // Optional API key for service auth
}
```

### UserProfile
```typescript
interface UserProfile {
  userId: string;        // Unique user identifier
  username: string;      // Username or email
  email: string;         // User's email address
  roles: string[];       // User roles (e.g., ['admin', 'user'])
  createdAt: Date;       // Account creation timestamp
}
```

### SessionToken
```typescript
interface SessionToken {
  token: string;         // Unique session token string
  userProfile: UserProfile;  // Associated user information
  issuedAt: Date;        // Token issue timestamp
  expiresAt: Date;       // Token expiration timestamp
}
```

## Exported Constants

- `TOKEN_EXPIRY_MIN`: Session token expiration time (configurable)
- `REFRESH_TOKEN_EXPIRY_MIN`: Refresh token expiration time (configurable)
- `AUTH_SERVER_URL`: External authentication provider URL
- `TOKEN_PREFIX`: Prefix for generated tokens ("MST_")
- `MAX_ACTIVE_SESSIONS_PER_USER`: Maximum concurrent sessions per user

## Usage Example

```typescript
import { AuthService, Credentials, SessionToken } from './auth';

// In your module
constructor(private readonly authService: AuthService) {}

async authenticateUser() {
  const credentials: Credentials = {
    username: 'user@example.com',
    password: 'password123'
  };

  try {
    // Login and get session token
    const session: SessionToken = await this.authService.login(credentials);
    console.log('Token:', session.token);
    console.log('User:', session.userProfile.username);

    // Validate token
    const userProfile = await this.authService.validateToken(session.token);
    console.log('Validated user:', userProfile.userId);

    // Logout
    await this.authService.logout(session.token);
  } catch (error) {
    console.error('Authentication error:', error.message);
  }
}
```

## Integration with Other Modules

To use M8 in another module:

1. Import `AuthModule` in your module:
```typescript
@Module({
  imports: [AuthModule],
  // ...
})
export class YourModule {}
```

2. Inject `AuthService`:
```typescript
constructor(private readonly authService: AuthService) {}
```

3. Use the exported access programs as documented above.

## State Invariants

1. Every token in `activeSessions` must have a corresponding entry in `tokenExpiryTimes`
2. No expired tokens should remain in `activeSessions` (enforced by periodic cleanup)
3. All tokens follow the format: `TOKEN_PREFIX + random_hex_string`

## Background Tasks

The module automatically runs a cleanup task every 5 minutes to remove expired tokens and maintain state invariants.

## External Dependencies

- External Authentication Provider at `AUTH_SERVER_URL` (configurable)
- Must implement standard authentication API (see provider documentation)

## Security Considerations

- Tokens are cryptographically secure random strings (32 bytes)
- Passwords are never stored in memory beyond authentication call
- Token validation checks both existence and expiration
- Failed authentication attempts are logged for security monitoring
- Tokens are masked in logs to prevent exposure

## Reflection Implementation Notes

This implementation addresses all concerns raised in the MIS reflection:

1. **Data Types**: All custom types (`Credentials`, `UserProfile`, `SessionToken`) have explicit field definitions
2. **Pseudocode**: Step-by-step semantic descriptions provided for all access programs
3. **Exception Conditions**: Specific trigger conditions documented for each exception
4. **State Variables**: Clear semantics for `activeSessions` and `tokenExpiryTimes`
5. **External Integration**: `AUTH_SERVER_URL` and provider interaction clearly defined
6. **SystemTime**: Clarified as system clock (`Date.now()`)
7. **Constants**: All magic numbers eliminated through exported constants
