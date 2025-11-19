/**
 * Standardized API Response Utilities
 */

import type { FastifyReply } from 'fastify'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
    details?: any
  }
}

export function successResponse<T>(reply: FastifyReply, data: T, statusCode = 200) {
  return reply.code(statusCode).send({
    success: true,
    data,
  } as ApiResponse<T>)
}

export function errorResponse(
  reply: FastifyReply,
  message: string,
  statusCode = 500,
  code?: string,
  details?: any
) {
  return reply.code(statusCode).send({
    success: false,
    error: {
      message,
      code,
      details,
    },
  } as ApiResponse)
}

export function unauthorizedResponse(reply: FastifyReply, message = 'Unauthorized') {
  return errorResponse(reply, message, 401, 'UNAUTHORIZED')
}

export function forbiddenResponse(reply: FastifyReply, message = 'Forbidden') {
  return errorResponse(reply, message, 403, 'FORBIDDEN')
}

export function notFoundResponse(reply: FastifyReply, message = 'Not found') {
  return errorResponse(reply, message, 404, 'NOT_FOUND')
}

export function validationErrorResponse(reply: FastifyReply, details: any) {
  return errorResponse(reply, 'Validation error', 400, 'VALIDATION_ERROR', details)
}
