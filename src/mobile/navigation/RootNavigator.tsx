import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';

import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { TestPaymentScreen } from '../screens/TestPaymentScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PaymentSuccessScreen } from '../screens/PaymentSuccessScreen';
import { PaymentCancelScreen } from '../screens/PaymentCancelScreen';
import { EventDetailsScreen } from '../screens/EventDetailsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Bottom Tab Navigator
 */
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName:
            | 'home'
            | 'home-outline'
            | 'person'
            | 'person-outline'
            | 'card'
            | 'card-outline'
            | 'ellipse' = 'ellipse';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Payments') {
            iconName = focused ? 'card' : 'card-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#a855f7',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Team D' }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

/**
 * MAIN ROOT NAVIGATOR
 * - Handles login vs main
 * - Handles deep links to success/cancel
 */
export function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        // If user is NOT logged in → show login
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          {/* MAIN APP */}
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen name="EventDetails" component={EventDetailsScreen} />

          {/* DEEP LINK SCREENS */}
          <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
          {/* <Stack.Screen name="PaymentCancel" component={PaymentCancelScreen} /> */}
        </>
      )}
    </Stack.Navigator>
  );
}
