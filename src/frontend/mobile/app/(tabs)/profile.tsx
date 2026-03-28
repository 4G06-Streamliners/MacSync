import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { updateUser, getMyRefundRequests, updateNotifPreferences, type RefundRequest } from "../_lib/api";
import { useAuth } from "../_context/AuthContext";

export default function ProfileScreen() {
  const { user, isAdmin, status, refreshUser } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notifInApp, setNotifInApp] = useState(true);
  const [savingNotif, setSavingNotif] = useState(false);
  const [refundedTickets, setRefundedTickets] = useState<RefundRequest[]>([]);
  const [loadingRefunds, setLoadingRefunds] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    program: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        program: user.program || "",
      });
      setNotifInApp((user as any).notifInApp ?? true);
      setEditing(false);
      loadRefundedTickets();
    }
  }, [user]);

  const loadRefundedTickets = async () => {
    setLoadingRefunds(true);
    try {
      const refunds = await getMyRefundRequests();
      // Only show approved refunds (tickets that were actually refunded)
      setRefundedTickets(refunds.filter(r => r.status === 'approved'));
    } catch (err) {
      console.error("Failed to load refunded tickets:", err);
    } finally {
      setLoadingRefunds(false);
    }
  };

  // Reload refunded tickets whenever the profile screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        void loadRefundedTickets();
      }
    }, [user]),
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleToggleNotif = async (value: boolean) => {
    setSavingNotif(true);
    try {
      await updateNotifPreferences(value);
      setNotifInApp(value);
    } catch {
      Alert.alert("Error", "Failed to update notification preference.");
    } finally {
      setSavingNotif(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      await updateUser(user.id, {
        name: form.name,
        phoneNumber: form.phoneNumber,
        program: form.program || null,
      } as any);
      Alert.alert("Success", "Profile updated successfully.");
      setEditing(false);
      await refreshUser();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F5F7]">
        <ActivityIndicator size="large" color="#7A1F3E" />
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F5F7] px-6">
        <Text className="text-gray-500 text-base text-center">
          Please sign in to view your profile.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F5F5F7]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-6 pb-8"
      >
        {/* Page header */}
        <View className="mb-5">
          <Text className="text-2xl font-bold text-gray-900">Profile</Text>
          <Text className="text-gray-500 mt-1">
            Manage your account information
          </Text>
        </View>

        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Avatar & Role */}
          <View className="p-5 border-b border-gray-100 flex-row items-center gap-4">
            <View className="w-16 h-16 bg-maroon rounded-full items-center justify-center">
              <Text className="text-2xl font-bold text-white">
                {user.name.charAt(0)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900">
                {user.name}
              </Text>
              <View className="flex-row items-center gap-2 mt-1.5 flex-wrap">
                {isAdmin && (
                  <View className="flex-row items-center gap-1 px-2.5 py-1 bg-red-100 rounded-full">
                    <Text className="text-xs">🛡️</Text>
                    <Text className="text-xs font-semibold text-red-700">
                      Admin
                    </Text>
                  </View>
                )}
                {user.roles?.map((role) => (
                  <View
                    key={role}
                    className="px-2.5 py-1 bg-gray-100 rounded-full"
                  >
                    <Text className="text-xs font-medium text-gray-700">
                      {role}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Fields */}
          <View className="p-5 gap-4">
            {/* Email */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">
                ✉️ Email
              </Text>
              <TextInput
                value={form.email}
                editable={false}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm"
              />
              <Text className="text-xs text-gray-400 mt-1">
                Email cannot be changed.
              </Text>
            </View>

            {/* Name */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">
                👤 Name
              </Text>
              <TextInput
                value={form.name}
                onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                editable={editing}
                className={`w-full px-4 py-3 border rounded-xl text-sm ${
                  editing
                    ? "border-gray-300 bg-white text-gray-900"
                    : "border-gray-200 bg-gray-50 text-gray-500"
                }`}
              />
            </View>

            {/* Phone */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">
                📞 Phone Number
              </Text>
              <TextInput
                value={form.phoneNumber}
                onChangeText={(v) =>
                  setForm((p) => ({ ...p, phoneNumber: v }))
                }
                editable={editing}
                keyboardType="phone-pad"
                className={`w-full px-4 py-3 border rounded-xl text-sm ${
                  editing
                    ? "border-gray-300 bg-white text-gray-900"
                    : "border-gray-200 bg-gray-50 text-gray-500"
                }`}
              />
            </View>

            {/* Program */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">
                📚 Program
              </Text>
              <TextInput
                value={form.program}
                onChangeText={(v) => setForm((p) => ({ ...p, program: v }))}
                editable={editing}
                placeholder={editing ? "e.g. Computer Science" : "—"}
                placeholderTextColor="#C7CBD1"
                className={`w-full px-4 py-3 border rounded-xl text-sm ${
                  editing
                    ? "border-gray-300 bg-white text-gray-900"
                    : "border-gray-200 bg-gray-50 text-gray-500"
                }`}
              />
            </View>

            {/* Notification Preferences */}
            <View className="pt-2 border-t border-gray-100">
              <Text className="text-sm font-medium text-gray-700 mb-3">
                🔔 Notification Preferences
              </Text>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-4">
                  <Text className="text-sm text-gray-800 font-medium">
                    In-App Notifications
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    Receive confirmations, reminders, and updates
                  </Text>
                </View>
                <Switch
                  value={notifInApp}
                  onValueChange={handleToggleNotif}
                  disabled={savingNotif}
                  trackColor={{ false: "#D1D5DB", true: "#7A1F3E" }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {/* Actions */}
            <View className="pt-2">
              {editing ? (
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => {
                      setEditing(false);
                      setForm({
                        name: user.name,
                        email: user.email,
                        phoneNumber: user.phoneNumber,
                        program: user.program || "",
                      });
                    }}
                    className="flex-1 py-3 border border-gray-300 rounded-xl active:bg-gray-50"
                  >
                    <Text className="text-center text-sm font-medium text-gray-700">
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSave}
                    disabled={saving}
                    className="flex-1 py-3 bg-maroon rounded-xl active:bg-maroon-dark disabled:opacity-50"
                  >
                    <Text className="text-center text-sm font-semibold text-white">
                      {saving ? "Saving..." : "Save Changes"}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setEditing(true)}
                  className="px-6 py-3 bg-maroon rounded-xl active:bg-maroon-dark self-start"
                >
                  <Text className="text-sm font-semibold text-white">
                    Edit Profile
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* Refunded Tickets Section */}
        <View className="mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-gray-900">
              Refunded Tickets
            </Text>
            {refundedTickets.length > 0 && (
              <View className="bg-gray-200 px-2 py-1 rounded-full">
                <Text className="text-xs font-bold text-gray-700">
                  {refundedTickets.length}
                </Text>
              </View>
            )}
          </View>

          {loadingRefunds ? (
            <View className="bg-white rounded-2xl p-8 items-center border border-gray-100">
              <ActivityIndicator size="small" color="#7A1F3E" />
            </View>
          ) : refundedTickets.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center border border-gray-100">
              <Text className="text-4xl mb-3">🎫</Text>
              <Text className="text-base font-medium text-gray-900 mb-1">
                No Refunded Tickets
              </Text>
              <Text className="text-sm text-gray-500 text-center">
                You haven't had any tickets refunded yet
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {refundedTickets.map((refund) => (
                <View
                  key={refund.id}
                  className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1">
                      <Text className="text-base font-bold text-gray-900 mb-1">
                        {refund.eventName}
                      </Text>
                      {refund.eventDate && (
                        <Text className="text-sm text-gray-600">
                          {formatDate(refund.eventDate)}
                        </Text>
                      )}
                    </View>
                    <View className="bg-green-100 px-2 py-1 rounded-lg">
                      <Text className="text-xs font-bold text-green-800">
                        REFUNDED
                      </Text>
                    </View>
                  </View>

                  {refund.adminResponse && (
                    <View className="mt-3 bg-gray-50 rounded-lg p-3">
                      <Text className="text-xs text-gray-500 mb-1">
                        Admin Message:
                      </Text>
                      <Text className="text-sm text-gray-700">
                        {refund.adminResponse}
                      </Text>
                    </View>
                  )}

                  <Text className="text-xs text-gray-400 mt-2">
                    Refunded on {refund.processedAt && formatDate(refund.processedAt)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
