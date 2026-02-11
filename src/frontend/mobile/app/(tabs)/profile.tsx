import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { updateUser } from "../_lib/api";
import { useUser } from "../_context/UserContext";

export default function ProfileScreen() {
  const { currentUser, isAdmin, loading, switchUser } = useUser();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    program: "",
  });

  useEffect(() => {
    if (currentUser) {
      setForm({
        name: currentUser.name,
        email: currentUser.email,
        phoneNumber: currentUser.phoneNumber,
        program: currentUser.program || "",
      });
      setEditing(false);
    }
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);

    try {
      await updateUser(currentUser.id, {
        name: form.name,
        phoneNumber: form.phoneNumber,
        program: form.program || null,
      } as any);
      Alert.alert("Success", "Profile updated successfully.");
      setEditing(false);
      switchUser(currentUser.id);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
          Please select a user to view profile.
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
                {currentUser.name.charAt(0)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900">
                {currentUser.name}
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
                {currentUser.roles?.map((role) => (
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
                placeholderTextColor="#9CA3AF"
                className={`w-full px-4 py-3 border rounded-xl text-sm ${
                  editing
                    ? "border-gray-300 bg-white text-gray-900"
                    : "border-gray-200 bg-gray-50 text-gray-500"
                }`}
              />
            </View>

            {/* Actions */}
            <View className="pt-2">
              {editing ? (
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => {
                      setEditing(false);
                      setForm({
                        name: currentUser.name,
                        email: currentUser.email,
                        phoneNumber: currentUser.phoneNumber,
                        program: currentUser.program || "",
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
      </ScrollView>
    </View>
  );
}
