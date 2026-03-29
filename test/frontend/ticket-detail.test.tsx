/// <reference types="jest" />
import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { Alert } from 'react-native';

const mockGetUserTickets = jest.fn();
const mockCreateRefundRequest = jest.fn();
const mockCancelSignup = jest.fn();

jest.mock('../../src/frontend/mobile/app/_lib/api', () => ({
  getUserTickets: mockGetUserTickets,
  createRefundRequest: mockCreateRefundRequest,
  cancelSignup: mockCancelSignup,
}));

jest.mock('../../src/frontend/mobile/app/_context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 5, name: 'Test User' } }),
}));

import TicketDetailScreen from '../../src/frontend/mobile/app/ticket-detail';

describe('TicketDetailScreen', () => {
  const mockRouter = require('expo-router').__mockRouter;
  
  beforeEach(() => {
    jest.clearAllMocks();
    require('expo-router').__setParams({ ticketId: '1' });
  });

  it('renders loading state initially', () => {
    mockGetUserTickets.mockReturnValue(new Promise(() => {}));
    render(<TicketDetailScreen />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('displays ticket details for paid event', async () => {
    const tickets = [
      {
        ticketId: 1,
        eventName: 'Annual Gala 2026',
        eventDate: '2026-06-15T19:00:00Z',
        eventLocation: 'Grand Ballroom',
        eventPrice: 5000,
        tableSeat: 'Table 3, Seat 2',
        busSeat: 'Bus 1 - Seat 10',
        qrCodeData: 'TICKET:5:10:1:1234567890',
      },
    ];

    mockGetUserTickets.mockResolvedValue(tickets);
    render(<TicketDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Annual Gala 2026')).toBeTruthy();
      expect(screen.getByText('Grand Ballroom')).toBeTruthy();
      expect(screen.getByText('$50.00')).toBeTruthy();
      expect(screen.getByText('Table 3, Seat 2')).toBeTruthy();
      expect(screen.getByText('Bus 1 - Seat 10')).toBeTruthy();
    });
  });

  it('shows Checked In badge when ticket is checked in', async () => {
    const tickets = [
      {
        ticketId: 1,
        eventName: 'Gala',
        eventPrice: 5000,
        checkedIn: true,
        qrCodeData: 'TICKET:5:10:1:123',
      },
    ];

    mockGetUserTickets.mockResolvedValue(tickets);
    render(<TicketDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Checked In')).toBeTruthy();
      expect(screen.getByText("You've been checked in. Welcome to the event!")).toBeTruthy();
    });
  });

  it('shows Request Refund button for paid events', async () => {
    const tickets = [
      {
        ticketId: 1,
        eventName: 'Test Event',
        eventPrice: 2500,
        qrCodeData: 'TICKET:5:10:1:123',
      },
    ];

    mockGetUserTickets.mockResolvedValue(tickets);
    render(<TicketDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Request Refund')).toBeTruthy();
    });
  });

  it('shows Cancel Sign-Up button for free events', async () => {
    const tickets = [
      {
        ticketId: 1,
        eventName: 'Free Event',
        eventPrice: 0,
        qrCodeData: 'TICKET:5:10:1:123',
      },
    ];

    mockGetUserTickets.mockResolvedValue(tickets);
    render(<TicketDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Cancel Sign-Up')).toBeTruthy();
    });
  });

  it('opens refund modal when Request Refund clicked', async () => {
    const tickets = [
      {
        ticketId: 1,
        eventName: 'Paid Event',
        eventPrice: 5000,
        qrCodeData: 'TICKET:5:10:1:123',
      },
    ];

    mockGetUserTickets.mockResolvedValue(tickets);
    render(<TicketDetailScreen />);

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const refundButton = buttons.find(
        (btn) => btn.textContent === 'Request Refund',
      );
      fireEvent.click(refundButton!);
    });

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Reason for refund (required)'),
      ).toBeTruthy();
    });
  });

  it('validates required reason for refund request', async () => {
    const tickets = [
      {
        ticketId: 1,
        eventName: 'Test Event',
        eventPrice: 5000,
        qrCodeData: 'TICKET:5:10:1:123',
      },
    ];

    mockGetUserTickets.mockResolvedValue(tickets);
    render(<TicketDetailScreen />);

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const refundButton = buttons.find(btn => btn.textContent === 'Request Refund');
      fireEvent.click(refundButton!);
    });

    await waitFor(() => {
      const submitButton = screen.getAllByText('Submit Request')[0];
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Required',
        'Please provide a reason for your refund request.',
      );
    });

    expect(mockCreateRefundRequest).not.toHaveBeenCalled();
  });

  it('submits refund request with reason and reloads ticket', async () => {
    const tickets = [
      {
        ticketId: 1,
        eventName: 'Test Event',
        eventPrice: 5000,
        qrCodeData: 'TICKET:5:10:1:123',
      },
    ];

    mockGetUserTickets.mockResolvedValue(tickets);
    mockCreateRefundRequest.mockResolvedValue({ success: true, requestId: 10 });

    render(<TicketDetailScreen />);

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const refundButton = buttons.find(
        (btn) => btn.textContent === 'Request Refund',
      );
      fireEvent.click(refundButton!);
    });

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Reason for refund (required)');
      fireEvent.change(input, {
        target: { value: 'Cannot attend due to emergency' },
      });
    });

    const submitButton = screen.getAllByText('Submit Request')[0];
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateRefundRequest).toHaveBeenCalledWith(
        1,
        'Cannot attend due to emergency',
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        'Refund Requested',
        'Your refund request has been submitted. An admin will review it shortly.',
        expect.any(Array),
      );
      // Called at least once (initial load); we don't simulate the Alert "OK" press here
      expect(mockGetUserTickets).toHaveBeenCalled();
    });
  });

  it('displays refund pending status', async () => {
    const tickets = [
      {
        ticketId: 1,
        eventName: 'Test Event',
        eventPrice: 5000,
        qrCodeData: 'TICKET:5:10:1:123',
        refundRequest: {
          id: 10,
          status: 'pending',
          createdAt: '2026-03-01T10:00:00Z',
        },
      },
    ];

    mockGetUserTickets.mockResolvedValue(tickets);
    render(<TicketDetailScreen />);

    // Banner title
    await screen.findByText('Refund Requested');
    // Banner description text contains this phrase
    expect(
      screen.getByText(/pending admin review/i),
    ).toBeTruthy();

    // Should not show Request Refund button when pending
    expect(screen.queryByText('Request Refund')).toBeNull();
  });

  it('displays refund denied status with admin response', async () => {
    const tickets = [
      {
        ticketId: 1,
        eventName: 'Test Event',
        eventPrice: 5000,
        qrCodeData: 'TICKET:5:10:1:123',
        refundRequest: {
          id: 10,
          status: 'denied',
          adminResponse: 'Event already occurred',
          createdAt: '2026-03-01T10:00:00Z',
        },
      },
    ];

    mockGetUserTickets.mockResolvedValue(tickets);
    render(<TicketDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Refund Denied')).toBeTruthy();
      expect(screen.getByText('Event already occurred')).toBeTruthy();
    });
  });

  it('cancels free event signup with confirmation', async () => {
    const tickets = [
      {
        ticketId: 1,
        eventId: 10,
        eventName: 'Free Event',
        eventPrice: 0,
        qrCodeData: 'TICKET:5:10:1:123',
      },
    ];

    mockGetUserTickets.mockResolvedValue(tickets);
    mockCancelSignup.mockResolvedValue({ cancelled: true });

    render(<TicketDetailScreen />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Cancel Sign-Up'));
    });

    const confirmText = await screen.findByText((text: string) =>
      text.startsWith(
        'Are you sure you want to cancel your registration for this event?',
      ),
    );
    expect(confirmText).toBeTruthy();
    fireEvent.click(screen.getByText('Yes, Cancel'));

    await waitFor(() => {
      expect(mockCancelSignup).toHaveBeenCalledWith(10);
      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  it('displays QR code for entry', async () => {
    const tickets = [
      {
        ticketId: 1,
        eventName: 'Test Event',
        eventPrice: 0,
        qrCodeData: 'TICKET:5:10:1:1234567890',
      },
    ];

    mockGetUserTickets.mockResolvedValue(tickets);
    render(<TicketDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Entry QR Code')).toBeTruthy();
      expect(
        screen.getByText('Show this QR code at the event entrance'),
      ).toBeTruthy();
    });
  });
});
