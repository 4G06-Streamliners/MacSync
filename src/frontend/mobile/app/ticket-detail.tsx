import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { getUserTickets, type Ticket } from "./_lib/api";
import { useAuth } from "./_context/AuthContext";

export default function TicketDetailScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    if (!user || !ticketId) return;
    try {
      const tickets = await getUserTickets(user.id);
      const found = tickets.find((t) => t.ticketId === parseInt(ticketId));
      setTicket(found || null);
    } catch (err) {
      console.error("Failed to load ticket:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "Free Event";
    return `$${(price / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F5F7]">
        <ActivityIndicator size="large" color="#7A1F3E" />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View className="flex-1 bg-[#F5F5F7]">
        <View
          className="bg-white border-b border-gray-200 px-4 pb-4"
          style={{ paddingTop: Math.max(insets.top, 16) + 8 }}
        >
          <Pressable onPress={() => router.back()}>
            <Text className="text-base text-maroon font-medium">
              ← Back to My Tickets
            </Text>
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-5xl mb-4">🎟️</Text>
          <Text className="text-gray-500 text-base text-center">
            Ticket not found
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F5F5F7]">
      {/* Header */}
      <View
        className="bg-white border-b border-gray-200 px-4 pb-4"
        style={{ paddingTop: Math.max(insets.top, 16) + 8 }}
      >
        <Pressable onPress={() => router.back()}>
          <Text className="text-base text-maroon font-medium">
            ← Back to My Tickets
          </Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-6"
      >
        {/* Event Image */}
        {ticket.eventImageUrl ? (
          <Image
            source={{ uri: ticket.eventImageUrl }}
            className="w-full h-48 rounded-2xl mb-6"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-48 bg-gray-200 rounded-2xl items-center justify-center mb-6">
            <Text className="text-6xl">🎪</Text>
          </View>
        )}

        {/* Event Info Card */}
        <View className="bg-white rounded-2xl p-6 mb-6 border border-gray-100 shadow-sm">
          <Text className="text-2xl font-bold text-gray-900 mb-4">
            {ticket.eventName}
          </Text>

          <View className="gap-3">
            <View className="flex-row items-start gap-3">
              <Text className="text-xl">📅</Text>
              <View className="flex-1">
                <Text className="text-sm text-gray-500">Date & Time</Text>
                <Text className="text-base font-medium text-gray-900">
                  {formatDate(ticket.eventDate)}
                </Text>
                <Text className="text-base font-medium text-gray-900">
                  {formatTime(ticket.eventDate)}
                </Text>
              </View>
            </View>

            {ticket.eventLocation && (
              <View className="flex-row items-start gap-3">
                <Text className="text-xl">📍</Text>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500">Location</Text>
                  <Text className="text-base font-medium text-gray-900">
                    {ticket.eventLocation}
                  </Text>
                </View>
              </View>
            )}

            <View className="flex-row items-start gap-3">
              <Text className="text-xl">💰</Text>
              <View className="flex-1">
                <Text className="text-sm text-gray-500">Price</Text>
                <Text className="text-base font-medium text-gray-900">
                  {formatPrice(ticket.eventPrice)}
                </Text>
              </View>
            </View>

            {/* Seat info */}
            {(ticket.tableSeat || ticket.busSeat) && (
              <View className="flex-row items-start gap-3">
                <Text className="text-xl">💺</Text>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500">Seat Assignment</Text>
                  <View className="flex-row gap-2 mt-1">
                    {ticket.tableSeat && (
                      <View className="px-3 py-1.5 bg-gray-100 rounded-lg">
                        <Text className="text-sm font-medium text-gray-700">
                          {ticket.tableSeat}
                        </Text>
                      </View>
                    )}
                    {ticket.busSeat && (
                      <View className="px-3 py-1.5 bg-gray-100 rounded-lg">
                        <Text className="text-sm font-medium text-gray-700">
                          {ticket.busSeat}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* QR Code Card */}
        <View className="bg-white rounded-2xl p-6 items-center border border-gray-100 shadow-sm">
          <Text className="text-lg font-bold text-gray-900 mb-2">
            Entry QR Code
          </Text>
          <Text className="text-sm text-gray-500 text-center mb-6">
            Show this QR code at the event entrance
          </Text>

          {ticket.qrCodeData ? (
            <View className="bg-white p-6 rounded-xl border-2 border-gray-200">
              <QRCode value={ticket.qrCodeData} size={220} />
            </View>
          ) : (
            <View className="bg-gray-100 p-8 rounded-xl items-center">
              <Text className="text-4xl mb-2">🎟️</Text>
              <Text className="text-sm text-gray-500 text-center">
                QR code will be generated shortly
              </Text>
            </View>
          )}

          <View className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <Text className="text-xs text-yellow-800 text-center">
              💡 Save a screenshot of this QR code in case you lose internet connection
            </Text>
          </View>
        </View>

        {/* Ticket ID */}
        <View className="mt-4 px-4">
          <Text className="text-xs text-gray-400 text-center">
            Ticket ID: {ticket.ticketId}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
