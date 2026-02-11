import { Tabs } from "expo-router";
import { View, Text, Pressable, Modal, FlatList, Platform } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser } from "../_context/UserContext";

function HeaderRight() {
  const { currentUser, allUsers, switchUser } = useUser();
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setShowPicker(true)}
        className="flex-row items-center mr-4 px-3 py-1.5 rounded-full bg-gray-100"
      >
        <View className="w-7 h-7 rounded-full bg-gray-300 items-center justify-center mr-2">
          <Text className="text-xs font-bold text-gray-600">
            {currentUser?.name?.charAt(0) || "?"}
          </Text>
        </View>
        <Text className="text-sm font-medium text-gray-700" numberOfLines={1}>
          {currentUser?.name || "Select User"}
        </Text>
      </Pressable>

      <Modal visible={showPicker} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/40 justify-center items-center px-6"
          onPress={() => setShowPicker(false)}
        >
          <Pressable
            className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-base font-bold text-gray-900 px-5 pt-5 pb-3">
              Switch User (Dev)
            </Text>
            <FlatList
              data={allUsers}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    switchUser(item.id);
                    setShowPicker(false);
                  }}
                  className={`px-5 py-3.5 border-t border-gray-100 ${
                    currentUser?.id === item.id ? "bg-gray-50" : ""
                  }`}
                >
                  <Text className="text-sm font-semibold text-gray-900">
                    {item.name}
                  </Text>
                  <View className="flex-row items-center mt-0.5">
                    <Text className="text-xs text-gray-500">{item.email}</Text>
                    {item.isSystemAdmin && (
                      <View className="ml-2 px-1.5 py-0.5 bg-red-100 rounded">
                        <Text className="text-[10px] font-bold text-red-700">
                          ADMIN
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              )}
            />
            <Pressable
              onPress={() => setShowPicker(false)}
              className="border-t border-gray-200 py-3.5"
            >
              <Text className="text-center text-sm font-medium text-gray-500">
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
