import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getEvent, signupForEvent, type EventItem } from "./lib/api";
import { useUser } from "./context/UserContext";

export default function EventSignupScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams();
  const { currentUser } = useUser();
  const insets = useSafeAreaInsets();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const data = await getEvent(Number(eventId));
      setEvent(data);
    } catch (err) {
      console.error("Failed to load event:", err);
      Alert.alert("Error", "Failed to load event details");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "Free";
    return `$${(price / 100).toFixed(2)}`;
  };

  const handleConfirmSignup = async () => {
    if (!currentUser || !event) return;

    if (event.requiresTableSignup && selectedTable === null) {
      Alert.alert("Error", "Please select a table");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signupForEvent(event.id, currentUser.id);
      if (result.error) {
        Alert.alert("Error", result.error);
        return;
      }

      // Navigate to payment page (placeholder for now)
      Alert.alert("Success", "Proceeding to payment...", [
        {
          text: "OK",
          onPress: () => router.replace("/(tabs)"),
        },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to sign up");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F5F7]">
        <ActivityIndicator size="large" color="#7A1F3E" />
      </View>
    );
  }

  if (!event) {
    return null;
  }

  const isFull = event.registeredCount >= event.capacity;
  const isPast = new Date(event.date) < new Date();
  const isOpen = !isFull && !isPast;

  return (
    <View className="flex-1 bg-[#F5F5F7]">
      {/* Header */}
      <View
        className="bg-white border-b border-gray-200 px-4 pb-4"
        style={{ paddingTop: Math.max(insets.top, 16) + 8 }}
      >
        <Pressable onPress={() => router.back()}>
          <Text className="text-base text-maroon font-medium">
            ← Back to Events
          </Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-5 pb-10"
      >
        {/* Header Card - Event Details */}
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <View className="flex-row items-start justify-between mb-3">
            <Text className="text-2xl font-bold text-gray-900 flex-1 mr-3">
              {event.name}
            </Text>
            {/* Status Badge */}
            <View
              className={`px-3 py-1 rounded-full ${
                isPast
                  ? "bg-gray-500"
                  : isFull
                    ? "bg-red-500"
                    : "bg-green-500"
              }`}
            >
              <Text className="text-xs font-semibold text-white">
                {isPast ? "Past" : isFull ? "Full" : "Open"}
              </Text>
            </View>
          </View>

          {/* Metadata Row */}
          <View className="gap-2 mb-4">
            <View className="flex-row items-center gap-2">
              <Text className="text-base">📅</Text>
              <Text className="text-sm text-gray-600">
                {formatDate(event.date)}
              </Text>
            </View>
            {event.location && (
              <View className="flex-row items-center gap-2">
                <Text className="text-base">📍</Text>
                <Text className="text-sm text-gray-600">{event.location}</Text>
              </View>
            )}
            <View className="flex-row items-center gap-2">
              <Text className="text-base">💰</Text>
              <Text className="text-sm text-gray-600">
                {formatPrice(event.price)}
              </Text>
            </View>
          </View>

          {/* Description */}
          {event.description && (
            <View className="pt-4 border-t border-gray-100">
              <Text className="text-sm text-gray-700 leading-5">
                {event.description}
              </Text>
            </View>
          )}
        </View>

        {/* Feature Card - Table Signup */}
        {event.requiresTableSignup && event.tableCount && (
          <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <View className="flex-row items-center gap-3 mb-3">
              <Text className="text-2xl">🪑</Text>
              <Text className="text-lg font-bold text-gray-900">
                Table Selection
              </Text>
            </View>
            <Text className="text-sm text-gray-600 mb-3">
              Select your preferred table
            </Text>

            {/* Dropdown */}
            <Pressable
              onPress={() => setShowTablePicker(true)}
              className="border border-gray-300 rounded-xl px-4 py-3 bg-white"
            >
              <Text className="text-sm text-gray-900">
                {selectedTable ? `Table ${selectedTable}` : "Select a table..."}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Action Buttons */}
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => router.back()}
            className="flex-1 py-3 border border-gray-300 rounded-xl active:bg-gray-50"
          >
            <Text className="text-center text-sm font-medium text-gray-700">
              Cancel
            </Text>
          </Pressable>
          <Pressable
            onPress={handleConfirmSignup}
            disabled={!isOpen || submitting}
            className={`flex-1 py-3 rounded-xl ${
              isOpen && !submitting
                ? "bg-maroon active:bg-maroon-dark"
                : "bg-gray-300"
            }`}
          >
            <Text
              className={`text-center text-sm font-semibold ${
                isOpen && !submitting ? "text-white" : "text-gray-500"
              }`}
            >
              {submitting
                ? "Processing..."
                : isPast
                  ? "Event Ended"
                  : isFull
                    ? "Event Full"
                    : "Confirm Sign-up"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Table Picker Modal */}
      {event?.requiresTableSignup && event.tableCount && (
        <Modal
          visible={showTablePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTablePicker(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-3xl p-5 pb-8">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-bold text-gray-900">
                  Select Table
                </Text>
                <Pressable onPress={() => setShowTablePicker(false)}>
                  <Text className="text-base text-maroon font-medium">
                    Done
                  </Text>
                </Pressable>
              </View>
              <ScrollView className="max-h-80">
                {Array.from({ length: event.tableCount }, (_, i) => i + 1).map(
                  (tableNum) => (
                    <Pressable
                      key={tableNum}
                      onPress={() => {
                        setSelectedTable(tableNum);
                        setShowTablePicker(false);
                      }}
                      className={`py-4 px-4 border-b border-gray-100 active:bg-gray-50 ${
                        selectedTable === tableNum ? "bg-maroon/10" : ""
                      }`}
                    >
                      <Text
                        className={`text-base ${
                          selectedTable === tableNum
                            ? "font-semibold text-maroon"
                            : "text-gray-900"
                        }`}
                      >
                        Table {tableNum}
                      </Text>
                    </Pressable>
                  )
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
