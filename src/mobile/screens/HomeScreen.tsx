import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
//import { TeamDPlaceholder } from '@teamd/mobile-components';

/**
 * Home Screen - demonstrates using Team D components
 *
 * This screen imports the TeamDPlaceholder component from the published @teamd/mobile-components package,
 * showing how the standalone app can use the same components as mobile app
 */
export function HomeScreen() {
  const { user, token, instances } = useAuth();

  useEffect(() => {
    console.log('[HomeScreen] Platform:', Platform.OS);
    console.log('[HomeScreen] Auth state:', {
      hasUser: !!user,
      userEmail: user?.email,
      userId: user?.id,
      hasToken: !!token,
      instancesCount: instances?.length,
    });
  }, [user, token, instances]);

  return (
    <View style={styles.container}>
      {/* <TeamDPlaceholder
        user={user!}
        token={token!}
        instances={instances}
      /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
});
