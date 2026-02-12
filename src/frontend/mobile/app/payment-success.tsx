import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-[#F5F5F7] items-center justify-center px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 items-center max-w-sm">
        <Text className="text-5xl mb-4">✓</Text>
        <Text className="text-xl font-bold text-gray-900 text-center mb-2">
          Payment successful
        </Text>
        <Text className="text-sm text-gray-600 text-center mb-8">
          You're signed up for the event. See you there!
        </Text>
        <Pressable
          onPress={() => router.replace("/(tabs)")}
          className="bg-maroon active:bg-maroon-dark px-8 py-3 rounded-xl"
        >
          <Text className="text-base font-semibold text-white">OK</Text>
        </Pressable>
      </View>
    </View>
  );
}
