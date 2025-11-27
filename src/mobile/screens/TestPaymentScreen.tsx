import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, Platform, Linking } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { loadStripe } from '@stripe/stripe-js';

const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

const API_BASE = 'http://localhost:3004';

export function TestPaymentScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);

    const userId = user?.id || 1;
    const eventId = 1;

    try {
      // 1️ REQUEST CHECKOUT SESSION
      const sessionResp = await fetch(`${API_BASE}/api/payments/create_checkout_session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, eventId }),
      });

      const session = await sessionResp.json();

      if (!session?.url) {
        Alert.alert("Error", "Invalid checkout session");
        return;
      }

      if (Platform.OS === "web") {
        const stripe = await stripePromise;
        if (!stripe) throw new Error("Stripe JS failed to load");

        window.location.href = session.url;
        return;
      }

      await Linking.openURL(session.url);
      return;

    } catch (err: any) {
      Alert.alert("Error", err?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MacSync Test Event</Text>
      <Text style={styles.price}>Price: $10.00</Text>

      <View style={styles.button}>
        <Button
          title={loading ? 'Processing…' : 'Pay Now'}
          onPress={handlePay}
          disabled={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  price: { fontSize: 16, marginBottom: 16 },
  button: { width: '50%' },
});

// import React, { useState } from 'react';
// import { View, Text, Button, StyleSheet, Alert, Platform } from 'react-native';
// import { useAuth } from '../contexts/AuthContext';
// import { loadStripe } from '@stripe/stripe-js';

// const STRIPE_PUBLISHABLE_KEY = 'pk_test_51QnSlqAOwjDlyX8cf3Tdqzgz62mmpWWsVi1GLWRxuNjrqAu05iI3xG8jU6VPRMHy04F2YRUtx1H1DUakrMGHr1CL00H8kBcmRB'

// const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

// const API_BASE = 'http://localhost:3004'
  

// export function TestPaymentScreen() {
//   const { user } = useAuth();
//   const [loading, setLoading] = useState(false);

//   const handlePay = async () => {
//     setLoading(true);

//     const userId = user?.id || 1;
//     const eventId = 1; // FIXED: add eventId

//     try {
//       console.log(Platform.OS);
//       if (Platform.OS === 'web' || Platform.OS === 'ios' || Platform.OS === 'android') {
//         const stripe = await stripePromise;
//         if (!stripe) throw new Error("Stripe failed");

//         // Create checkout session
//         const sessionResp = await fetch(`${API_BASE}/api/payments/create_checkout_session`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ userId, eventId }),
//         });

//         const session = await sessionResp.json();

//         if (!session?.url) {
//           Alert.alert("Error", "Invalid session response");
//           return;
//         }


//         window.location.href = session.url;
//         return;
//       }

      
//       const confirmResp = await fetch(`${API_BASE}/api/payments/simulate_confirm`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ stripePaymentIntentId }),
//       });

//       const conf = await confirmResp.json();

//       if (!confirmResp.ok) {
//         Alert.alert('Error', conf?.error?.message || 'Failed to confirm payment');
//       } else {
//         Alert.alert('Success', 'Payment confirmed (simulated)');
//       }
//     } catch (err: any) {
//       Alert.alert('Error', err?.message || 'Unexpected error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>MacSync Test Event</Text>
//       <Text style={styles.price}>Price: $5.00</Text>

//       <View style={styles.button}>
//         <Button
//           title={loading ? 'Processing…' : 'Pay Now'}
//           onPress={handlePay}
//           disabled={loading}
//         />
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
//   title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
//   price: { fontSize: 16, marginBottom: 16 },
//   button: { width: '60%' },
// });
