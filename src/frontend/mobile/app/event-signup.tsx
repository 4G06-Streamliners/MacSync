import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Linking,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ExpoLinking from "expo-linking";
import {
  getEvent,
  signupForEvent,
  createCheckoutSession,
  type EventItem,
} from "./_lib/api";
import { useUser } from "./_context/UserContext";

type NotificationType = "success" | "error" | "info";

interface NotificationState {
  visible: boolean;
  type: NotificationType;
  title: string;
  message: string;
  onPress?: () => void;
}

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
  const [notification, setNotification] = useState<NotificationState>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  const showNotification = (
    type: NotificationType,
    title: string,
    message: string,
    onPress?: () => void
  ) => {
    setNotification({ visible: true, type, title, message, onPress });
  };

  const hideNotification = () => {
    setNotification((prev) => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    loadEvent();
  }, [eventId, currentUser?.id]);

  const loadEvent = async () => {
    try {
      const data = await getEvent(
        Number(eventId),
        currentUser?.id,
      );
      setEvent(data);
      if (data.userTicket) {
        const parts: string[] = [];
        if (data.userTicket.tableSeat) parts.push(data.userTicket.tableSeat);
        if (data.userTicket.busSeat) parts.push(data.userTicket.busSeat);
        const msg =
          parts.length > 0
            ? `You're signed up. ${parts.join(" • ")}. See you at the event!`
            : "You're signed up. See you at the event!";
        showNotification(
          "success",
          "You're signed up!",
          msg,
          () => router.replace("/(tabs)")
        );
      }
    } catch (err) {
      console.error("Failed to load event:", err);
      showNotification("error", "Error", "Failed to load event details");
      setTimeout(() => router.back(), 2000);
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

  const requiresPayment = (event?.price ?? 0) > 0;

  const getRedirectUrls = (): { successUrl: string; cancelUrl: string } => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const origin = window.location.origin;
      return {
        successUrl: `${origin}/payment-success`,
        cancelUrl: `${origin}/payment-cancel`,
      };
    }
    return {
      successUrl: ExpoLinking.createURL("/payment-success"),
      cancelUrl: ExpoLinking.createURL("/payment-cancel"),
    };
  };

  const handleProceedToPayment = async () => {
    if (!currentUser || !event) return;
    if (event.requiresTableSignup && selectedTable === null) {
      showNotification("error", "Error", "Please select a table");
      return;
    }

    setSubmitting(true);
    try {
      const { successUrl, cancelUrl } = getRedirectUrls();
      const successUrlWithEvent = `${successUrl}${
        successUrl.includes("?") ? "&" : "?"
      }eventId=${encodeURIComponent(event.id)}`;
      const cancelUrlWithEvent = `${cancelUrl}${
        cancelUrl.includes("?") ? "&" : "?"
      }eventId=${encodeURIComponent(event.id)}`;
      const result = await createCheckoutSession(event.id, currentUser.id, {
        successUrl: successUrlWithEvent,
        cancelUrl: cancelUrlWithEvent,
        selectedTable: selectedTable ?? undefined,
      });
      if (result.error) {
        showNotification("error", "Error", result.error);
        return;
      }
      const checkoutUrl = result.url?.trim();
      if (checkoutUrl && checkoutUrl.startsWith("http")) {
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.location.assign(checkoutUrl);
          return;
        }
        try {
          await Linking.openURL(checkoutUrl);
          router.replace("/(tabs)");
        } catch (openErr: any) {
          showNotification(
            "error",
            "Error",
            openErr?.message || "Could not open payment link. Try again."
          );
        }
      } else {
        showNotification(
          "error",
          "Error",
          "No payment link received. Check that the backend is running and STRIPE_SECRET_KEY is set."
        );
      }
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      const hint =
        msg.includes("fetch") || msg.includes("network") || msg.includes("Failed")
          ? " On a physical device, add EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:3000 to the mobile app .env so the app can reach the backend."
          : "";
      showNotification("error", "Error", (msg || "Failed to open payment") + hint);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteSignup = async () => {
    if (!event) return;
    if (!currentUser) {
      showNotification(
        "error",
        "Sign in required",
        "Please log in to sign up for this event."
      );
      return;
    }
    if (event.requiresTableSignup && selectedTable === null) {
      showNotification("error", "Error", "Please select a table");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signupForEvent(
        event.id,
        currentUser.id,
        selectedTable ?? undefined
      );
      if (result.error) {
        showNotification(
          "error",
          "Can't sign up",
          result.error || "This event is full or no seats are available."
        );
        return;
      }
      // Refetch event so UI shows "You're signed up" even if notification doesn't appear
      const updated = await getEvent(event.id, currentUser.id);
      setEvent(updated);

      const seatParts: string[] = [];
      if (result.ticket?.tableSeat) seatParts.push(result.ticket.tableSeat);
      if (result.ticket?.busSeat) seatParts.push(result.ticket.busSeat);
      const seatMessage =
        seatParts.length > 0
          ? `You're signed up! ${seatParts.join(" • ")}. See you at the event.`
          : "You're signed up! See you at the event.";
      showNotification(
        "success",
        "You're signed up!",
        seatMessage,
        () => router.replace("/(tabs)")
      );
    } catch (err: any) {
      const msg =
        err?.message && String(err.message).trim()
          ? String(err.message)
          : "Failed to sign up. Check your connection and try again.";
      showNotification("error", "Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSignup = () => {
    if (requiresPayment) {
      handleProceedToPayment();
      return;
    }
    if (isFull) {
      showNotification(
        "error",
        "Event full",
        "This event is full. No seats or tables are available."
      );
      return;
    }
    handleCompleteSignup();
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

  // Event is full when capacity or table/bus seats are exhausted (e.g. 1 table × 2 seats = max 2 signups)
  let effectiveCapacity = event.capacity;
  if (
    event.requiresTableSignup &&
    event.tableCount != null &&
    event.seatsPerTable != null
  ) {
    effectiveCapacity = Math.min(
      effectiveCapacity,
      event.tableCount * event.seatsPerTable
    );
  }
  if (
    event.requiresBusSignup &&
    event.busCount != null &&
    event.busCapacity != null
  ) {
    effectiveCapacity = Math.min(
      effectiveCapacity,
      event.busCount * event.busCapacity
    );
  }
  const isFull = event.registeredCount >= effectiveCapacity;
  const isPast = new Date(event.date) < new Date();
  const needsTableSelection =
    event.requiresTableSignup && selectedTable === null;
  const isRegistered = event.userTicket != null;
  const isOpen =
    !isRegistered && !isFull && !isPast && !needsTableSelection;

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
        {event.requiresTableSignup && event.tableCount && !isRegistered && (
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
          {isRegistered ? (
            <Pressable
              onPress={() => router.back()}
              className="flex-1 py-3 bg-maroon rounded-xl active:bg-maroon-dark"
            >
              <Text className="text-center text-sm font-semibold text-white">
                Back to events
              </Text>
            </Pressable>
          ) : (
            <>
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
                disabled={!isOpen && !isFull ? true : submitting}
                className={`flex-1 py-3 rounded-xl ${
                  (isOpen || isFull) && !submitting
                    ? "bg-maroon active:bg-maroon-dark"
                    : "bg-gray-300"
                }`}
              >
                <Text
                  className={`text-center text-sm font-semibold ${
                    (isOpen || isFull) && !submitting
                      ? "text-white"
                      : "text-gray-500"
                  }`}
                >
                  {submitting
                    ? "Processing..."
                    : isPast
                      ? "Event Ended"
                      : isFull
                        ? "Event Full"
                        : needsTableSelection
                          ? "Select a table"
                          : requiresPayment
                            ? "Proceed to payment"
                            : "Complete sign up"}
                </Text>
              </Pressable>
            </>
          )}
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

      {/* Notification Modal */}
      <Modal
        visible={notification.visible}
        transparent
        animationType="fade"
        onRequestClose={hideNotification}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <Pressable
            className="absolute inset-0"
            onPress={hideNotification}
          />
          <View
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 items-center max-w-sm w-full"
            style={{ marginTop: insets.top, marginBottom: insets.bottom }}
          >
            {/* Icon */}
            <Text
              className={`text-5xl mb-4 ${
                notification.type === "success"
                  ? "text-green-600"
                  : notification.type === "error"
                    ? "text-red-600"
                    : "text-blue-600"
              }`}
            >
              {notification.type === "success"
                ? "✓"
                : notification.type === "error"
                  ? "✕"
                  : "ℹ"}
            </Text>

            {/* Title */}
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              {notification.title}
            </Text>

            {/* Message */}
            <Text className="text-sm text-gray-600 text-center mb-8">
              {notification.message}
            </Text>

            {/* OK Button */}
            <Pressable
              onPress={() => {
                hideNotification();
                if (notification.onPress) {
                  notification.onPress();
                }
              }}
              className="bg-maroon active:bg-maroon-dark px-8 py-3 rounded-xl w-full"
            >
              <Text className="text-center text-base font-semibold text-white">
                OK
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
