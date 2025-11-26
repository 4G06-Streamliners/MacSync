/**
 * Authentication Routes
 */

import type { FastifyInstance } from 'fastify'
import { findUserByEmail, generateToken } from '@large-event/api'
import { db, users } from '@large-event/database'
import { successResponse, errorResponse, unauthorizedResponse } from '../utils/response.js'
import { requireAuth } from '../middleware/auth.js'
import { getUserRoleNames } from '../services/roles.js'

export async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /auth/login
   * User login - creates user if doesn't exist (simplified auth for MVP)
   */
  fastify.post<{
    Body: { email: string; password?: string }
  }>('/auth/login', async (request, reply) => {
    const { email, password } = request.body

    if (!email) {
      return errorResponse(reply, 'Email is required', 400, 'VALIDATION_ERROR')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return errorResponse(reply, 'Invalid email format', 400, 'VALIDATION_ERROR')
    }

    try {
      // Find existing user - account must be pre-created
      const user = await findUserByEmail(email)

      if (!user) {
        return errorResponse(reply, 'Account not found. Please contact an administrator.', 404, 'USER_NOT_FOUND')
      }

      // Fetch user roles
      const roleNames = await getUserRoleNames(user.id)

      // Generate JWT token (user already has isSystemAdmin from database)
      const token = generateToken(user)

      // Set HTTP-only cookie (shared across main portal and team dashboards)
      reply.setCookie('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60, // 24 hours
        domain: process.env.NODE_ENV === 'production' ? '.large-event.com' : undefined
      })

      // Include roles in user object
      const userWithRoles = {
        ...user,
        roles: roleNames,
      }

      return successResponse(reply, {
        user: userWithRoles,
        token,
      })
    } catch (error) {
      fastify.log.error('Login error:', error)
      return errorResponse(reply, 'Login failed', 500, 'LOGIN_ERROR')
    }
  })

  /**
   * POST /auth/logout
   * Clear auth cookie
   */
  fastify.post('/auth/logout', async (request, reply) => {
    reply.clearCookie('auth-token', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: process.env.NODE_ENV === 'production' ? '.large-event.com' : undefined
    })
    return successResponse(reply, { message: 'Logged out successfully' })
  })

  /**
   * GET /auth/me
   * Get current authenticated user
   */
  fastify.get(
    '/auth/me',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user

      if (!user) {
        return unauthorizedResponse(reply)
      }

      // Fetch user roles
      const roleNames = await getUserRoleNames(user.id)

      // Include roles in user object
      const userWithRoles = {
        ...user,
        roles: roleNames,
      }

      return successResponse(reply, { user: userWithRoles })
    }
  )

  /**
   * GET /auth/token
   * Get current JWT token (for debugging/testing)
   */
  fastify.get(
    '/auth/token',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const token = request.cookies['auth-token'] || request.headers.authorization?.substring(7)

      return successResponse(reply, { token })
    }
  )
}
