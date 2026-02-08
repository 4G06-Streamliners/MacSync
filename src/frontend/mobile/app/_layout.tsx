import "../global.css";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { UserProvider } from "./context/UserContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <Stack screenOptions={{ headerShown: false }}>
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
      </UserProvider>
    </SafeAreaProvider>
  );
}
