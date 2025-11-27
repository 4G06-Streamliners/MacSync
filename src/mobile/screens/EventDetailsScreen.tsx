import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";

export function EventDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { event }: any = route.params;
  const { user } = useAuth();

  const handlePurchase = async () => {
    const resp = await fetch("http://localhost:3004/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, eventId: event.id }),
    });

    const data = await resp.json();
    if (data.url) Linking.openURL(data.url);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* BACK BUTTON */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#7A003C" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* HERO IMAGE */}
        <Image source={{ uri: event.image }} style={styles.heroImage} />

        {/* CONTENT */}
        <View style={styles.content}>
          <Text style={styles.title}>{event.name}</Text>
          <Text style={styles.subtitle}>{event.date}</Text>
          <Text style={styles.subtitle}>{event.location}</Text>

          <Text style={styles.description}>
            {event.description ??
              "Join us for an unforgettable event filled with excitement, energy, and Marauder spirit!"}
          </Text>

          <TouchableOpacity style={styles.purchaseButton} onPress={handlePurchase}>
            <Text style={styles.purchaseButtonText}>
              Purchase Ticket ({event.price})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const Maroon = "#7A003C";

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  container: {
    flex: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 6, // not too large, safe area handles the rest
    marginBottom: 4,
  },
  backText: {
    fontSize: 18,
    color: Maroon,
    fontWeight: "600",
    marginLeft: 4,
  },
  heroImage: {
    width: "100%",
    height: 250,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Maroon,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
    color: "#777",
  },
  description: {
    marginTop: 14,
    fontSize: 16,
    lineHeight: 22,
    color: "#444",
  },
  purchaseButton: {
    marginTop: 26,
    backgroundColor: Maroon,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  purchaseButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
