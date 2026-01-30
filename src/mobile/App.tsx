import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './contexts/AuthContext';
import { RootNavigator } from './navigation/RootNavigator';
import * as Linking from 'expo-linking';

export function App() {

  const linking = {
    prefixes: ['macsync://'],
    config: {
      screens: {
        PaymentSuccess: 'payment-success',
        Cancel: 'payment-cancel',
        Home: 'home',
        Main: 'main',
        Login: 'login'
      }
    }
  };

  return (
    <AuthProvider>
      <NavigationContainer linking={linking}>
        <StatusBar style="auto" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
