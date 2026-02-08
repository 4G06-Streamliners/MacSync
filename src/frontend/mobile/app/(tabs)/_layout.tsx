import { Tabs } from "expo-router";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";

function HeaderRight() {
  const { user, logout } = useAuth();

  return (
    <View className="flex-row items-center mr-4">
      <View className="w-7 h-7 rounded-full bg-gray-300 items-center justify-center mr-2">
        <Text className="text-xs font-bold text-gray-600">
          {user?.name?.charAt(0) || "?"}
        </Text>
      </View>
      <Text className="text-sm font-medium text-gray-700" numberOfLines={1}>
        {user?.name || "Account"}
      </Text>
      <Pressable
        onPress={logout}
        className="ml-3 px-3 py-1.5 rounded-full bg-gray-100"
      >
        <Text className="text-xs font-semibold text-gray-600">Logout</Text>
      </Pressable>
    </View>
  );
}

function HeaderLeft() {
  return (
    <View className="flex-row items-center ml-4">
      <View className="w-9 h-9 bg-maroon rounded-lg items-center justify-center mr-2.5">
        <Text className="text-white text-lg font-bold">E</Text>
      </View>
      <View>
        <Text className="text-base font-bold text-gray-900 leading-tight">
          Events
        </Text>
        <Text className="text-[11px] text-gray-500 leading-tight">
          Student Portal
        </Text>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#7A1F3E",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
        },
        headerStyle: {
          backgroundColor: "#ffffff",
          shadowColor: "transparent",
          elevation: 0,
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        },
        headerLeft: () => <HeaderLeft />,
        headerRight: () => <HeaderRight />,
        headerTitle: "",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Events",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>🎪</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="my-signups"
        options={{
          title: "My Sign-Ups",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>🎟️</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>👤</Text>
          ),
        }}
      />
    </Tabs>
  );
}
