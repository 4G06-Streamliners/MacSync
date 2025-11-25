import React, { useState } from 'react'
import { View, Text, Button, StyleSheet, Alert } from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import { useConfirmPayment } from '@stripe/stripe-react-native'

export function TestPaymentScreen() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const { confirmPayment } = useConfirmPayment()

  const handlePay = async () => {
    setLoading(true)
    const userId = user?.id || 1
    try {
      // Create payment intent on server
      const resp = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, eventId: 1 }),
      })

      const data = await resp.json()
      if (!resp.ok) {
        Alert.alert('Error', data?.error?.message || 'Failed to create payment')
        setLoading(false)
        return
      }

      const { clientSecret, stripePaymentIntentId } = data

      // If stripe-react-native is configured, confirm the payment on device
      if (confirmPayment) {
        const { error, paymentIntent } = await confirmPayment(clientSecret, {
          type: 'Card',
        } as any)

        if (error) {
          // If confirm fails locally, fall back to simulate endpoint for local testing
          Alert.alert('Payment failed', error.message || 'Payment confirmation failed')
        } else if (paymentIntent) {
          Alert.alert('Payment Success', 'Payment was confirmed. Waiting for webhook to finalize.')
        }
      } else {
        // Fallback: call simulate_confirm endpoint (useful in dev before mobile SDK is installed)
        const confirmResp = await fetch('/api/payments/simulate_confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stripePaymentIntentId }),
        })

        const confirmData = await confirmResp.json()
        if (!confirmResp.ok) {
          Alert.alert('Error', confirmData?.error?.message || 'Failed to confirm payment')
          setLoading(false)
          return
        }

        Alert.alert('Payment Success', 'Payment completed and attendee created (simulated)')
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MacSync Test Event</Text>
      <Text style={styles.price}>Price: $5.00</Text>
      <View style={styles.button}>
        <Button title={loading ? 'Processing…' : 'Pay Now'} onPress={handlePay} disabled={loading} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  price: { fontSize: 16, marginBottom: 16 },
  button: { width: '60%' },
})
