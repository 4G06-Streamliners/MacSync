/**
 * Authentication Middleware
 * Handles JWT verification and user authentication
 */

import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyToken } from '@large-event/api'
import { unauthorizedResponse } from '../utils/response.js'

export interface AuthUser {
  id: number
  email: string
  name: string
  isSystemAdmin: boolean
}

/**
 * Get token from request (cookie or Authorization header)
 */
export function getToken(request: FastifyRequest): string | null {
  // Try cookie first
  const cookieToken = request.cookies['auth-token']
  if (cookieToken) return cookieToken

  // Try Authorization header
  const authHeader = request.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  return null
}

/**
 * Middleware: Require authenticated user
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = getToken(request)

  if (!token) {
    return unauthorizedResponse(reply, 'Authentication required')
  }

  const decoded = verifyToken(token)

  if (!decoded) {
    return unauthorizedResponse(reply, 'Invalid or expired token')
  }

  // Attach user to request
  request.user = decoded.user as AuthUser
}

/**
 * Middleware: Require admin role
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  // First verify authentication
  await requireAuth(request, reply)

  // Check if user has admin role
  const user = request.user as AuthUser
  if (!user.isSystemAdmin) {
    return reply.code(403).send({
      success: false,
      error: {
        message: 'Admin access required',
        code: 'FORBIDDEN',
      },
    })
  }
}

// Extend Fastify types to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser
  }
}
