/**
 * Authentication Middleware
 * Handles JWT verification and user authentication
 */

import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyToken } from '@large-event/api'
import { unauthorizedResponse, forbiddenResponse } from '../utils/response.js'
import { userHasRole } from '../services/roles.js'

export interface AuthUser {
  id: number
  email: string
  name: string
  isSystemAdmin: boolean
  roles?: string[] // Role names for the user
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
  const user = decoded.user as AuthUser

  // Load user roles if not already loaded
  if (!user.roles) {
    const { getUserRoleNames } = await import('../services/roles.js')
    user.roles = await getUserRoleNames(user.id)
  }

  request.user = user
}

/**
 * Middleware: Require admin role
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  // First verify authentication (this will load roles)
  await requireAuth(request, reply)

  // Check if user has admin role (either isSystemAdmin or has 'admin' role)
  const user = request.user as AuthUser
  if (!user) {
    return unauthorizedResponse(reply, 'User not authenticated')
  }

  // Ensure roles are loaded
  if (!user.roles) {
    const { getUserRoleNames } = await import('../services/roles.js')
    user.roles = await getUserRoleNames(user.id)
  }

  const hasAdminRole = user.isSystemAdmin || user.roles.includes('admin')
  
  if (!hasAdminRole) {
    return reply.code(403).send({
      success: false,
      error: {
        message: 'Admin access required',
        code: 'FORBIDDEN',
      },
    })
  }
}

/**
 * Middleware factory: Require specific role
 * Usage: preHandler: [requireRole('admin')]
 */
export function requireRole(roleName: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // First verify authentication
    await requireAuth(request, reply)

    const user = request.user as AuthUser
    if (!user) {
      return unauthorizedResponse(reply, 'User not authenticated')
    }

    // Fetch roles if not already in user object
    if (!user.roles) {
      const { getUserRoleNames } = await import('../services/roles.js')
      user.roles = await getUserRoleNames(user.id)
    }

    // Check if user has the required role
    const hasRole = user.roles.includes(roleName)

    if (!hasRole) {
      return forbiddenResponse(reply, `Role '${roleName}' required`)
    }
  }
}

// Extend Fastify types to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser
  }
}
