import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useAuth } from "./_context/AuthContext";
import { checkInTicket, type CheckInResult } from "./_lib/api";

type ScanStatus = "idle" | "scanning" | "processing" | "success" | "already" | "error";

export default function QRScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAdmin } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/(tabs)");
      return;
    }
    if (permission?.granted) {
      setStatus("scanning");
      isProcessingRef.current = false;
    } else if (permission?.canAskAgain) {
      requestPermission().then((p) => {
        if (p?.granted) {
          setStatus("scanning");
          isProcessingRef.current = false;
        }
      });
    }
  }, [isAdmin, permission, requestPermission, router]);

  const handleBarcodeScanned = useCallback(
    async (event: { data?: string; nativeEvent?: { data?: string } }) => {
      const data = event?.data ?? event?.nativeEvent?.data;
      if (!data) return;
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      setStatus("processing");
      setLastResult(null);
      try {
        const result = await checkInTicket(data);
        setLastResult(result);
        if (result.success) {
          setStatus("success");
        } else if (result.alreadyCheckedIn) {
          setStatus("already");
        } else {
          setStatus("error");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Check-in failed";
        setLastResult({ success: false, error: message });
        setStatus("error");
      } finally {
        isProcessingRef.current = false;
      }
    },
    [],
  );

  const resetScan = () => {
    isProcessingRef.current = false;
    setStatus("scanning");
    setLastResult(null);
  };

  if (!isAdmin) {
    return null;
  }

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View className="px-4 py-6">
          <Text className="text-xl font-bold text-gray-900 mb-2">
            QR Code Scanner
          </Text>
          <Text className="text-gray-600 mb-4">
            QR code scanning is only available on iOS and Android devices.
            Please open this app on your phone to scan tickets at the event entrance.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="bg-gray-900 py-3 px-4 rounded-xl"
          >
            <Text className="text-white font-semibold text-center">Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" />
        <Text className="text-gray-600 mt-4">Checking camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text className="text-lg font-semibold text-gray-900 mb-2">
          Camera access required
        </Text>
        <Text className="text-gray-600 text-center mb-6">
          Allow camera access to scan ticket QR codes at the event entrance.
        </Text>
        <Pressable
          onPress={() => requestPermission()}
          className="bg-blue-600 py-3 px-6 rounded-xl"
        >
          <Text className="text-white font-semibold">Allow Camera</Text>
        </Pressable>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 py-2"
        >
          <Text className="text-gray-600">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={StyleSheet.absoluteFill}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={
            status === "scanning" ? handleBarcodeScanned : undefined
          }
        />
      </View>

      {/* Overlay */}
      <View
        style={[
          styles.overlay,
          {
            top: insets.top,
            bottom: insets.bottom + 120,
          },
        ]}
        pointerEvents="none"
      >
        <View style={styles.scanFrame} />
      </View>

      {/* Top bar */}
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + 8 },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
        >
          <Text className="text-white text-lg">←</Text>
        </Pressable>
        <Text className="text-white font-semibold text-lg">Scan Ticket</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Status / result panel */}
      <View
        style={[
          styles.bottomPanel,
          {
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        {status === "processing" && (
          <View className="bg-white/95 rounded-2xl p-6 items-center">
            <ActivityIndicator size="large" />
            <Text className="text-gray-700 mt-3 font-medium">
              Verifying ticket…
            </Text>
          </View>
        )}

        {status === "success" && lastResult?.ticket && (
          <View className="bg-green-500/95 rounded-2xl p-6">
            <Text className="text-white text-xl font-bold mb-2">✓ Checked In</Text>
            <Text className="text-white font-medium">{lastResult.ticket.userName}</Text>
            <Text className="text-white/90 text-sm">{lastResult.ticket.userEmail}</Text>
            <Text className="text-white/90 text-sm mt-1">{lastResult.ticket.eventName}</Text>
            {lastResult.ticket.tableSeat && (
              <Text className="text-white/80 text-sm">Table: {lastResult.ticket.tableSeat}</Text>
            )}
            {lastResult.ticket.busSeat && (
              <Text className="text-white/80 text-sm">Bus: {lastResult.ticket.busSeat}</Text>
            )}
          </View>
        )}

        {status === "already" && lastResult?.ticket && (
          <View className="bg-amber-500/95 rounded-2xl p-6">
            <Text className="text-white text-xl font-bold mb-2">Already Checked In</Text>
            <Text className="text-white font-medium">{lastResult.ticket.userName}</Text>
            <Text className="text-white/90 text-sm">{lastResult.ticket.userEmail}</Text>
            <Text className="text-white/90 text-sm mt-1">{lastResult.ticket.eventName}</Text>
            {lastResult.ticket.tableSeat && (
              <Text className="text-white/80 text-sm">Table: {lastResult.ticket.tableSeat}</Text>
            )}
            {lastResult.ticket.busSeat && (
              <Text className="text-white/80 text-sm">Bus: {lastResult.ticket.busSeat}</Text>
            )}
          </View>
        )}

        {status === "error" && (
          <View className="bg-red-500/95 rounded-2xl p-6">
            <Text className="text-white text-xl font-bold mb-2">Invalid Ticket</Text>
            <Text className="text-white/90">
              {lastResult?.error ?? "Could not validate this QR code."}
            </Text>
          </View>
        )}

        {status === "scanning" && (
          <View className="bg-black/60 rounded-2xl px-6 py-4">
            <Text className="text-white text-center font-medium">
              Point camera at ticket QR code
            </Text>
            <Text className="text-white/80 text-sm text-center mt-1">
              Scan one ticket at a time
            </Text>
          </View>
        )}

        {(status === "success" || status === "already" || status === "error") && (
          <Pressable
            onPress={resetScan}
            className="mt-4 bg-white py-4 px-8 rounded-xl border-2 border-white/80 active:bg-gray-100"
          >
            <Text className="text-gray-900 font-bold text-center text-base">
              Scan next ticket
            </Text>
            <Text className="text-gray-600 text-sm text-center mt-1">
              Tap to continue
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    position: "absolute",
    left: 24,
    right: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: 260,
    height: 260,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  bottomPanel: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 0,
    alignItems: "center",
  },
});
