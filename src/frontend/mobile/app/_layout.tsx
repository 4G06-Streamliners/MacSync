import "../global.css";
import { Stack, Redirect } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, ActivityIndicator } from "react-native";
import { AuthProvider, useAuth } from "./context/AuthContext";

function RootNavigator() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F5F7]">
        <ActivityIndicator size="large" color="#7A1F3E" />
      </View>
    );
  }

  return (
    <>
      <Stack key={status} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="create-event"
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="event-created"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
      </Stack>
      {status === "authenticated" ? (
        <Redirect href="/(tabs)" />
      ) : status === "needsRegistration" ? (
        <Redirect href="/(auth)/register" />
      ) : (
        <Redirect href="/(auth)/login" />
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
