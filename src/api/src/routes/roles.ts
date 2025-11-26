/**
 * Role Management Routes
 * Admin-only endpoints for managing user roles
 */

import type { FastifyInstance } from 'fastify'
import { db, users } from '@large-event/database'
import { eq } from 'drizzle-orm'
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} from '../utils/response.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import {
  getAllRoles,
  getUserRoles,
  getUserRoleNames,
  assignRoleToUser,
  revokeRoleFromUser,
  getRoleByName,
} from '../services/roles.js'

export async function roleRoutes(fastify: FastifyInstance) {
  /**
   * GET /roles
   * List all available roles (admin only)
   */
  fastify.get(
    '/roles',
    {
      preHandler: [requireAdmin],
    },
    async (request, reply) => {
      try {
        const allRoles = await getAllRoles()
        return successResponse(reply, { roles: allRoles, count: allRoles.length })
      } catch (error) {
        fastify.log.error('Error fetching roles:', error)
        return errorResponse(reply, 'Failed to fetch roles', 500)
      }
    }
  )

  /**
   * GET /users/:id/roles
   * Get roles for a specific user (admin only)
   */
  fastify.get<{
    Params: { id: string }
  }>(
    '/users/:id/roles',
    {
      preHandler: [requireAdmin],
    },
    async (request, reply) => {
      const userId = parseInt(request.params.id)

      if (isNaN(userId)) {
        return errorResponse(reply, 'Invalid user ID', 400, 'VALIDATION_ERROR')
      }

      try {
        // Verify user exists
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

        if (!user) {
          return notFoundResponse(reply, 'User not found')
        }

        const userRolesList = await getUserRoles(userId)
        const roleNames = userRolesList.map(ur => ur.role.name)

        return successResponse(reply, {
          userId,
          roles: userRolesList,
          roleNames,
        })
      } catch (error) {
        fastify.log.error('Error fetching user roles:', error)
        return errorResponse(reply, 'Failed to fetch user roles', 500)
      }
    }
  )

  /**
   * POST /users/:id/roles
   * Assign role to user (admin only)
   * Body: { roleName: string }
   */
  fastify.post<{
    Params: { id: string }
    Body: { roleName: string }
  }>(
    '/users/:id/roles',
    {
      preHandler: [requireAdmin],
    },
    async (request, reply) => {
      const userId = parseInt(request.params.id)
      const { roleName } = request.body

      if (isNaN(userId)) {
        return errorResponse(reply, 'Invalid user ID', 400, 'VALIDATION_ERROR')
      }

      if (!roleName || typeof roleName !== 'string') {
        return validationErrorResponse(reply, { roleName: 'Role name is required' })
      }

      try {
        // Verify user exists
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

        if (!user) {
          return notFoundResponse(reply, 'User not found')
        }

        // Verify role exists
        const role = await getRoleByName(roleName)
        if (!role) {
          return errorResponse(reply, `Role '${roleName}' not found`, 404, 'ROLE_NOT_FOUND')
        }

        // Get the admin user who is assigning the role
        const assignedBy = request.user?.id
        if (!assignedBy) {
          return errorResponse(reply, 'Admin user not found', 401)
        }

        // Assign the role
        const userRole = await assignRoleToUser(userId, roleName, assignedBy)

        return successResponse(reply, {
          message: `Role '${roleName}' assigned successfully`,
          userRole,
        })
      } catch (error) {
        fastify.log.error('Error assigning role:', error)
        if (error instanceof Error && error.message.includes('not found')) {
          return errorResponse(reply, error.message, 404, 'ROLE_NOT_FOUND')
        }
        return errorResponse(reply, 'Failed to assign role', 500)
      }
    }
  )

  /**
   * DELETE /users/:id/roles/:roleName
   * Revoke role from user (admin only)
   */
  fastify.delete<{
    Params: { id: string; roleName: string }
  }>(
    '/users/:id/roles/:roleName',
    {
      preHandler: [requireAdmin],
    },
    async (request, reply) => {
      const userId = parseInt(request.params.id)
      const { roleName } = request.params

      if (isNaN(userId)) {
        return errorResponse(reply, 'Invalid user ID', 400, 'VALIDATION_ERROR')
      }

      if (!roleName) {
        return errorResponse(reply, 'Role name is required', 400, 'VALIDATION_ERROR')
      }

      try {
        // Verify user exists
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

        if (!user) {
          return notFoundResponse(reply, 'User not found')
        }

        // Revoke the role
        const revoked = await revokeRoleFromUser(userId, roleName)

        if (!revoked) {
          return errorResponse(
            reply,
            `User does not have role '${roleName}'`,
            404,
            'ROLE_NOT_ASSIGNED'
          )
        }

        return successResponse(reply, {
          message: `Role '${roleName}' revoked successfully`,
        })
      } catch (error) {
        fastify.log.error('Error revoking role:', error)
        if (error instanceof Error && error.message.includes('not found')) {
          return errorResponse(reply, error.message, 404, 'ROLE_NOT_FOUND')
        }
        return errorResponse(reply, 'Failed to revoke role', 500)
      }
    }
  )

  /**
   * GET /users/me/roles
   * Get current user's roles (authenticated users)
   */
  fastify.get(
    '/users/me/roles',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const userId = request.user?.id

      if (!userId) {
        return errorResponse(reply, 'User not found', 404)
      }

      try {
        const userRolesList = await getUserRoles(userId)
        const roleNames = userRolesList.map(ur => ur.role.name)

        return successResponse(reply, {
          userId,
          roles: userRolesList,
          roleNames,
        })
      } catch (error) {
        fastify.log.error('Error fetching user roles:', error)
        return errorResponse(reply, 'Failed to fetch user roles', 500)
      }
    }
  )
}

