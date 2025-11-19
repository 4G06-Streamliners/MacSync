/**
 * Health Check Routes
 */

import type { FastifyInstance } from 'fastify'
import { successResponse } from '../utils/response.js'

export async function healthRoutes(fastify: FastifyInstance) {
  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    return successResponse(reply, {
      status: 'ok',
      service: 'team-d-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  })

  // Detailed health check (for monitoring)
  fastify.get('/health/detailed', async (request, reply) => {
    return successResponse(reply, {
      status: 'ok',
      service: 'team-d-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    })
  })
}
