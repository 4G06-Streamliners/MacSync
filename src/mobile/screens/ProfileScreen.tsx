import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export function ProfileScreen() {
  const { user, instances, logout } = useAuth();
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const handleLogout = async () => {
    await logout();
  };

  // Fetch user’s purchased events
  useEffect(() => {
    if (!user?.id) return;

    const loadEvents = async () => {
      try {
        const resp = await fetch(
          `http://localhost:3004/api/users/${user.id}/events`
        );
        const data = await resp.json();
        setMyEvents(data.events || []);
      } catch (err) {
        console.log("Failed loading events", err);
      } finally {
        setLoadingEvents(false);
      }
    };

    loadEvents();
  }, [user]);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      {/* User Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Information</Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>User ID:</Text>
          <Text style={styles.value}>{user?.id}</Text>
        </View>
      </View>

      {/* My Events */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Events</Text>

        {loadingEvents ? (
          <ActivityIndicator size="small" color="#7c2d12" />
        ) : myEvents.length === 0 ? (
          <Text style={styles.emptyText}>
            You haven’t registered for any events yet.
          </Text>
        ) : (
          myEvents.map((ev) => (
            <View key={ev.attendeeId} style={styles.eventCard}>
              <Text style={styles.eventName}>{ev.name}</Text>
              <Text style={styles.eventInfo}>
                {ev.location}
              </Text>
              <Text style={styles.eventInfo}>
                {new Date(ev.date).toLocaleString()}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Instances */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instances</Text>
        <Text style={styles.value}>
          You have access to {instances.length} instance
          {instances.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Development Mode */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Development Mode</Text>
        <Text style={styles.infoText}>
          You are running Team D's mobile app in standalone development mode.
        </Text>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfdfd' },

  header: {
    padding: 24,
    backgroundColor: '#7c2d12',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 28, fontWeight: 'bold', color: 'white' },

  section: { backgroundColor: '#ffffff', padding: 16, marginTop: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7c2d12',
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomColor: '#f3f4f6',
    borderBottomWidth: 1,
  },
  label: { fontSize: 14, color: '#6b7280' },
  value: { fontSize: 14, color: '#111827', fontWeight: '500' },

  eventCard: {
    padding: 12,
    backgroundColor: '#fdf4f0',
    borderColor: '#7c2d12',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
  },
  eventName: { fontSize: 16, fontWeight: '700', color: '#7c2d12' },
  eventInfo: { fontSize: 14, color: '#4b5563', marginTop: 2 },

  emptyText: { color: '#6b7280', fontStyle: 'italic' },

  infoText: { fontSize: 14, color: '#6b7280', lineHeight: 20 },

  logoutButton: {
    backgroundColor: '#b91c1c',
    borderRadius: 8,
    padding: 16,
    margin: 24,
    alignItems: 'center',
  },
  logoutButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
