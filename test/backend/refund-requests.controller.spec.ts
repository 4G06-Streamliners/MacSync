/// <reference types="jest" />
import 'reflect-metadata';

jest.mock('../../src/backend/src/refund-requests/refund-requests.service', () => ({
  RefundRequestsService: jest.fn(),
}));
jest.mock('../../src/backend/src/auth/jwt-auth.guard', () => ({
  JwtAuthGuard: class {
    canActivate() {
      return true;
    }
  },
}));
jest.mock('../../src/backend/src/db/schema', () => ({}));

import { RefundRequestsController } from '../../src/backend/src/refund-requests/refund-requests.controller';

describe('RefundRequestsController', () => {
  let controller: RefundRequestsController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      createRefundRequest: jest.fn(),
      getAllRefundRequests: jest.fn(),
      getUserRefundRequests: jest.fn(),
      approveRefundRequest: jest.fn(),
      denyRefundRequest: jest.fn(),
    };
    controller = new RefundRequestsController(mockService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createRefundRequest', () => {
    it('creates refund request with user from JWT', async () => {
      const req = { user: { sub: 5 } } as any;
      const body = { ticketId: 10, reason: 'Event cancelled' };

      mockService.createRefundRequest.mockResolvedValue({
        success: true,
        requestId: 1,
      });

      const result = await controller.createRefundRequest(req, body);

      expect(result).toEqual({ success: true, requestId: 1 });
      expect(mockService.createRefundRequest).toHaveBeenCalledWith(
        5,
        10,
        'Event cancelled',
      );
    });

    it('handles optional reason', async () => {
      const req = { user: { sub: 5 } } as any;
      const body = { ticketId: 10 };

      mockService.createRefundRequest.mockResolvedValue({
        success: true,
        requestId: 2,
      });

      await controller.createRefundRequest(req, body);

      expect(mockService.createRefundRequest).toHaveBeenCalledWith(
        5,
        10,
        undefined,
      );
    });
  });

  describe('getAllRefundRequests', () => {
    it('returns all refund requests for admin', async () => {
      const req = { user: { sub: 1 } } as any;
      const requests = [
        { id: 1, status: 'pending' },
        { id: 2, status: 'approved' },
      ];

      mockService.getAllRefundRequests.mockResolvedValue(requests);

      const result = await controller.getAllRefundRequests(req);

      expect(result).toEqual(requests);
      expect(mockService.getAllRefundRequests).toHaveBeenCalledWith(1);
    });
  });

  describe('getUserRefundRequests', () => {
    it('returns user-specific refund requests', async () => {
      const req = { user: { sub: 5 } } as any;
      const requests = [{ id: 1, userId: 5, status: 'pending' }];

      mockService.getUserRefundRequests.mockResolvedValue(requests);

      const result = await controller.getUserRefundRequests(req);

      expect(result).toEqual(requests);
      expect(mockService.getUserRefundRequests).toHaveBeenCalledWith(5);
    });
  });

  describe('approveRefundRequest', () => {
    it('approves refund with admin user and response', async () => {
      const req = { user: { sub: 1 } } as any;
      const body = { adminResponse: 'Approved - event cancelled by organizer' };

      mockService.approveRefundRequest.mockResolvedValue({ success: true });

      const result = await controller.approveRefundRequest('10', req, body);

      expect(result).toEqual({ success: true });
      expect(mockService.approveRefundRequest).toHaveBeenCalledWith(
        10,
        1,
        'Approved - event cancelled by organizer',
      );
    });

    it('handles optional admin response', async () => {
      const req = { user: { sub: 1 } } as any;
      const body = {};

      mockService.approveRefundRequest.mockResolvedValue({ success: true });

      await controller.approveRefundRequest('10', req, body);

      expect(mockService.approveRefundRequest).toHaveBeenCalledWith(
        10,
        1,
        undefined,
      );
    });

    it('converts string id to number', async () => {
      const req = { user: { sub: 1 } } as any;
      const body = { adminResponse: 'OK' };

      mockService.approveRefundRequest.mockResolvedValue({ success: true });

      await controller.approveRefundRequest('123', req, body);

      expect(mockService.approveRefundRequest).toHaveBeenCalledWith(
        123,
        1,
        'OK',
      );
    });
  });

  describe('denyRefundRequest', () => {
    it('denies refund with admin reason', async () => {
      const req = { user: { sub: 1 } } as any;
      const body = { adminResponse: 'Event already occurred' };

      mockService.denyRefundRequest.mockResolvedValue({ success: true });

      const result = await controller.denyRefundRequest('10', req, body);

      expect(result).toEqual({ success: true });
      expect(mockService.denyRefundRequest).toHaveBeenCalledWith(
        10,
        1,
        'Event already occurred',
      );
    });

    it('handles optional admin response', async () => {
      const req = { user: { sub: 1 } } as any;
      const body = {};

      mockService.denyRefundRequest.mockResolvedValue({ success: true });

      await controller.denyRefundRequest('10', req, body);

      expect(mockService.denyRefundRequest).toHaveBeenCalledWith(
        10,
        1,
        undefined,
      );
    });
  });
});
