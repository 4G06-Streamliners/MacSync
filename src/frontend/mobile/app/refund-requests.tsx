import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "./_context/AuthContext";
import {
  getAllRefundRequests,
  approveRefundRequest,
  denyRefundRequest,
  type RefundRequest,
} from "./_lib/api";

export default function RefundRequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAdmin } = useAuth();
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RefundRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"approve" | "deny">("approve");
  const [adminResponse, setAdminResponse] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/(tabs)");
      return;
    }
    loadRequests();
  }, [isAdmin, router]);

  const loadRequests = async () => {
    try {
      const data = await getAllRefundRequests();
      setRequests(data);
    } catch (err) {
      console.error("Failed to load refund requests:", err);
      Alert.alert("Error", "Failed to load refund requests");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedRequest) return;

    // Validate required fields for both approve and deny
    if (!adminResponse.trim()) {
      Alert.alert(
        "Required", 
        `Please provide a ${modalType === "approve" ? "confirmation message" : "reason"} for ${modalType === "approve" ? "approving" : "denying"} this refund request.`
      );
      return;
    }

    setProcessing(true);
    try {
      const action = modalType === "approve" ? approveRefundRequest : denyRefundRequest;
      const result = await action(selectedRequest.id, adminResponse.trim() || undefined);

      if (result.error) {
        Alert.alert("Error", result.error);
      } else {
        // Reload requests before showing success message
        await loadRequests();
        
        Alert.alert(
          "Success",
          `Refund request ${modalType === "approve" ? "approved" : "denied"} successfully`
        );
        setShowModal(false);
        setSelectedRequest(null);
        setAdminResponse("");
      }
    } catch (err: any) {
      console.error("Action error:", err);
      Alert.alert("Error", err?.message || `Failed to ${modalType} refund request`);
    } finally {
      setProcessing(false);
    }
  };

  const openModal = (request: RefundRequest, type: "approve" | "deny") => {
    setSelectedRequest(request);
    setModalType(type);
    setShowModal(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: number) => {
    return `$${(price / 100).toFixed(2)}`;
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F5F7]">
        <ActivityIndicator size="large" color="#7A1F3E" />
      </View>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const processedRequests = requests
    .filter((r) => r.status !== "pending")
    .sort((a, b) => {
      // Sort by processedAt, most recent first
      const aTime = a.processedAt ? new Date(a.processedAt).getTime() : 0;
      const bTime = b.processedAt ? new Date(b.processedAt).getTime() : 0;
      return bTime - aTime;
    });

  return (
    <View className="flex-1 bg-[#F5F5F7]">
      {/* Header */}
      <View
        className="bg-white border-b border-gray-200 px-4 pb-4"
        style={{ paddingTop: Math.max(insets.top, 16) + 8 }}
      >
        <Pressable onPress={() => router.back()}>
          <Text className="text-base text-maroon font-medium">
            ← Back to Admin
          </Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-4 py-6">
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Refund Requests
        </Text>
        <Text className="text-sm text-gray-600 mb-6">
          Review and process refund requests from users
        </Text>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              Pending ({pendingRequests.length})
            </Text>
            <View className="gap-4 mb-6">
              {pendingRequests.map((request) => (
                <View
                  key={request.id}
                  className="bg-white rounded-2xl p-4 border border-yellow-300 shadow-sm"
                >
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-gray-900 mb-1">
                        {request.eventName}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        {request.userName} • {request.userEmail}
                      </Text>
                    </View>
                    <View className="bg-yellow-100 px-2 py-1 rounded-lg">
                      <Text className="text-xs font-bold text-yellow-800">
                        PENDING
                      </Text>
                    </View>
                  </View>

                  {request.reason && (
                    <View className="bg-gray-50 rounded-lg p-3 mb-3">
                      <Text className="text-xs text-gray-500 mb-1">Reason:</Text>
                      <Text className="text-sm text-gray-700">{request.reason}</Text>
                    </View>
                  )}

                  <Text className="text-xs text-gray-400 mb-3">
                    Requested {formatDate(request.createdAt)}
                  </Text>

                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => openModal(request, "approve")}
                      className="flex-1 bg-green-500 active:bg-green-600 rounded-xl p-3 items-center"
                    >
                      <Text className="text-sm font-bold text-white">✓ Approve</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => openModal(request, "deny")}
                      className="flex-1 bg-red-500 active:bg-red-600 rounded-xl p-3 items-center"
                    >
                      <Text className="text-sm font-bold text-white">✗ Deny</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {pendingRequests.length === 0 && (
          <View className="bg-white rounded-2xl p-8 items-center mb-6">
            
            <Text className="text-base font-bold text-gray-900 mb-1">
              All caught up!
            </Text>
            <Text className="text-sm text-gray-600 text-center">
              No pending refund requests at the moment
            </Text>
          </View>
        )}

        {/* Processed Requests */}
        {processedRequests.length > 0 && (
          <>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              Recently Processed
            </Text>
            <View className="gap-3">
              {processedRequests.slice(0, 10).map((request) => (
                <View
                  key={request.id}
                  className="bg-white rounded-xl p-4 border border-gray-200"
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1">
                      <Text className="text-base font-bold text-gray-900">
                        {request.eventName}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {request.userName}
                      </Text>
                    </View>
                    <View
                      className={`px-2 py-1 rounded-lg ${
                        request.status === "approved"
                          ? "bg-green-100"
                          : "bg-red-100"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          request.status === "approved"
                            ? "text-green-800"
                            : "text-red-800"
                        }`}
                      >
                        {request.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  {request.adminResponse && (
                    <Text className="text-xs text-gray-600 mb-2">
                      Response: {request.adminResponse}
                    </Text>
                  )}
                  <Text className="text-xs text-gray-400">
                    Processed {request.processedAt && formatDate(request.processedAt)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Action Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 bg-black/50 justify-end">
            <TouchableWithoutFeedback>
              <View
                className="bg-white rounded-t-3xl p-6"
                style={{ paddingBottom: insets.bottom + 24 }}
              >
                <Text className="text-xl font-bold text-gray-900 mb-2">
                  {modalType === "approve" ? "Approve Refund" : "Deny Refund"}
                </Text>
                <Text className="text-sm text-gray-600 mb-4">
                  {selectedRequest?.eventName} - {selectedRequest?.userName}
                </Text>

                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Message to User <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={adminResponse}
                    onChangeText={setAdminResponse}
                    placeholder=""
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={3}
                    className="border border-gray-300 rounded-xl p-4 text-base text-gray-900 min-h-[80px]"
                    style={{ textAlignVertical: "top" }}
                    returnKeyType="done"
                    blurOnSubmit={true}
                  />
                  <Text className="text-xs text-gray-500 mt-1">
                    * Required: {modalType === "approve" 
                      ? "Provide a confirmation message for the user" 
                      : "Explain why the refund is being denied"}
                  </Text>
                </View>

                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      setShowModal(false);
                      setAdminResponse("");
                    }}
                    disabled={processing}
                    className="flex-1 bg-gray-200 active:bg-gray-300 rounded-xl p-4 items-center"
                  >
                    <Text className="text-base font-bold text-gray-700">Cancel</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleAction}
                    disabled={processing}
                    className={`flex-1 rounded-xl p-4 items-center disabled:opacity-50 ${
                      modalType === "approve"
                        ? "bg-green-500 active:bg-green-600"
                        : "bg-red-500 active:bg-red-600"
                    }`}
                  >
                    {processing ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-base font-bold text-white">
                        {modalType === "approve" ? "Approve" : "Deny"}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
