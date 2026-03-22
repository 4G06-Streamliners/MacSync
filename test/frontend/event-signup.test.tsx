/// <reference types="jest" />
import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

const mockGetEvent = jest.fn();
const mockSignupForEvent = jest.fn();
const mockCreateCheckoutSession = jest.fn();
const mockReleaseCheckoutReservation = jest.fn();

jest.mock('../../src/frontend/mobile/app/_lib/api', () => ({
  getEvent: mockGetEvent,
  signupForEvent: mockSignupForEvent,
  createCheckoutSession: mockCreateCheckoutSession,
  releaseCheckoutReservation: mockReleaseCheckoutReservation,
}));

const mockUseAuth = jest.fn();
jest.mock('../../src/frontend/mobile/app/_context/AuthContext', () => ({
  useAuth: (...args: any[]) => mockUseAuth(...args),
}));

import EventSignupScreen from '../../src/frontend/mobile/app/event-signup';

const mockRouter = require('expo-router').__mockRouter;

const makeEvent = (overrides: Record<string, any> = {}) => ({
  id: 1,
  name: 'Fireball Formal',
  description: 'Annual formal event',
  date: '2027-06-15T18:00:00.000Z',
  location: 'Hamilton Convention Centre',
  capacity: 100,
  imageUrl: null,
  price: 0,
  stripePriceId: null,
  requiresTableSignup: false,
  requiresBusSignup: false,
  tableCount: null,
  seatsPerTable: null,
  busCount: null,
  busCapacity: null,
  registeredCount: 25,
  userTicket: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('EventSignupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    require('expo-router').__setParams({ eventId: '1' });
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'test@mcmaster.ca', name: 'Test User' },
      status: 'authenticated',
    });
  });

  // ES1: renders event title, date, location, price, description, and Open badge
  it('renders event details and Open status badge', async () => {
    mockGetEvent.mockResolvedValue(makeEvent());
    render(<EventSignupScreen />);
    await waitFor(() => {
      expect(screen.getByText('Fireball Formal')).toBeTruthy();
      expect(screen.getByText('Hamilton Convention Centre')).toBeTruthy();
      expect(screen.getByText('Free')).toBeTruthy();
      expect(screen.getByText('Annual formal event')).toBeTruthy();
      expect(screen.getByText('Open')).toBeTruthy();
    });
  });

  // ES2: Full badge when at capacity; Past badge for past events
  it('shows Full badge when at capacity and Past badge for past events', async () => {
    mockGetEvent.mockResolvedValue(makeEvent({ registeredCount: 100, capacity: 100 }));
    render(<EventSignupScreen />);
    await waitFor(() => expect(screen.getByText('Full')).toBeTruthy());

    jest.clearAllMocks();
    require('expo-router').__setParams({ eventId: '1' });
    mockGetEvent.mockResolvedValue(makeEvent({ date: '2020-01-01T00:00:00Z' }));
    render(<EventSignupScreen />);
    await waitFor(() => expect(screen.getByText('Past')).toBeTruthy());
  });

  // ES3: navigates back on Cancel and Back to Events
  it('navigates back when Cancel or Back to Events is pressed', async () => {
    mockGetEvent.mockResolvedValue(makeEvent());
    const { unmount } = render(<EventSignupScreen />);
    await waitFor(() => expect(screen.getByText('Cancel')).toBeTruthy());
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockRouter.back).toHaveBeenCalled();
    unmount();

    jest.clearAllMocks();
    mockGetEvent.mockResolvedValue(makeEvent());
    render(<EventSignupScreen />);
    await waitFor(() => expect(screen.getByText('← Back to Events')).toBeTruthy());
    fireEvent.click(screen.getByText('← Back to Events'));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  // ES4: calls signupForEvent and shows success for free events
  it('calls signupForEvent and shows success notification for free events', async () => {
    const event = makeEvent();
    mockGetEvent
      .mockResolvedValueOnce(event)
      .mockResolvedValueOnce({ ...event, userTicket: { tableSeat: null, busSeat: null } });
    mockSignupForEvent.mockResolvedValue({ ticket: { tableSeat: null, busSeat: null } });

    render(<EventSignupScreen />);
    await waitFor(() => expect(screen.getByText('Complete sign up')).toBeTruthy());
    fireEvent.click(screen.getByText('Complete sign up'));

    await waitFor(() => {
      expect(mockSignupForEvent).toHaveBeenCalledWith(1, undefined);
      expect(screen.getByText("You're signed up!")).toBeTruthy();
    });
  });

  // ES5: calls createCheckoutSession for paid events
  it('calls createCheckoutSession for paid events', async () => {
    mockGetEvent.mockResolvedValue(makeEvent({ price: 2500, stripePriceId: 'price_123' }));
    mockCreateCheckoutSession.mockResolvedValue({ error: 'No payment link' });

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

  // ES6: table selection card and picker visible when requiresTableSignup is true
  it('shows table selection card and picker when requiresTableSignup is true', async () => {
    mockGetEvent.mockResolvedValue(
      makeEvent({ requiresTableSignup: true, tableCount: 3, seatsPerTable: 8 }),
    );
    render(<EventSignupScreen />);
    await waitFor(() => {
      expect(screen.getByText('Table Selection')).toBeTruthy();
      expect(screen.getByText('Select a table...')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Select a table...'));
    await waitFor(() => {
      expect(screen.getByText('Table 1')).toBeTruthy();
      expect(screen.getByText('Table 3')).toBeTruthy();
    });
  });

  // ES7: Event Full button shown; clicking it displays error notification
  it('shows Event Full button and error notification when event is at capacity', async () => {
    mockGetEvent.mockResolvedValue(makeEvent({ registeredCount: 100, capacity: 100 }));
    render(<EventSignupScreen />);
    await waitFor(() => expect(screen.getByText('Event Full')).toBeTruthy());
    fireEvent.click(screen.getByText('Event Full'));

    await waitFor(() => expect(screen.getByText('Event full')).toBeTruthy());
  });
});
