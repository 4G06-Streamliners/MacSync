import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EventCreatedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-[#F5F5F7] items-center justify-center px-8"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="bg-white rounded-3xl p-8 items-center w-full max-w-sm shadow-sm border border-gray-100">
        {/* Success icon */}
        <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-5">
          <Text className="text-4xl">✅</Text>
        </View>

        <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
          Event Created!
        </Text>
        <Text className="text-base text-gray-500 text-center mb-8">
          Your event has been successfully created and is now visible to users.
        </Text>

        <Pressable
          onPress={() => router.replace("/(tabs)")}
          className="w-full py-3.5 bg-maroon rounded-xl active:bg-maroon-dark"
        >
          <Text className="text-center text-base font-semibold text-white">
            Back to Events
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
