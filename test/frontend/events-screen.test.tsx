import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

const mockGetEvents = jest.fn();
const mockGetUserTickets = jest.fn();
const mockSignupForEvent = jest.fn();
const mockCancelSignup = jest.fn();

jest.mock('../../src/frontend/mobile/app/_lib/api', () => ({
  getEvents: mockGetEvents,
  getUserTickets: mockGetUserTickets,
  signupForEvent: mockSignupForEvent,
  cancelSignup: mockCancelSignup,
}));

const mockUseAuth = jest.fn();
jest.mock('../../src/frontend/mobile/app/_context/AuthContext', () => ({
  useAuth: (...args: any[]) => mockUseAuth(...args),
}));

import EventsScreen from '../../src/frontend/mobile/app/(tabs)/index';

const mockRouter = require('expo-router').__mockRouter;

const mockEvent = (overrides: Record<string, any> = {}) => ({
  id: 1,
  name: 'Test Event',
  description: 'A test event',
  date: '2027-06-15T18:00:00.000Z',
  location: 'Test Venue',
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
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('EventsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEvents.mockResolvedValue([]);
    mockGetUserTickets.mockResolvedValue([]);
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'test@mcmaster.ca', name: 'Test User' },
      isAdmin: false,
      status: 'authenticated',
    });
  });

  it('shows loading spinner when auth status is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, isAdmin: false, status: 'loading' });
    const { container } = render(<EventsScreen />);
    expect(container.querySelector('[role="progressbar"]')).toBeTruthy();
  });

  it('renders header, search, and empty state', async () => {
    render(<EventsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Upcoming Events')).toBeTruthy();
      expect(screen.getByPlaceholderText('Search events by name...')).toBeTruthy();
      expect(screen.getByText('No events found.')).toBeTruthy();
    });
  });

  it('renders event card with name, location, status badges, and pricing', async () => {
    mockGetEvents.mockResolvedValue([
      mockEvent({ price: 2500, registeredCount: 10 }),
    ]);
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeTruthy();
      expect(screen.getByText('Test Venue')).toBeTruthy();
      expect(screen.getByText('Open')).toBeTruthy();
      expect(screen.getByText('$25.00')).toBeTruthy();
      expect(screen.getByText('10 registered')).toBeTruthy();
    });
  });

  it('shows Full badge and disabled button when at capacity', async () => {
    mockGetEvents.mockResolvedValue([
      mockEvent({ registeredCount: 100, capacity: 100 }),
    ]);
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Full')).toBeTruthy();
      expect(screen.getByText('Event Full')).toBeTruthy();
    });
  });

  it('shows Past badge and Event Ended for past events', async () => {
    mockGetEvents.mockResolvedValue([
      mockEvent({ date: '2020-01-01T00:00:00Z', registeredCount: 10 }),
    ]);
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Past')).toBeTruthy();
      expect(screen.getByText('Event Ended')).toBeTruthy();
    });
  });

  it('shows Create Event button only for admins and navigates on click', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'admin@test.com', name: 'Admin' },
      isAdmin: true,
      status: 'authenticated',
    });
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Create Event')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Create Event'));
    expect(mockRouter.push).toHaveBeenCalledWith('/create-event');
  });

  it('hides Create Event button for non-admin users', async () => {
    render(<EventsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Upcoming Events')).toBeTruthy();
    });
    expect(screen.queryByText('Create Event')).toBeNull();
  });

  it('filters events by search and shows empty search message', async () => {
    mockGetEvents.mockResolvedValue([
      mockEvent({ id: 1, name: 'Annual Gala' }),
      mockEvent({ id: 2, name: 'Sports Day' }),
    ]);
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Annual Gala')).toBeTruthy();
    });

    fireEvent.change(screen.getByPlaceholderText('Search events by name...'), {
      target: { value: 'Gala' },
    });
    await waitFor(() => {
      expect(screen.getByText('Annual Gala')).toBeTruthy();
      expect(screen.queryByText('Sports Day')).toBeNull();
    });

    fireEvent.change(screen.getByPlaceholderText('Search events by name...'), {
      target: { value: 'nonexistent' },
    });
    await waitFor(() => {
      expect(screen.getByText('No events match your search.')).toBeTruthy();
    });
  });

  it('navigates to signup page when Sign Up is clicked', async () => {
    mockGetEvents.mockResolvedValue([mockEvent()]);
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Sign Up')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Sign Up'));
    expect(mockRouter.push).toHaveBeenCalledWith('/event-signup?eventId=1');
  });

  it('shows signed-up badge for events the user is registered for (no cancel/refund buttons)', async () => {
    mockGetEvents.mockResolvedValue([
      mockEvent({ id: 5, price: 0 }),
      mockEvent({ id: 3, price: 2500 }),
    ]);
    mockGetUserTickets.mockResolvedValue([{ eventId: 5 }, { eventId: 3 }]);
    render(<EventsScreen />);

    await waitFor(() => {
      const signedUpBadges = screen.getAllByText('✓ Signed Up');
      expect(signedUpBadges.length).toBe(2);
    });

    // Main events list should not show cancel/refund buttons anymore
    expect(screen.queryByText('Cancel Sign-Up')).toBeNull();
    expect(screen.queryByText('Request Refund')).toBeNull();
  });
});
