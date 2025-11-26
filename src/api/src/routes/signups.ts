import type { FastifyInstance } from 'fastify';
import {
  CreateBusSignupRequest,
  CreateTableSignupRequest,
  CreateRsvpSignupRequest,
  UpdateSignupStatusRequest,
} from '@teamd/api-types';
import { requireAuth } from '../middleware/auth.js';
import { successResponse, errorResponse } from '../utils/response.js';
import {
  SignupServiceError,
  ensureInstanceAccess,
  listBusRoutes,
  listEventTables,
  createBusSignup,
  createTableSignup,
  createRsvpSignup,
  listSignupsForInstance,
  listUserSignups,
  updateSignupStatus,
  getSignupInstance,
} from '../services/signups.js';

export async function signupRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Params: { instanceId: string };
  }>(
    '/events/:instanceId/bus-routes',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const instanceId = parseInt(request.params.instanceId);
        if (isNaN(instanceId)) {
          return errorResponse(reply, 'Invalid instance id', 400);
        }

        await ensureInstanceAccess(request.user!.id, instanceId, 'user');
        const routes = await listBusRoutes(instanceId);
        return successResponse(reply, { routes });
      } catch (error) {
        const status = error instanceof SignupServiceError ? error.statusCode : 500;
        return errorResponse(reply, error.message ?? 'Failed to load routes', status);
      }
    }
  );

  fastify.get<{
    Params: { instanceId: string };
  }>(
    '/events/:instanceId/event-tables',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const instanceId = parseInt(request.params.instanceId);
        if (isNaN(instanceId)) {
          return errorResponse(reply, 'Invalid instance id', 400);
        }

        await ensureInstanceAccess(request.user!.id, instanceId, 'user');
        const tables = await listEventTables(instanceId);
        return successResponse(reply, { tables });
      } catch (error) {
        const status = error instanceof SignupServiceError ? error.statusCode : 500;
        return errorResponse(reply, error.message ?? 'Failed to load tables', status);
      }
    }
  );

  fastify.post<{
    Params: { instanceId: string };
    Body: CreateBusSignupRequest;
  }>(
    '/events/:instanceId/bus-signups',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const instanceId = parseInt(request.params.instanceId);
        if (isNaN(instanceId)) {
          return errorResponse(reply, 'Invalid instance id', 400);
        }

        await ensureInstanceAccess(request.user!.id, instanceId, 'user');
        const signup = await createBusSignup(request.user!.id, instanceId, request.body);
        return successResponse(reply, { signup });
      } catch (error) {
        const status = error instanceof SignupServiceError ? error.statusCode : 500;
        return errorResponse(reply, error.message ?? 'Failed to save signup', status);
      }
    }
  );

  fastify.post<{
    Params: { instanceId: string };
    Body: CreateTableSignupRequest;
  }>(
    '/events/:instanceId/table-signups',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const instanceId = parseInt(request.params.instanceId);
        if (isNaN(instanceId)) {
          return errorResponse(reply, 'Invalid instance id', 400);
        }

        await ensureInstanceAccess(request.user!.id, instanceId, 'user');
        const signup = await createTableSignup(request.user!.id, instanceId, request.body);
        return successResponse(reply, { signup });
      } catch (error) {
        const status = error instanceof SignupServiceError ? error.statusCode : 500;
        return errorResponse(reply, error.message ?? 'Failed to save signup', status);
      }
    }
  );

  fastify.post<{
    Params: { instanceId: string };
    Body: CreateRsvpSignupRequest;
  }>(
    '/events/:instanceId/rsvps',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const instanceId = parseInt(request.params.instanceId);
        if (isNaN(instanceId)) {
          return errorResponse(reply, 'Invalid instance id', 400);
        }

        await ensureInstanceAccess(request.user!.id, instanceId, 'user');
        const signup = await createRsvpSignup(request.user!.id, instanceId, request.body);
        return successResponse(reply, { signup });
      } catch (error) {
        const status = error instanceof SignupServiceError ? error.statusCode : 500;
        return errorResponse(reply, error.message ?? 'Failed to save signup', status);
      }
    }
  );

  fastify.get<{
    Params: { instanceId: string };
  }>(
    '/events/:instanceId/signups',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const instanceId = parseInt(request.params.instanceId);
        if (isNaN(instanceId)) {
          return errorResponse(reply, 'Invalid instance id', 400);
        }

        await ensureInstanceAccess(request.user!.id, instanceId, 'admin');
        const summary = await listSignupsForInstance(instanceId);
        return successResponse(reply, summary);
      } catch (error) {
        const status = error instanceof SignupServiceError ? error.statusCode : 500;
        return errorResponse(reply, error.message ?? 'Failed to load signups', status);
      }
    }
  );

  fastify.get<{
    Querystring: { instanceId?: string };
  }>(
    '/users/me/signups',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const instanceIdParam = request.query.instanceId;
        const instanceId = instanceIdParam ? parseInt(instanceIdParam) : undefined;

        if (instanceIdParam && isNaN(instanceId!)) {
          return errorResponse(reply, 'Invalid instance id', 400);
        }

        const summary = await listUserSignups(request.user!.id, instanceId);
        return successResponse(reply, summary);
      } catch (error) {
        const status = error instanceof SignupServiceError ? error.statusCode : 500;
        return errorResponse(reply, error.message ?? 'Failed to load signups', status);
      }
    }
  );

  fastify.patch<{
    Params: { signupId: string };
    Body: UpdateSignupStatusRequest;
  }>(
    '/signups/:signupId/status',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const signupId = parseInt(request.params.signupId);
        if (isNaN(signupId)) {
          return errorResponse(reply, 'Invalid signup id', 400);
        }

        const instanceId = await getSignupInstance(signupId, request.body.type);
        await ensureInstanceAccess(request.user!.id, instanceId, 'admin');
        await updateSignupStatus(signupId, request.body);
        return successResponse(reply, { signupId });
      } catch (error) {
        const status = error instanceof SignupServiceError ? error.statusCode : 500;
        return errorResponse(reply, error.message ?? 'Failed to update signup', status);
      }
    }
  );
}

