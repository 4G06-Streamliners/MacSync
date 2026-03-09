import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../_context/AuthContext";
import { useEffect } from "react";

export default function AdminScreen() {
  const router = useRouter();
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/(tabs)");
    }
  }, [isAdmin, router]);

  if (!isAdmin) {
    return null;
  }

  return (
    <View className="flex-1 bg-[#F5F5F7]">
      <ScrollView className="flex-1" contentContainerClassName="px-4 py-6">
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Admin Dashboard
        </Text>
        <Text className="text-sm text-gray-600 mb-6">
          Manage events, refunds, and view analytics
        </Text>

        {/* Admin Features Grid */}
        <View className="gap-4">
          {/* Refund Requests */}
          <Pressable
            onPress={() => router.push("/refund-requests")}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm active:bg-gray-50"
          >
            <View className="flex-row items-start justify-between mb-3">
              <View className="w-12 h-12 bg-yellow-100 rounded-xl items-center justify-center">
                <Text className="text-2xl">💰</Text>
              </View>
            </View>
            <Text className="text-lg font-bold text-gray-900 mb-1">
              Refund Requests
            </Text>
            <Text className="text-sm text-gray-600">
              Review and process pending refund requests
            </Text>
          </Pressable>

          {/* QR Scanner - Coming Soon */}
          <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm opacity-60">
            <View className="flex-row items-start justify-between mb-3">
              <View className="w-12 h-12 bg-blue-100 rounded-xl items-center justify-center">
                <Text className="text-2xl">📷</Text>
              </View>
              <View className="bg-gray-400 px-2 py-1 rounded-full">
                <Text className="text-xs font-bold text-white">Soon</Text>
              </View>
            </View>
            <Text className="text-lg font-bold text-gray-900 mb-1">
              QR Code Scanner
            </Text>
            <Text className="text-sm text-gray-600">
              Scan tickets at event entrance
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
