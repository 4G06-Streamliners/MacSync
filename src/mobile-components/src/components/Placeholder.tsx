/**
 * Team D Placeholder Component
 *
 * Example component showing how to build Team D mobile components
 * that consume the Team D API and display data
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import type { TeamComponentProps } from '../types';
import { teamDInstances } from '../services/api';
import type { InstanceResponse } from '@large-event/api-types';

export function TeamDPlaceholder({ user, instances: passedInstances, token }: TeamComponentProps) {
  const [instances, setInstances] = useState<InstanceResponse[]>(passedInstances || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug logging for iOS/Android differences
  useEffect(() => {
    console.log('[TeamDPlaceholder] Props received:', {
      hasUser: !!user,
      userEmail: user?.email,
      userId: user?.id,
      hasToken: !!token,
      tokenLength: token?.length,
      instancesCount: passedInstances?.length,
    });
  }, [user, token, passedInstances]);

  // Sync instances when passedInstances prop changes
  useEffect(() => {
    if (passedInstances) {
      console.log('[TeamDPlaceholder] Syncing instances from props:', passedInstances.length);
      setInstances(passedInstances);
    }
  }, [passedInstances]);

  const loadInstances = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await teamDInstances.getInstances();
      setInstances(data.instances);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load instances');
      console.error('Error loading instances:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadInstances} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Team D Mobile Component</Text>
        <Text style={styles.subtitle}>Example Integration</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Authentication Status</Text>
        <View style={styles.card}>
          <Text style={styles.label}>User:</Text>
          <Text style={styles.value}>{user?.email || 'Not available'}</Text>

          <Text style={styles.label}>User ID:</Text>
          <Text style={styles.value}>{user?.id?.toString() || 'Not available'}</Text>

          <Text style={styles.label}>Token:</Text>
          <Text style={styles.value} numberOfLines={1}>
            {token ? `${token.substring(0, 30)}...` : 'Not available'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accessible Instances</Text>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {instances.map((instance) => (
          <View key={instance.id} style={styles.instanceCard}>
            <Text style={styles.instanceName}>{instance.name}</Text>
            <Text style={styles.instanceOrg}>
              {instance.ownerOrganization.acronym || instance.ownerOrganization.name}
            </Text>
            <View style={[styles.badge, { backgroundColor: getBadgeColor(instance.accessLevel) }]}>
              <Text style={styles.badgeText}>{instance.accessLevel}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.count}>Total: {instances.length} instances</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Package Information</Text>
        <View style={styles.card}>
          <Text style={styles.infoText}>
            📦 This component is from <Text style={styles.bold}>@teamd/mobile-components</Text>
          </Text>
          <Text style={styles.infoText}>
            🚀 Published to Verdaccio registry
          </Text>
          <Text style={styles.infoText}>
            ✅ Consumed by mobile app
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function getBadgeColor(accessLevel: string): string {
  switch (accessLevel) {
    case 'web_admin':
      return '#ef4444';
    case 'web_user':
      return '#3b82f6';
    case 'both':
      return '#10b981';
    default:
      return '#6b7280';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 24,
    backgroundColor: '#a855f7',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#e9d5ff',
  },
  section: {
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 8,
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  instanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  instanceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  instanceOrg: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  count: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  errorCard: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
    fontFamily: 'monospace',
  },
});
