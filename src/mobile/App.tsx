import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './contexts/AuthContext';
import { RootNavigator } from './navigation/RootNavigator';
import { StripeProvider } from '@stripe/stripe-react-native';

// STRIPE_PUBLISHABLE_KEY should be set in your environment (see src/mobile/ENV.md)
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';

/**
 * Team D Standalone Mobile App
 *
 * This is the standalone version of Team D's mobile app for independent development.
 * It includes its own navigation, authentication, and screens.
 *
 * For library mode (consumed by mobile app), see ../src/index.ts
 */
export function App() {
  return (
    <AuthProvider>
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
        <NavigationContainer>
          <StatusBar style="auto" />
          <RootNavigator />
        </NavigationContainer>
      </StripeProvider>
    </AuthProvider>
  );
}
