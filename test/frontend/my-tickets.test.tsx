import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

const mockGetUserTickets = jest.fn();
const mockCancelSignup = jest.fn();

jest.mock('../../src/frontend/mobile/app/_lib/api', () => ({
  getUserTickets: (...args: any[]) => mockGetUserTickets(...args),
  cancelSignup: (...args: any[]) => mockCancelSignup(...args),
}));

const mockUseAuth = jest.fn();
jest.mock('../../src/frontend/mobile/app/_context/AuthContext', () => ({
  useAuth: (...args: any[]) => mockUseAuth(...args),
}));

import MyTickets from '../../src/frontend/mobile/app/(tabs)/my-tickets';

const makeTicket = (overrides: Record<string, any> = {}) => ({
  ticketId: 1,
  eventId: 10,
  checkedIn: false,
  busSeat: null,
  tableSeat: null,
  qrCodeData: 'qr-data',
  createdAt: '2026-01-15T00:00:00Z',
  eventName: 'Fireball Formal',
  eventDate: '2027-06-15T18:00:00.000Z',
  eventLocation: 'Hamilton Convention Centre',
  eventPrice: 0,
  eventImageUrl: null,
  ...overrides,
});

describe('MyTickets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'test@mcmaster.ca', name: 'Test User' },
      isAdmin: false,
      status: 'authenticated',
    });
    mockGetUserTickets.mockResolvedValue([]);
  });

  it('renders ticket list with event name, date, location, and price', async () => {
    mockGetUserTickets.mockResolvedValue([makeTicket()]);
    render(<MyTickets />);
    await waitFor(() => {
      expect(screen.getByText('Fireball Formal')).toBeTruthy();
      expect(screen.getByText('Hamilton Convention Centre')).toBeTruthy();
      expect(screen.getByText('Free Event')).toBeTruthy();
    });
  });

  it('shows Cancel for free tickets and Request Refund for paid tickets', async () => {
    mockGetUserTickets.mockResolvedValue([
      makeTicket({ ticketId: 1, eventId: 10, eventPrice: 0 }),
      makeTicket({ ticketId: 2, eventId: 20, eventPrice: 2500, eventName: 'Paid Gala' }),
    ]);
    render(<MyTickets />);
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeTruthy();
      expect(screen.getByText('Request Refund')).toBeTruthy();
    });
  });

  it('opens cancel confirmation modal and dismisses on No', async () => {
    mockGetUserTickets.mockResolvedValue([makeTicket()]);
    render(<MyTickets />);
    await waitFor(() => fireEvent.click(screen.getByText('Cancel')));

    await waitFor(() => {
      expect(screen.getByText('Cancel Ticket')).toBeTruthy();
      expect(screen.getByText('Are you sure you want to cancel this ticket?')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('No'));
    await waitFor(() => expect(screen.queryByText('Cancel Ticket')).toBeNull());
    expect(mockCancelSignup).not.toHaveBeenCalled();
  });

  it('calls cancelSignup API and removes ticket from list on confirm', async () => {
    mockGetUserTickets.mockResolvedValue([makeTicket()]);
    mockCancelSignup.mockResolvedValue({ cancelled: true });
    render(<MyTickets />);

    await waitFor(() => expect(screen.getByText('Fireball Formal')).toBeTruthy());
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => expect(screen.getByText('Yes, Cancel')).toBeTruthy());

    mockGetUserTickets.mockResolvedValue([]);
    fireEvent.click(screen.getByText('Yes, Cancel'));

    await waitFor(() => {
      expect(mockCancelSignup).toHaveBeenCalledWith(10);
      expect(screen.queryByText('Fireball Formal')).toBeNull();
    });
  });
});
