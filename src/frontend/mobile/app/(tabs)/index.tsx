import { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  RefreshControl,
  Modal,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  getEvents,
  signupForEvent,
  cancelSignup,
  getUserTickets,
  type EventItem,
} from "../lib/api";
import { useUser } from "../context/UserContext";

function EventCard({
  event,
  isSignedUp,
  onSignUp,
  onCancel,
}: {
  event: EventItem;
  isSignedUp: boolean;
  onSignUp: (id: number) => void;
  onCancel: (id: number) => void;
}) {
  const isFull = event.registeredCount >= event.capacity;
  const isPast = new Date(event.date) < new Date();
  const isOpen = !isFull && !isPast;

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

  return (
    <View className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex-1">
      {/* Image */}
      <View className="h-44 bg-gray-100 relative">
        {event.imageUrl ? (
          <Image
            source={{ uri: event.imageUrl }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Text className="text-4xl">🖼️</Text>
          </View>
        )}
        {/* Status badge */}
        <View className="absolute top-3 right-3">
          {isPast ? (
            <View className="px-3 py-1 rounded-full bg-gray-500">
              <Text className="text-xs font-semibold text-white">Past</Text>
            </View>
          ) : isFull ? (
            <View className="px-3 py-1 rounded-full bg-red-500">
              <Text className="text-xs font-semibold text-white">Full</Text>
            </View>
          ) : (
            <View className="px-3 py-1 rounded-full bg-green-500">
              <Text className="text-xs font-semibold text-white">Open</Text>
            </View>
          )}
        </View>
      </View>

      {/* Content */}
      <View className="p-4">
        <Text className="text-lg font-bold text-gray-900 mb-2">
          {event.name}
        </Text>

        <View className="gap-1.5 mb-4">
          <View className="flex-row items-center gap-2">
            <Text className="text-sm">📅</Text>
            <Text className="text-sm text-gray-600">
              {formatDate(event.date)}
            </Text>
          </View>
          {event.location && (
            <View className="flex-row items-center gap-2">
              <Text className="text-sm">📍</Text>
              <Text className="text-sm text-gray-600">{event.location}</Text>
            </View>
          )}
          <View className="flex-row items-center gap-2">
            <Text className="text-sm">👥</Text>
            <Text className="text-sm text-gray-600">
              {event.registeredCount} registered
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Text className="text-sm">💰</Text>
            <Text className="text-sm text-gray-600">
              {formatPrice(event.price)}
            </Text>
          </View>
        </View>

        {/* Action button */}
        {isSignedUp ? (
          <Pressable
            onPress={() => onCancel(event.id)}
            className="w-full py-3 rounded-xl border border-red-200 bg-red-50 active:bg-red-100"
          >
            <Text className="text-center text-sm font-semibold text-red-600">
              Cancel Sign-Up
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => onSignUp(event.id)}
            disabled={!isOpen}
            className={`w-full py-3 rounded-xl ${
              isOpen ? "bg-maroon active:bg-maroon-dark" : "bg-gray-200"
            }`}
          >
            <Text
              className={`text-center text-sm font-semibold ${
                isOpen ? "text-white" : "text-gray-500"
              }`}
            >
              {isPast ? "Event Ended" : isFull ? "Event Full" : "Sign Up"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function EventsScreen() {
  const { currentUser, isAdmin, loading: userLoading } = useUser();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signedUpEventIds, setSignedUpEventIds] = useState<Set<number>>(
    new Set()
  );
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [eventToCancel, setEventToCancel] = useState<number | null>(null);
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Responsive: 1 col on small, 2 on medium, 3 on large
  const numColumns = width >= 1024 ? 3 : width >= 640 ? 2 : 1;

  const loadEvents = async () => {
    try {
      const data = await getEvents();
      setEvents(data);
    } catch (err) {
      console.error("Failed to load events:", err);
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
      console.error("Failed to load tickets:", err);
    }
  };

  // Reload events every time this screen gets focus (e.g. after creating an event)
  useFocusEffect(
    useCallback(() => {
      loadEvents();
      loadUserTickets();
    }, [currentUser])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    await loadUserTickets();
    setRefreshing(false);
  };

  const filteredEvents = useMemo(() => {
    if (!search.trim()) return events;
    const q = search.toLowerCase();
    return events.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.location && e.location.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q))
    );
  }, [events, search]);

  const handleSignUp = async (eventId: number) => {
    if (!currentUser) return;
    router.push(`/event-signup?eventId=${eventId}`);
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
      await loadEvents();
      await loadUserTickets();
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

  if (userLoading || loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F5F7]">
        <ActivityIndicator size="large" color="#7A1F3E" />
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
        <View className="flex-row items-start justify-between mb-5">
          <View>
            <Text className="text-2xl font-bold text-gray-900">
              Upcoming Events
            </Text>
            <Text className="text-gray-500 mt-1">
              Discover and register for events
            </Text>
          </View>
          {isAdmin && (
            <Pressable
              onPress={() => router.push("/create-event")}
              className="flex-row items-center gap-1.5 px-4 py-2.5 bg-maroon rounded-xl active:bg-maroon-dark"
            >
              <Text className="text-white text-lg">+</Text>
              <Text className="text-white text-sm font-semibold">
                Create Event
              </Text>
            </Pressable>
          )}
        </View>

        {/* Search */}
        <View className="mb-6">
          <View className="flex-row items-center bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
            <Text className="text-base mr-2">🔍</Text>
            <TextInput
              placeholder="Search events by name..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
              className="flex-1 text-sm text-gray-900"
            />
          </View>
        </View>

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <View className="items-center py-16">
            <Text className="text-gray-500 text-base">
              {search ? "No events match your search." : "No events found."}
            </Text>
          </View>
        ) : (
          <View
            className="flex-row flex-wrap"
            style={{ gap: 16 }}
          >
            {filteredEvents.map((event) => (
              <View
                key={event.id}
                style={{
                  width:
                    numColumns === 1
                      ? "100%"
                      : `${(100 - (numColumns - 1) * 2) / numColumns}%`,
                }}
              >
                <EventCard
                  event={event}
                  isSignedUp={signedUpEventIds.has(event.id)}
                  onSignUp={handleSignUp}
                  onCancel={handleCancel}
                />
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
