import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const MOCK_EVENTS = [
  {
    id: 1,
    name: "MacSync Test Event",
    price: "$10",
    image:
      "https://images.unsplash.com/photo-1515169067865-5387ec356754?w=1200",
    date: "Nov 30, 2025",
    location: "McMaster Student Centre",
  },
  {
    id: 2,
    name: "Engineering Formal",
    price: "$55",
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200",
    date: "Dec 8, 2025",
    location: "Cottontail Ballroom",
  },
  {
    id: 3,
    name: "Hack the Hammer",
    price: "FREE",
    image:
      "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=1200",
    date: "Jan 12, 2026",
    location: "Burke Science Building",
  },
];

export function HomeScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Upcoming Events</Text>

      <FlatList
        data={MOCK_EVENTS}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("EventDetails", { event: item })}
          >
            <Image
              source={{ uri: item.image }}
              style={styles.image}
            />

            <View style={styles.cardContent}>
              <Text style={styles.title}>{item.name}</Text>

              <Text style={styles.info}>{item.date}</Text>
              <Text style={styles.info}>{item.location}</Text>

              <Text style={styles.priceTag}>{item.price}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const McMasterMaroon = "#7A003C";
const Gold = "#FDBF57";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F6F6",
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  header: {
    fontSize: 26,
    fontWeight: "700",
    color: McMasterMaroon,
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 170,
  },
  cardContent: {
    padding: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: McMasterMaroon,
    marginBottom: 6,
  },
  info: {
    fontSize: 14,
    color: "#555",
  },
  priceTag: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: McMasterMaroon,
    color: "white",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: "600",
  },
});
