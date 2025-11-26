/**
 * Team D Consolidated API Server
 * Serves web-user, web-admin, and future mobile applications
 */

import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import TeamDConfig from '../../../teamd.config.mjs'

// Import routes
import { authRoutes } from './routes/auth.js'
import { healthRoutes } from './routes/health.js'
import { userRoutes } from './routes/users.js'
import { instanceRoutes } from './routes/instances.js'
import { signupRoutes } from './routes/signups.js'

// Configuration from centralized config
const PORT = parseInt(process.env.PORT || String(TeamDConfig.api.port))
const HOST = process.env.HOST || TeamDConfig.api.host
const JWT_SECRET = process.env.JWT_SECRET || TeamDConfig.jwt.secret

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
})

// Register plugins
await fastify.register(cors, {
  origin: [...TeamDConfig.cors.allowedOrigins],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})
await fastify.register(cookie, {
  secret: JWT_SECRET,
  parseOptions: {},
})

// Register routes
await fastify.register(healthRoutes, { prefix: '/api' })
await fastify.register(authRoutes, { prefix: '/api' })
await fastify.register(userRoutes, { prefix: '/api' })
await fastify.register(instanceRoutes, { prefix: '/api' })
await fastify.register(signupRoutes, { prefix: '/api' })

// Root endpoint
fastify.get('/', async (request, reply) => {
  return {
    service: 'Team D API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      users: '/api/users/*',
      instances: '/api/instances/*',
    },
  }
})

// Global error handler
fastify.setErrorHandler((error: any, request, reply) => {
  fastify.log.error(error)
  const statusCode = error.statusCode || 500
  const errorCode = error.code || 'INTERNAL_ERROR'
  const message = error.message || 'Internal server error'

  reply.status(statusCode).send({
    success: false,
    error: {
      message,
      code: errorCode,
    },
  })
})

// Start server
try {
  await fastify.listen({ port: PORT, host: HOST })
  fastify.log.info(`🚀 Team D API server running on http://${HOST}:${PORT}`)
  fastify.log.info(`📝 Health check: http://${HOST}:${PORT}/api/health`)
  fastify.log.info(`🔐 Auth endpoint: http://${HOST}:${PORT}/api/auth/login`)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM']
signals.forEach((signal) => {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, closing server...`)
    await fastify.close()
    process.exit(0)
  })
})
