'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  MapPin,
  DollarSign,
  Bus,
  Armchair,
  ImageIcon,
} from 'lucide-react';
import { getUserTickets, cancelSignup, type Ticket } from '../lib/api';
import { useUser } from '../context/UserContext';

export default function MySignUpsPage() {
  const { currentUser, loading: userLoading } = useUser();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTickets = async () => {
    if (!currentUser) return;
    try {
      const data = await getUserTickets(currentUser.id);
      setTickets(data);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      setLoading(true);
      loadTickets();
    }
  }, [currentUser]);

  const handleCancel = async (eventId: number) => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to cancel this sign-up?')) return;

    try {
      const result = await cancelSignup(eventId, currentUser.id);
      if (result.error) {
        alert(result.error);
        return;
      }
      await loadTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return 'Free';
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-[#7A1F3E] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-500 text-center py-16">
          Please select a user to view sign-ups.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Sign-Ups</h1>
        <p className="text-gray-500 mt-1">
          Events you&apos;re registered for
        </p>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">
            You haven&apos;t signed up for any events yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.ticketId}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row">
                {/* Image */}
                <div className="sm:w-48 h-32 sm:h-auto bg-gray-100 flex-shrink-0">
                  {ticket.eventImageUrl ? (
                    <img
                      src={ticket.eventImageUrl}
                      alt={ticket.eventName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center min-h-[128px]">
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {ticket.eventName}
                      </h3>
                      <div className="mt-2 space-y-1.5 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{formatDate(ticket.eventDate)}</span>
                        </div>
                        {ticket.eventLocation && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span>{ticket.eventLocation}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span>{formatPrice(ticket.eventPrice)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCancel(ticket.eventId)}
                      className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Seat Assignments */}
                  {(ticket.tableSeat || ticket.busSeat) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-4">
                      {ticket.tableSeat && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                          <Armchair className="w-3.5 h-3.5" />
                          {ticket.tableSeat}
                        </span>
                      )}
                      {ticket.busSeat && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                          <Bus className="w-3.5 h-3.5" />
                          {ticket.busSeat}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
