'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { getEvents, signupForEvent, cancelSignup, getUserTickets, type EventItem } from './lib/api';
import { useUser } from './context/UserContext';
import EventCard from './components/EventCard';
import CreateEventModal from './components/CreateEventModal';

export default function EventsPage() {
  const { currentUser, isAdmin, loading: userLoading } = useUser();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [signedUpEventIds, setSignedUpEventIds] = useState<Set<number>>(
    new Set(),
  );

  const loadEvents = async () => {
    try {
      const data = await getEvents();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserTickets = async () => {
    if (!currentUser) return;
    try {
      const tickets = await getUserTickets(currentUser.id);
      setSignedUpEventIds(new Set(tickets.map((t) => t.eventId)));
    } catch (err) {
      console.error('Failed to load tickets:', err);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    loadUserTickets();
  }, [currentUser]);

  const filteredEvents = useMemo(() => {
    if (!search.trim()) return events;
    const q = search.toLowerCase();
    return events.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.location && e.location.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q)),
    );
  }, [events, search]);

  const handleSignUp = async (eventId: number) => {
    if (!currentUser) {
      alert('Please select a user first.');
      return;
    }
    try {
      const result = await signupForEvent(eventId, currentUser.id);
      if (result.error) {
        alert(result.error);
        return;
      }
      await loadEvents();
      await loadUserTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to sign up');
    }
  };

  const handleCancel = async (eventId: number) => {
    if (!currentUser) return;
    try {
      const result = await cancelSignup(eventId, currentUser.id);
      if (result.error) {
        alert(result.error);
        return;
      }
      await loadEvents();
      await loadUserTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel');
    }
  };

  const handleEventCreated = () => {
    setShowCreateModal(false);
    loadEvents();
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-[#7A1F3E] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upcoming Events</h1>
          <p className="text-gray-500 mt-1">
            Discover and register for events
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#7A1F3E] text-white rounded-lg text-sm font-semibold hover:bg-[#621832] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search events by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#7A1F3E] focus:border-transparent outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">
            {search ? 'No events match your search.' : 'No events found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onSignUp={handleSignUp}
              isSignedUp={signedUpEventIds.has(event.id)}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleEventCreated}
        />
      )}
    </div>
  );
}
