import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getUserTickets, cancelSignup, type Ticket } from "../_lib/api";
import { useUser } from "../_context/UserContext";

export default function MySignUpsScreen() {
  const { currentUser, loading: userLoading } = useUser();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [eventToCancel, setEventToCancel] = useState<number | null>(null);

  const loadTickets = async () => {
    if (!currentUser) return;
    try {
      const data = await getUserTickets(currentUser.id);
      setTickets(data);
    } catch (err) {
      console.error("Failed to load tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  // Reload tickets every time this screen gets focus
  useFocusEffect(
    useCallback(() => {
      if (currentUser) {
        setLoading(true);
        loadTickets();
      }
    }, [currentUser])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTickets();
    setRefreshing(false);
  };

  const handleCancel = async (eventId: number) => {
    if (!currentUser) return;
    console.log("Cancel clicked for event:", eventId);
    setEventToCancel(eventId);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!currentUser || !eventToCancel) return;
    console.log("Cancelling signup...");
    setShowCancelModal(false);
    try {
      const result = await cancelSignup(eventToCancel, currentUser.id);
      console.log("Cancel result:", result);
      if (result.error) {
        if (Platform.OS === 'web') {
          alert(result.error);
        } else {
          Alert.alert("Error", result.error);
        }
        return;
      }
      await loadTickets();
      if (Platform.OS === 'web') {
        alert("Sign-up cancelled successfully.");
      } else {
        Alert.alert("Success", "Sign-up cancelled successfully.");
      }
    } catch (err: any) {
      console.error("Cancel error:", err);
      if (Platform.OS === 'web') {
        alert(err.message || "Failed to cancel");
      } else {
        Alert.alert("Error", err.message || "Failed to cancel");
      }
    } finally {
      setEventToCancel(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "Free";
    return `$${(price / 100).toFixed(2)}`;
  };

  if (userLoading || loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F5F7]">
        <ActivityIndicator size="large" color="#7A1F3E" />
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F5F7] px-6">
        <Text className="text-gray-500 text-base text-center">
          Please select a user to view sign-ups.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F5F5F7]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-6 pb-8"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Page header */}
        <View className="mb-5">
          <Text className="text-2xl font-bold text-gray-900">My Sign-Ups</Text>
          <Text className="text-gray-500 mt-1">
            Events you're registered for
          </Text>
        </View>

        {tickets.length === 0 ? (
          <View className="items-center py-16">
            <Text className="text-5xl mb-4">🎟️</Text>
            <Text className="text-gray-500 text-base text-center">
              You haven't signed up for any events yet.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {tickets.map((ticket) => (
              <View
                key={ticket.ticketId}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <View className="flex-row">
                  {/* Image */}
                  <View className="w-28 bg-gray-100">
                    {ticket.eventImageUrl ? (
                      <Image
                        source={{ uri: ticket.eventImageUrl }}
                        className="w-full h-full"
                        resizeMode="cover"
                        style={{ minHeight: 120 }}
                      />
                    ) : (
                      <View
                        className="w-full items-center justify-center"
                        style={{ minHeight: 120 }}
                      >
                        <Text className="text-2xl">🖼️</Text>
                      </View>
                    )}
                  </View>

                  {/* Content */}
                  <View className="flex-1 p-4">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 mr-3">
                        <Text className="text-base font-bold text-gray-900">
                          {ticket.eventName}
                        </Text>
                        <View className="gap-1 mt-2">
                          <View className="flex-row items-center gap-1.5">
                            <Text className="text-xs">📅</Text>
                            <Text className="text-sm text-gray-600">
                              {formatDate(ticket.eventDate)}
                            </Text>
                          </View>
                          {ticket.eventLocation && (
                            <View className="flex-row items-center gap-1.5">
                              <Text className="text-xs">📍</Text>
                              <Text className="text-sm text-gray-600">
                                {ticket.eventLocation}
                              </Text>
                            </View>
                          )}
                          <View className="flex-row items-center gap-1.5">
                            <Text className="text-xs">💰</Text>
                            <Text className="text-sm text-gray-600">
                              {formatPrice(ticket.eventPrice)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Pressable
                        onPress={() => handleCancel(ticket.eventId)}
                        className="px-3 py-1.5 border border-red-200 rounded-lg bg-red-50 active:bg-red-100"
                      >
                        <Text className="text-xs font-semibold text-red-600">
                          Cancel
                        </Text>
                      </Pressable>
                    </View>

                    {/* Seat info */}
                    {(ticket.tableSeat || ticket.busSeat) && (
                      <View className="flex-row gap-2 mt-3 pt-3 border-t border-gray-100">
                        {ticket.tableSeat && (
                          <View className="flex-row items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full">
                            <Text className="text-xs">💺</Text>
                            <Text className="text-xs font-medium text-gray-600">
                              {ticket.tableSeat}
                            </Text>
                          </View>
                        )}
                        {ticket.busSeat && (
                          <View className="flex-row items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full">
                            <Text className="text-xs">🚌</Text>
                            <Text className="text-xs font-medium text-gray-600">
                              {ticket.busSeat}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <Text className="text-xl font-bold text-gray-900 mb-2">
              Cancel Sign-Up
            </Text>
            <Text className="text-sm text-gray-600 mb-6">
              Are you sure you want to cancel this sign-up?
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowCancelModal(false)}
                className="flex-1 py-3 border border-gray-300 rounded-xl active:bg-gray-50"
              >
                <Text className="text-center text-sm font-medium text-gray-700">
                  No
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmCancel}
                className="flex-1 py-3 bg-red-500 rounded-xl active:bg-red-600"
              >
                <Text className="text-center text-sm font-semibold text-white">
                  Yes, Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
