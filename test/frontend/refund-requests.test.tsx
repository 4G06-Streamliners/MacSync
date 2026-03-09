import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

// Mocks already handled by jest.config moduleNameMapper
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

const mockGetAllRefundRequests = jest.fn();
const mockApproveRefundRequest = jest.fn();
const mockDenyRefundRequest = jest.fn();

jest.mock('../../src/frontend/mobile/app/_lib/api', () => ({
  getAllRefundRequests: mockGetAllRefundRequests,
  approveRefundRequest: mockApproveRefundRequest,
  denyRefundRequest: mockDenyRefundRequest,
}));

jest.mock('../../src/frontend/mobile/app/_context/AuthContext', () => ({
  useAuth: jest.fn(() => ({ isAdmin: true })),
}));

import RefundRequestsScreen from '../../src/frontend/mobile/app/refund-requests';
import { Alert } from 'react-native';

describe('RefundRequestsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReplace.mockClear();
  });

  it('renders loading state initially', () => {
    mockGetAllRefundRequests.mockReturnValue(new Promise(() => {})); // Never resolves
    render(<RefundRequestsScreen />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('displays pending refund requests', async () => {
    const requests = [
      {
        id: 1,
        eventName: 'Annual Gala 2026',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        reason: 'Cannot attend',
        status: 'pending',
        createdAt: '2026-03-01T10:00:00Z',
      },
    ];

    mockGetAllRefundRequests.mockResolvedValue(requests);
    render(<RefundRequestsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Annual Gala 2026')).toBeTruthy();
      expect(screen.getByText('John Doe • john@example.com')).toBeTruthy();
      expect(screen.getByText('Cannot attend')).toBeTruthy();
      expect(screen.getByText('PENDING')).toBeTruthy();
    });
  });

  it('displays "All caught up" when no pending requests', async () => {
    mockGetAllRefundRequests.mockResolvedValue([]);
    render(<RefundRequestsScreen />);

    await waitFor(() => {
      expect(screen.getByText('All caught up!')).toBeTruthy();
      expect(
        screen.getByText('No pending refund requests at the moment'),
      ).toBeTruthy();
    });
  });

  it('opens approve modal when approve button clicked', async () => {
    const requests = [
      {
        id: 1,
        eventName: 'Test Event',
        userName: 'Test User',
        status: 'pending',
        createdAt: '2026-03-01T10:00:00Z',
      },
    ];

    mockGetAllRefundRequests.mockResolvedValue(requests);
    render(<RefundRequestsScreen />);

    await waitFor(() => {
      expect(screen.getByText('✓ Approve')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('✓ Approve'));

    await waitFor(() => {
      expect(screen.getByText('Approve Refund')).toBeTruthy();
      expect(screen.getByText('Message to User')).toBeTruthy();
    });
  });

  it('validates required message for approve', async () => {
    const requests = [
      {
        id: 1,
        eventName: 'Test Event',
        userName: 'Test User',
        status: 'pending',
        createdAt: '2026-03-01T10:00:00Z',
      },
    ];

    mockGetAllRefundRequests.mockResolvedValue(requests);
    render(<RefundRequestsScreen />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('✓ Approve'));
    });

    await waitFor(() => {
      expect(screen.getByText('Approve Refund')).toBeTruthy(); // Modal header
    });

    const approveButtons = screen.getAllByRole('button');
    const submitButton = approveButtons.find(btn => 
      btn.textContent === 'Approve' // Exact match, not "✓ Approve"
    );
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Required',
        expect.stringContaining('confirmation message'),
      );
    });

    expect(mockApproveRefundRequest).not.toHaveBeenCalled();
  });

  it('validates required message for deny', async () => {
    const requests = [
      {
        id: 1,
        eventName: 'Test Event',
        userName: 'Test User',
        status: 'pending',
        createdAt: '2026-03-01T10:00:00Z',
      },
    ];

    mockGetAllRefundRequests.mockResolvedValue(requests);
    render(<RefundRequestsScreen />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('✗ Deny'));
    });

    await waitFor(() => {
      expect(screen.getByText('Deny Refund')).toBeTruthy(); // Modal header
    });

    const denyButtons = screen.getAllByRole('button');
    const submitButton = denyButtons.find(btn => 
      btn.textContent === 'Deny' // Exact match, not "✗ Deny"
    );
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Required',
        expect.stringContaining('reason'),
      );
    });

    expect(mockDenyRefundRequest).not.toHaveBeenCalled();
  });

  it('approves refund with message and reloads data', async () => {
    const requests = [
      {
        id: 1,
        eventName: 'Test Event',
        userName: 'Test User',
        status: 'pending',
        createdAt: '2026-03-01T10:00:00Z',
      },
    ];

    mockGetAllRefundRequests.mockResolvedValue(requests); // Will return requests for all calls
    mockApproveRefundRequest.mockResolvedValue({ success: true });
    
    render(<RefundRequestsScreen />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('✓ Approve'));
    });

    await waitFor(() => {
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Refund approved' } });
    });

    const approveButtons = screen.getAllByRole('button');
    const submitApproveButton = approveButtons.find(btn => btn.textContent?.includes('Approve') && !btn.textContent?.includes('✓'));
    fireEvent.click(submitApproveButton!);

    await waitFor(() => {
      expect(mockApproveRefundRequest).toHaveBeenCalledWith(
        1,
        'Refund approved',
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Refund request approved successfully',
      );
      expect(mockGetAllRefundRequests).toHaveBeenCalled(); // Called at least once
    });
  });

  it('denies refund with reason and reloads data', async () => {
    const requests = [
      {
        id: 1,
        eventName: 'Test Event',
        userName: 'Test User',
        status: 'pending',
        createdAt: '2026-03-01T10:00:00Z',
      },
    ];

    mockGetAllRefundRequests.mockResolvedValue(requests); // Will return requests for all calls
    mockDenyRefundRequest.mockResolvedValue({ success: true });

    render(<RefundRequestsScreen />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('✗ Deny'));
    });

    await waitFor(() => {
      const input = screen.getByRole('textbox');
      fireEvent.change(input, {
        target: { value: 'Event already occurred' },
      });
    });

    const denyButtons = screen.getAllByRole('button');
    const submitDenyButton = denyButtons.find(btn => btn.textContent?.includes('Deny') && !btn.textContent?.includes('✗'));
    fireEvent.click(submitDenyButton!);

    await waitFor(() => {
      expect(mockDenyRefundRequest).toHaveBeenCalledWith(
        1,
        'Event already occurred',
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Refund request denied successfully',
      );
    });
  });

  it('displays processed refunds separately', async () => {
    const requests = [
      {
        id: 1,
        eventName: 'Pending Event',
        userName: 'User 1',
        status: 'pending',
        createdAt: '2026-03-01T10:00:00Z',
      },
      {
        id: 2,
        eventName: 'Approved Event',
        userName: 'User 2',
        status: 'approved',
        adminResponse: 'Refund processed',
        processedAt: '2026-03-02T10:00:00Z',
      },
      {
        id: 3,
        eventName: 'Denied Event',
        userName: 'User 3',
        status: 'denied',
        adminResponse: 'Too late',
        processedAt: '2026-03-03T10:00:00Z',
      },
    ];

    mockGetAllRefundRequests.mockResolvedValue(requests);
    render(<RefundRequestsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Pending (1)')).toBeTruthy();
      expect(screen.getByText('Recently Processed')).toBeTruthy();
      expect(screen.getByText('Approved Event')).toBeTruthy();
      expect(screen.getByText('Denied Event')).toBeTruthy();
      expect(screen.getByText('APPROVED')).toBeTruthy();
      expect(screen.getByText('DENIED')).toBeTruthy();
    });
  });

  it('handles API errors gracefully', async () => {
    mockGetAllRefundRequests.mockRejectedValue(
      new Error('Network error'),
    );
    render(<RefundRequestsScreen />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to load refund requests',
      );
    });
  });

  it('redirects non-admin users to home', () => {
    const { useAuth } = require('../../src/frontend/mobile/app/_context/AuthContext');
    (useAuth as jest.Mock).mockReturnValueOnce({ isAdmin: false });

    render(<RefundRequestsScreen />);

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });
});
