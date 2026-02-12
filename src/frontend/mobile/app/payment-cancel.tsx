import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { releaseCheckoutReservation } from "./_lib/api";

export default function PaymentCancelScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const stripeSessionIdRaw = params.stripeSessionId;
  const stripeSessionId =
    typeof stripeSessionIdRaw === "string" ? stripeSessionIdRaw : null;
  const eventIdRaw = params.eventId;
  const eventId = typeof eventIdRaw === "string" ? eventIdRaw : null;

  const [status, setStatus] = useState<"loading" | "done">("loading");
  const [subtitle, setSubtitle] = useState(
    "Releasing your reserved seat so you can try again..."
  );
  const [releaseOk, setReleaseOk] = useState<boolean | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (!stripeSessionId) {
          setSubtitle("Checkout cancelled.");
          setReleaseOk(null);
          return;
        }
        console.log("[payment-cancel] Releasing reservation:", stripeSessionId);
        await releaseCheckoutReservation(stripeSessionId);
        console.log("[payment-cancel] Release succeeded");
        if (cancelled) return;
        setSubtitle("Checkout cancelled. Your reserved seat was released.");
        setReleaseOk(true);
      } catch (err) {
        console.error("[payment-cancel] Release failed:", err);
        if (cancelled) return;
        // Even if this fails, the webhook + expiry still releases eventually.
        setSubtitle(
          "Checkout cancelled. We couldn't confirm the release, but it will be released automatically shortly."
        );
        setReleaseOk(false);
        const errMsg =
          err instanceof Error ? err.message : String(err);
        setErrorDetail(
          `Error: ${errMsg}. If you try again immediately and it says the seat is taken, wait up to ~5 minutes and retry.`
        );
      } finally {
        if (!cancelled) setStatus("done");
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [stripeSessionId]);

  return (
    <View
      className="flex-1 bg-[#F5F5F7] items-center justify-center px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 items-center max-w-sm w-full">
        <Text className="text-5xl mb-4">✕</Text>
        <Text className="text-xl font-bold text-gray-900 text-center mb-2">
          Checkout cancelled
        </Text>
        <Text className="text-sm text-gray-600 text-center mb-6">
          {subtitle}
        </Text>
        {status === "done" && releaseOk === false && errorDetail && (
          <Text className="text-xs text-gray-500 text-center mb-4">
            {errorDetail}
          </Text>
        )}

        {status === "loading" ? (
          <ActivityIndicator size="small" color="#7A1F3E" />
        ) : (
          <>
            {eventId ? (
              <>
                <Pressable
                  onPress={() =>
                    router.replace(`/event-signup?eventId=${encodeURIComponent(eventId)}`)
                  }
                  className="bg-maroon active:bg-maroon-dark px-8 py-3 rounded-xl w-full"
                >
                  <Text className="text-base font-semibold text-white text-center">
                    Try again
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => router.replace("/(tabs)")}
                  className="mt-3 px-8 py-3 rounded-xl w-full border border-gray-300 active:bg-gray-50"
                >
                  <Text className="text-base font-semibold text-gray-700 text-center">
                    Back to events
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={() => router.replace("/(tabs)")}
                className="bg-maroon active:bg-maroon-dark px-8 py-3 rounded-xl w-full"
              >
                <Text className="text-base font-semibold text-white text-center">
                  OK
                </Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </View>
  );
}

