import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { getUserTickets, createRefundRequest, cancelSignup, type Ticket } from "./_lib/api";
import { useAuth } from "./_context/AuthContext";
export default function TicketDetailScreen() {
  const router = useRouter();
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const leaveScreen = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  }, [router]);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  useFocusEffect(
    useCallback(() => {
      if (user && ticketId) loadTicket();
    }, [user, ticketId]),
  );

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

  const eventEnded =
    ticket != null && new Date(ticket.eventDate).getTime() < Date.now();

  const handleRequestRefund = async () => {
    if (!ticket) return;
    
    const trimmedReason = refundReason.trim();
    if (!trimmedReason) {
      Alert.alert("Required", "Please provide a reason for your refund request.");
      return;
    }
    
    setSubmittingRefund(true);
    try {
      const result = await createRefundRequest(ticket.ticketId, trimmedReason);
      
      if (result.error) {
        Alert.alert("Error", result.error);
      } else {
        Alert.alert(
          "Refund Requested",
          "Your refund request has been submitted. An admin will review it shortly.",
          [{ text: "OK", onPress: () => {
            setShowRefundModal(false);
            setRefundReason("");
            loadTicket(); // Reload to show updated status
          }}]
        );
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to submit refund request");
    } finally {
      setSubmittingRefund(false);
    }
  };

  const handleCancelSignup = async () => {
    if (!ticket) return;
    
    setShowCancelModal(false);
    setCancelling(true);
    try {
      const result = await cancelSignup(ticket.eventId);
      
      if (result.error) {
        Alert.alert("Error", result.error);
      } else {
        leaveScreen();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to cancel ticket");
    } finally {
      setCancelling(false);
    }
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
          <Pressable onPress={leaveScreen}>
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
        <Pressable onPress={leaveScreen}>
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

        {eventEnded && (
          <View className="bg-gray-100 border border-gray-200 rounded-2xl p-4 mb-6">
            <Text className="text-base font-semibold text-gray-900">
              Event ended
            </Text>
            <Text className="text-sm text-gray-600 mt-1 leading-5">
              This is a past ticket for your records. Cancel and refund actions
              are not available.
            </Text>
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

        {/* Refund Status Banner */}
        {ticket.refundRequest && ticket.refundRequest.status === 'pending' && (
          <View className="bg-yellow-50 border border-yellow-300 rounded-2xl p-4 mb-6">
            <View className="flex-row items-center gap-2 mb-2">
              <Text className="text-xl">⏳</Text>
              <Text className="text-base font-bold text-yellow-900">
                Refund Requested
              </Text>
            </View>
            <Text className="text-sm text-yellow-800">
              Your refund request is pending admin review. We'll notify you once it's processed.
            </Text>
          </View>
        )}

        {ticket.refundRequest && ticket.refundRequest.status === 'denied' && ticket.refundRequest.adminResponse && (
          <View className="bg-red-50 border border-red-300 rounded-2xl p-4 mb-6">
            <View className="flex-row items-center gap-2 mb-2">
              <Text className="text-xl">❌</Text>
              <Text className="text-base font-bold text-red-900">
                Refund Denied
              </Text>
            </View>
            <Text className="text-sm text-red-800 mb-2">
              {ticket.refundRequest.adminResponse}
            </Text>
            <Text className="text-xs text-red-600">
              If you have questions, please contact support.
            </Text>
          </View>
        )}

        {/* Request Refund — not after event has started/finished */}
        {!eventEnded && ticket.eventPrice > 0 && !ticket.refundRequest && (
          <Pressable
            onPress={() => setShowRefundModal(true)}
            className="bg-red-500 active:bg-red-600 rounded-2xl p-4 mb-6 items-center"
          >
            <Text className="text-base font-bold text-white">
              Request Refund
            </Text>
          </Pressable>
        )}

        {/* Cancel Signup — free events only, before event ends */}
        {!eventEnded && ticket.eventPrice === 0 && (
          <Pressable
            onPress={() => setShowCancelModal(true)}
            disabled={cancelling}
            className="bg-gray-500 active:bg-gray-600 rounded-2xl p-4 mb-6 items-center disabled:opacity-50"
          >
            {cancelling ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-bold text-white">
                Cancel Sign-Up
              </Text>
            )}
          </Pressable>
        )}

        {/* QR — entry only before event ends */}
        <View className="bg-white rounded-2xl p-6 items-center border border-gray-100 shadow-sm">
          {eventEnded ? (
            <>
              {ticket.checkedIn && (
                <View className="mb-4 w-full bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex-row items-center gap-2">
                  <Text className="text-lg">✓</Text>
                  <Text className="text-base font-semibold text-green-800">
                    Checked In
                  </Text>
                </View>
              )}
              <Text className="text-lg font-bold text-gray-900 mb-2">
                Past event
              </Text>
              <Text className="text-sm text-gray-500 text-center leading-5">
                Entry QR is no longer shown because this event has ended.
              </Text>
            </>
          ) : (
            <>
              {ticket.checkedIn && (
                <View className="mb-4 w-full bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex-row items-center gap-2">
                  <Text className="text-lg">✓</Text>
                  <Text className="text-base font-semibold text-green-800">
                    Checked In
                  </Text>
                </View>
              )}
              <Text className="text-lg font-bold text-gray-900 mb-2">
                Entry QR Code
              </Text>
              <Text className="text-sm text-gray-500 text-center mb-6">
                {ticket.checkedIn
                  ? "You've been checked in. Welcome to the event!"
                  : "Show this QR code at the event entrance"}
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
                  💡 Save a screenshot of this QR code in case you lose internet
                  connection
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Ticket ID */}
        <View className="mt-4 px-4">
          <Text className="text-xs text-gray-400 text-center">
            Ticket ID: {ticket.ticketId}
          </Text>
        </View>
      </ScrollView>

      {/* Refund Request Modal */}
      <Modal
        visible={showRefundModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRefundModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => Keyboard.dismiss()}
            accessibilityRole="button"
            accessibilityLabel="Dismiss keyboard"
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? insets.bottom : 0}
            style={{ width: "100%" }}
            pointerEvents="box-none"
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: Math.max(insets.bottom, 12) + 8,
              }}
            >
              <View className="bg-white rounded-t-3xl p-6">
                <Text className="text-xl font-bold text-gray-900 mb-2">
                  Request Refund
                </Text>
                <Text className="text-sm text-gray-600 mb-4">
                  Please let us know why you're requesting a refund. This information is required.
                </Text>

                <TextInput
                  value={refundReason}
                  onChangeText={setRefundReason}
                  placeholder="Reason for refund (required)"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  className="border border-gray-300 rounded-xl p-4 text-base mb-4 min-h-[100px]"
                  style={{ textAlignVertical: "top" }}
                  returnKeyType="done"
                  blurOnSubmit={true}
                />

                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      setShowRefundModal(false);
                      setRefundReason("");
                    }}
                    disabled={submittingRefund}
                    className="flex-1 bg-gray-200 active:bg-gray-300 rounded-xl p-4 items-center"
                  >
                    <Text className="text-base font-bold text-gray-700">Cancel</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleRequestRefund}
                    disabled={submittingRefund}
                    className="flex-1 bg-red-500 active:bg-red-600 rounded-xl p-4 items-center disabled:opacity-50"
                  >
                    {submittingRefund ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-base font-bold text-white">Submit Request</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

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
              Are you sure you want to cancel your registration for this event? This action cannot be undone.
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowCancelModal(false)}
                className="flex-1 py-3 border border-gray-300 rounded-xl active:bg-gray-50"
              >
                <Text className="text-center text-sm font-medium text-gray-700">
                  No, Keep It
                </Text>
              </Pressable>
              <Pressable
                onPress={handleCancelSignup}
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
