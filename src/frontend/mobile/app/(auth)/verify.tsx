import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function VerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { confirmCode } = useAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!email) {
      router.replace('/(auth)/login');
    }
  }, [email, router]);

  const handleSubmit = async () => {
    if (!email) return;
    if (code.trim().length !== 6) {
      Alert.alert('Invalid code', 'Enter the 6-digit verification code.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await confirmCode(String(email), code.trim());
      if (result === 'needsRegistration') {
        router.replace('/(auth)/register');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F5F5F7] px-6 justify-center">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-gray-900">Check your email</Text>
        <Text className="text-gray-500 mt-2">
          Enter the 6-digit code sent to {email}.
        </Text>
      </View>

      <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <Text className="text-sm font-medium text-gray-700 mb-2">Verification code</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          placeholder="123456"
          maxLength={6}
          placeholderTextColor="#C7CBD1"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm tracking-widest text-center"
        />

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          className="mt-5 py-3 bg-maroon rounded-xl active:bg-maroon-dark disabled:opacity-60"
        >
          <Text className="text-center text-sm font-semibold text-white">
            {submitting ? 'Verifying...' : 'Verify and continue'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
