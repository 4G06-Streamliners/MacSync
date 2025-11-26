import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export function SignupScreen() {
  const { signups, refreshSignups, instances } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Sign-ups</Text>
        <Text style={styles.subtitle}>Review your bus, table, and RSVP statuses.</Text>
      </View>

      <TouchableOpacity style={styles.refreshButton} onPress={refreshSignups}>
        <Text style={styles.refreshButtonText}>Refresh Status</Text>
      </TouchableOpacity>

      <Section title="Bus Sign-ups" records={signups?.bus ?? []} instances={instances} emptyCopy="No bus signups yet." />
      <Section title="Table Sign-ups" records={signups?.tables ?? []} instances={instances} emptyCopy="No table reservations yet." />
      <Section title="RSVPs" records={signups?.rsvps ?? []} instances={instances} emptyCopy="No RSVPs submitted yet." />
    </ScrollView>
  );
}

function Section({
  title,
  records,
  emptyCopy,
  instances,
}: {
  title: string;
  records: Array<{ id: number; instanceId: number; status: string; type: 'bus' | 'table' | 'rsvp'; routeId?: number; tableId?: number; seatsRequested?: number }>;
  emptyCopy: string;
  instances: { id: number; name: string }[];
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {records.length === 0 ? (
        <Text style={styles.emptyText}>{emptyCopy}</Text>
      ) : (
        records.map((record) => {
          const instanceName = instances.find((inst) => inst.id === record.instanceId)?.name ?? `Instance #${record.instanceId}`;
          return (
            <View key={`${record.type}-${record.id}`} style={styles.card}>
              <Text style={styles.cardTitle}>{instanceName}</Text>
              <Text style={styles.cardDetail}>Status: {record.status}</Text>
              {record.type === 'bus' && <Text style={styles.cardDetail}>Route #{record.routeId}</Text>}
              {record.type === 'table' && (
                <Text style={styles.cardDetail}>
                  Table #{record.tableId} • {record.seatsRequested} seat(s)
                </Text>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  refreshButton: {
    alignSelf: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    marginBottom: 16,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#111827',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
  },
  card: {
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: {
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cardDetail: {
    color: '#4b5563',
    fontSize: 13,
  },
});


