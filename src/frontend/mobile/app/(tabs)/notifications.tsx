import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  getMyNotifications,
  markNotificationRead,
  type AppNotification,
} from "../_lib/api";

const TYPE_ICON: Record<string, string> = {
  confirmation: "✅",
  cancellation: "↩️",
  reminder: "⏰",
  blast: "📢",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsScreen() {
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyNotifications();
      setNotifs(data);
    } catch {
      // silently fail — empty state shown
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(load);

  const handlePress = async (notif: AppNotification) => {
    if (notif.read) return;
    await markNotificationRead(notif.id);
    setNotifs((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
  };

  if (loading) {
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
      >
        <View className="mb-5">
          <Text className="text-2xl font-bold text-gray-900">Notifications</Text>
          <Text className="text-gray-500 mt-1">
            {notifs.filter((n) => !n.read).length} unread
          </Text>
        </View>

        {notifs.length === 0 ? (
          <View className="bg-white rounded-2xl p-10 items-center border border-gray-100">
            <Text className="text-4xl mb-3">🔔</Text>
            <Text className="text-base font-medium text-gray-900 mb-1">
              No notifications yet
            </Text>
            <Text className="text-sm text-gray-500 text-center">
              Confirmations, reminders, and updates will appear here.
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {notifs.map((notif) => (
              <Pressable
                key={notif.id}
                onPress={() => handlePress(notif)}
                className={`rounded-2xl p-4 border ${
                  notif.read
                    ? "bg-white border-gray-100"
                    : "bg-maroon/5 border-maroon/20"
                }`}
              >
                <View className="flex-row items-start gap-3">
                  <Text className="text-xl mt-0.5">
                    {TYPE_ICON[notif.type] ?? "🔔"}
                  </Text>
                  <View className="flex-1">
                    <Text
                      className={`text-sm leading-snug ${
                        notif.read ? "text-gray-600" : "text-gray-900 font-medium"
                      }`}
                    >
                      {notif.message}
                    </Text>
                    <Text className="text-xs text-gray-400 mt-1">
                      {timeAgo(notif.createdAt)}
                    </Text>
                  </View>
                  {!notif.read && (
                    <View className="w-2 h-2 rounded-full bg-maroon mt-1.5" />
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
