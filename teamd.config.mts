/**
 * Team D Configuration
 * Centralized configuration for all ports, URLs, and service addresses
 *
 * This file is the single source of truth for all network configuration.
 * Update ports and URLs here to apply changes across all services.
 */

export const TeamDConfig = {
  /**
   * API Service Configuration
   */
  api: {
    port: 3004,
    host: '0.0.0.0',
    url: {
      local: 'http://localhost:3004',
      docker: 'http://team-d-api:3004',
    },
  },

  /**
   * Web User Portal Configuration
   */
  webUser: {
    port: 3014,
    host: '0.0.0.0',
    url: {
      local: 'http://localhost:3014',
      docker: 'http://team-d-web-user:3014',
    },
  },

  /**
   * Web Admin Portal Configuration
   */
  webAdmin: {
    port: 3024,
    host: '0.0.0.0',
    url: {
      local: 'http://localhost:3024',
      docker: 'http://team-d-web-admin:3024',
    },
  },

  /**
   * Main Platform Integration URLs
   */
  platform: {
    userPortal: {
      local: 'http://localhost:4000',
      docker: 'http://web-user:4000',
    },
    adminPortal: {
      local: 'http://localhost:4001',
      docker: 'http://web-admin:4001',
    },
    gateway: {
      local: 'http://localhost',
      docker: 'http://gateway',
    },
  },

  /**
   * Other Team APIs (for inter-team communication)
   */
  teamAPIs: {
    teamA: {
      local: 'http://localhost:3001',
      docker: 'http://team-a-api:3001',
    },
    teamB: {
      local: 'http://localhost:3002',
      docker: 'http://team-b-api:3002',
    },
    teamC: {
      local: 'http://localhost:3003',
      docker: 'http://team-c-api:3003',
    },
  },

  /**
   * Infrastructure Services
   */
  infrastructure: {
    postgres: {
      port: 5432,
      host: 'localhost',
      url: 'postgresql://postgres:postgres@localhost:5432/large_event',
      dockerUrl: 'postgresql://user:password@postgres:5432/large_event_db',
    },
    redis: {
      port: 6379,
      host: 'localhost',
      url: 'redis://localhost:6379',
      dockerUrl: 'redis://redis:6379',
    },
  },

  /**
   * CORS Allowed Origins
   * All origins that should be able to make requests to the API
   */
  cors: {
    allowedOrigins: [
      'http://localhost:3014',  // web-user local
      'http://localhost:3024',  // web-admin local
      'http://localhost:4000',  // main user portal
      'http://localhost:4001',  // main admin portal
      'http://localhost',       // nginx gateway
      'http://localhost:80',    // nginx gateway explicit port
    ],
  },

  /**
   * JWT Configuration
   */
  jwt: {
    secret: (typeof process !== 'undefined' && process.env?.JWT_SECRET) || 'your-secret-key-change-in-production',
    expiresIn: '24h',
  },
} as const

/**
 * Helper function to get environment-specific URL
 */
export function getServiceUrl(
  service: keyof typeof TeamDConfig,
  env: 'local' | 'docker' = 'local'
): string {
  const serviceConfig = TeamDConfig[service]
  if ('url' in serviceConfig) {
    return serviceConfig.url[env]
  }
  throw new Error(`Service ${service} does not have URL configuration`)
}

/**
 * Helper to check if running in Docker
 */
export function isDocker(): boolean {
  if (typeof process === 'undefined') return false
  return process.env.DOCKER === 'true' || process.env.NODE_ENV === 'production'
}

/**
 * Get API URL based on environment
 */
export function getApiUrl(): string {
  return isDocker() ? TeamDConfig.api.url.docker : TeamDConfig.api.url.local
}

export default TeamDConfig
