/**
 * Authentication Routes
 */

import type { FastifyInstance } from 'fastify'
import { generateToken } from '@large-event/api'
import { successResponse, errorResponse, unauthorizedResponse } from '../utils/response.js'
import { requireAuth } from '../middleware/auth.js'


import { db, schema } from '@teamd/database'
import { eq } from 'drizzle-orm'

export async function authRoutes(fastify: FastifyInstance) {

  // ======================
  // POST /auth/login
  // ======================
  fastify.post('/auth/login', async (request, reply) => {
    const { email } = request.body

    console.log("/auth/login called with:", email)

    if (!email) {
      return errorResponse(reply, 'Email is required', 400, 'VALIDATION_ERROR')
    }

    try {
      console.log("Querying TeamD.users...")


      const user = await db.query.users.findFirst({
        where: eq(schema.users.email, email)
      })

      console.log("Query result:", user)

      if (!user) {
        console.log("No user found for:", email)
        return errorResponse(reply, 'Account not found. Please contact an administrator.', 404, 'USER_NOT_FOUND')
      }

      console.log("Generating token for:", user.email)
      const token = generateToken(user)

      reply.setCookie('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60,
      })

      console.log("Login success for:", user.email)
      return successResponse(reply, { user, token })

    } catch (error) {
      console.log(" ERROR inside login:", error)
      return errorResponse(reply, 'Login failed', 500, 'LOGIN_ERROR')
    }
  })


  // ======================
  // POST /auth/logout
  // ======================
  fastify.post('/auth/logout', async (request, reply) => {
    reply.clearCookie('auth-token', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })

    return successResponse(reply, { message: 'Logged out successfully' })
  })


  // ======================
  // GET /auth/me
  // ======================
  fastify.get('/auth/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user
    if (!user) return unauthorizedResponse(reply)
    return successResponse(reply, { user })
  })


  // ======================
  // GET /auth/token
  // ======================
  fastify.get('/auth/token', { preHandler: [requireAuth] }, async (request, reply) => {
    const token = request.cookies['auth-token']
      || request.headers.authorization?.substring(7)

    return successResponse(reply, { token })
  })
}
