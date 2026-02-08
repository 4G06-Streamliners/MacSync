import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { requestCode } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized.endsWith('@mcmaster.ca')) {
      Alert.alert('Invalid email', 'Please use your @mcmaster.ca email.');
      return;
    }

    setSubmitting(true);
    try {
      await requestCode(normalized);
      router.push({ pathname: '/(auth)/verify', params: { email: normalized } });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F5F5F7] px-6 justify-center">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-gray-900">Welcome back</Text>
        <Text className="text-gray-500 mt-2">
          Sign in with your McMaster email to continue.
        </Text>
      </View>

      <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <Text className="text-sm font-medium text-gray-700 mb-2">Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="name@mcmaster.ca"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm"
        />

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          className="mt-5 py-3 bg-maroon rounded-xl active:bg-maroon-dark disabled:opacity-60"
        >
          <Text className="text-center text-sm font-semibold text-white">
            {submitting ? 'Sending code...' : 'Send verification code'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
