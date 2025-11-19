/**
 * User Management Routes
 * Admin-only endpoints for managing users
 */

import type { FastifyInstance } from 'fastify'
import { db, users } from '@large-event/database'
import { eq } from 'drizzle-orm'
import { successResponse, errorResponse, notFoundResponse } from '../utils/response.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'

export async function userRoutes(fastify: FastifyInstance) {
  /**
   * GET /users
   * List all users (admin only)
   */
  fastify.get(
    '/users',
    {
      preHandler: [requireAdmin],
    },
    async (request, reply) => {
      try {
        const allUsers = await db.select().from(users)
        return successResponse(reply, { users: allUsers, count: allUsers.length })
      } catch (error) {
        fastify.log.error('Error fetching users:', error)
        return errorResponse(reply, 'Failed to fetch users', 500)
      }
    }
  )

  /**
   * GET /users/:id
   * Get specific user (admin only)
   */
  fastify.get<{
    Params: { id: string }
  }>(
    '/users/:id',
    {
      preHandler: [requireAdmin],
    },
    async (request, reply) => {
      const userId = parseInt(request.params.id)

      if (isNaN(userId)) {
        return errorResponse(reply, 'Invalid user ID', 400, 'VALIDATION_ERROR')
      }

      try {
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

        if (!user) {
          return notFoundResponse(reply, 'User not found')
        }

        return successResponse(reply, { user })
      } catch (error) {
        fastify.log.error('Error fetching user:', error)
        return errorResponse(reply, 'Failed to fetch user', 500)
      }
    }
  )

  /**
   * GET /users/me/profile
   * Get own profile (authenticated users)
   */
  fastify.get(
    '/users/me/profile',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const userId = request.user?.id

      if (!userId) {
        return errorResponse(reply, 'User not found', 404)
      }

      try {
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

        if (!user) {
          return notFoundResponse(reply, 'Profile not found')
        }

        return successResponse(reply, { profile: user })
      } catch (error) {
        fastify.log.error('Error fetching profile:', error)
        return errorResponse(reply, 'Failed to fetch profile', 500)
      }
    }
  )

  /**
   * DELETE /users/:id
   * Delete user (admin only)
   */
  fastify.delete<{
    Params: { id: string }
  }>(
    '/users/:id',
    {
      preHandler: [requireAdmin],
    },
    async (request, reply) => {
      const userId = parseInt(request.params.id)

      if (isNaN(userId)) {
        return errorResponse(reply, 'Invalid user ID', 400, 'VALIDATION_ERROR')
      }

      try {
        const deleted = await db.delete(users).where(eq(users.id, userId)).returning()

        if (deleted.length === 0) {
          return notFoundResponse(reply, 'User not found')
        }

        return successResponse(reply, { message: 'User deleted successfully', user: deleted[0] })
      } catch (error) {
        fastify.log.error('Error deleting user:', error)
        return errorResponse(reply, 'Failed to delete user', 500)
      }
    }
  )
}
