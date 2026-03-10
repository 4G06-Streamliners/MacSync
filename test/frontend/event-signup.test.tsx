import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

const mockGetEvent = jest.fn();
const mockSignupForEvent = jest.fn();
const mockCreateCheckoutSession = jest.fn();
const mockReleaseCheckoutReservation = jest.fn();

jest.mock('../../src/frontend/mobile/app/_lib/api', () => ({
  getEvent: (...args: any[]) => mockGetEvent(...args),
  signupForEvent: (...args: any[]) => mockSignupForEvent(...args),
  createCheckoutSession: (...args: any[]) => mockCreateCheckoutSession(...args),
  releaseCheckoutReservation: (...args: any[]) => mockReleaseCheckoutReservation(...args),
}));

const mockUseAuth = jest.fn();
jest.mock('../../src/frontend/mobile/app/_context/AuthContext', () => ({
  useAuth: (...args: any[]) => mockUseAuth(...args),
}));

jest.mock('expo-linking', () => ({
  createURL: (path: string) => `exp://test${path}`,
}), { virtual: true });

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}), { virtual: true });

const mockUseLocalSearchParams = require('expo-router').useLocalSearchParams;
const mockRouter = require('expo-router').__mockRouter;

import EventSignupScreen from '../../src/frontend/mobile/app/event-signup';

const baseEvent = {
  id: 1,
  name: 'Fireball Formal',
  description: 'Annual engineering formal with dinner and dancing. Dress code: semi-formal.',
  date: '2027-06-15T18:00:00.000Z',
  location: 'Hamilton Convention Centre',
  capacity: 200,
  imageUrl: null,
  price: 0,
  stripePriceId: null,
  requiresTableSignup: false,
  requiresBusSignup: false,
  tableCount: null,
  seatsPerTable: null,
  busCount: null,
  busCapacity: null,
  registeredCount: 50,
  userTicket: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('EventSignupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ eventId: '1' });
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'test@mcmaster.ca', name: 'Test User' },
      status: 'authenticated',
    });
    mockGetEvent.mockResolvedValue({ ...baseEvent });
  });

  it('renders event details: title, date, location, price, and description', async () => {
    render(<EventSignupScreen />);
    await waitFor(() => {
      expect(screen.getByText('Fireball Formal')).toBeTruthy();
      expect(screen.getByText('Hamilton Convention Centre')).toBeTruthy();
      expect(screen.getByText('Free')).toBeTruthy();
      expect(screen.getByText(/Annual engineering formal/)).toBeTruthy();
      expect(screen.getByText('Open')).toBeTruthy();
    });
  });

  it('shows correct status badge: Full when at capacity, Past for old events', async () => {
    mockGetEvent.mockResolvedValue({ ...baseEvent, registeredCount: 200, capacity: 200 });
    const { unmount } = render(<EventSignupScreen />);
    await waitFor(() => expect(screen.getByText('Full')).toBeTruthy());
    unmount();

    mockGetEvent.mockResolvedValue({ ...baseEvent, date: '2020-01-01T00:00:00Z' });
    render(<EventSignupScreen />);
    await waitFor(() => {
      expect(screen.getByText('Past')).toBeTruthy();
      expect(screen.getByText('Event Ended')).toBeTruthy();
    });
  });

  it('navigates back when "Back to Events" or Cancel is pressed', async () => {
    render(<EventSignupScreen />);
    await waitFor(() => expect(screen.getByText('← Back to Events')).toBeTruthy());

    fireEvent.click(screen.getByText('← Back to Events'));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockRouter.back).toHaveBeenCalledTimes(2);
  });

  it('calls signupForEvent and shows success for free events', async () => {
    mockSignupForEvent.mockResolvedValue({ ticket: { id: 1, tableSeat: null, busSeat: null } });
    mockGetEvent
      .mockResolvedValueOnce({ ...baseEvent })
      .mockResolvedValueOnce({ ...baseEvent, userTicket: { tableSeat: null, busSeat: null } });

    render(<EventSignupScreen />);
    await waitFor(() => expect(screen.getByText('Complete sign up')).toBeTruthy());
    fireEvent.click(screen.getByText('Complete sign up'));

    await waitFor(() => {
      expect(mockSignupForEvent).toHaveBeenCalledWith(1, undefined);
      expect(screen.getByText("You're signed up!")).toBeTruthy();
    });
  });

  it('calls createCheckoutSession for paid events', async () => {
    mockGetEvent.mockResolvedValue({ ...baseEvent, price: 2500, stripePriceId: 'price_123' });
    mockCreateCheckoutSession.mockResolvedValue({
      url: 'https://checkout.stripe.com/test',
      sessionId: 'cs_test_123',
    });
    mockRouter.canGoBack.mockReturnValue(false);

    render(<EventSignupScreen />);
    await waitFor(() => expect(screen.getByText('Proceed to payment')).toBeTruthy());
    fireEvent.click(screen.getByText('Proceed to payment'));

    await waitFor(() => {
      expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ successUrl: expect.any(String), cancelUrl: expect.any(String) }),
      );
    });
  });

  it('shows table selection card and picker when requiresTableSignup is true', async () => {
    mockGetEvent.mockResolvedValue({
      ...baseEvent,
      registeredCount: 5,
      requiresTableSignup: true,
      tableCount: 3,
      seatsPerTable: 8,
    });
    render(<EventSignupScreen />);
    await waitFor(() => {
      expect(screen.getByText('Table Selection')).toBeTruthy();
      expect(screen.getByText('Select a table...')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Select a table...'));
    await waitFor(() => {
      expect(screen.getByText('Table 1')).toBeTruthy();
      expect(screen.getByText('Table 2')).toBeTruthy();
      expect(screen.getByText('Table 3')).toBeTruthy();
    });
  });

  it('shows error when event is full on confirm attempt', async () => {
    mockGetEvent.mockResolvedValue({ ...baseEvent, registeredCount: 200, capacity: 200 });
    render(<EventSignupScreen />);
    await waitFor(() => expect(screen.getByText('Event Full')).toBeTruthy());

    fireEvent.click(screen.getByText('Event Full'));
    await waitFor(() => expect(screen.getByText('Event full')).toBeTruthy());
  });
});
