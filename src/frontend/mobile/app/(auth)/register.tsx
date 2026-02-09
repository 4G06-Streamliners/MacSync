import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

const PROGRAM_OPTIONS = [
  'Computer Science',
  'Software Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Business',
  'Health Sciences',
  'Humanities',
  'Other',
];

const formatPhoneInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(
    4,
    7,
  )}-${digits.slice(7, 11)}`;
};

export default function RegisterScreen() {
  const router = useRouter();
  const { status, pendingEmail, completeRegistration } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [program, setProgram] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPrograms, setShowPrograms] = useState(false);

  const formattedPhone = formatPhoneInput(phone);
  const isNameValid = /^[A-Za-z-]+$/.test(name.trim());
  const phoneDigits = phone.replace(/\D/g, '');
  const isPhoneValid = /^\d{10,15}$/.test(phoneDigits);
  const isProgramValid = program.trim().length > 0;

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/(tabs)');
    }
    if (status === 'unauthenticated') {
      router.replace('/(auth)/login');
    }
  }, [status, router]);

  const handleSubmit = async () => {
    if (!/^[A-Za-z-]+$/.test(name.trim())) {
      Alert.alert('Invalid name', 'Use letters and hyphens only.');
      return;
    }
    const normalizedPhone = phoneDigits;
    if (!/^\d{10,15}$/.test(normalizedPhone)) {
      Alert.alert(
        'Invalid phone number',
        'Use 10 digits or include a valid country code.',
      );
      return;
    }
    if (!program.trim()) {
      Alert.alert('Missing program', 'Please select your program.');
      return;
    }

    setSubmitting(true);
    try {
      await completeRegistration({
        name: name.trim(),
        phone: normalizedPhone,
        program: program.trim(),
      });
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F5F5F7] px-6 justify-center">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-gray-900">
          Complete your profile
        </Text>
        <Text className="text-gray-500 mt-2">
          Tell us a bit more to finish setting up your account.
        </Text>
      </View>

      <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <Text className="text-sm font-medium text-gray-700 mb-2">Email</Text>
        <TextInput
          value={pendingEmail ?? ''}
          editable={false}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-500"
        />

        <Text className="text-sm font-medium text-gray-700 mt-4 mb-2">
          Name {isNameValid && name.trim() ? '✅' : ''}
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Jane-Doe"
          placeholderTextColor="#C7CBD1"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm"
        />

        <Text className="text-sm font-medium text-gray-700 mt-4 mb-2">
          Phone number {isPhoneValid && phoneDigits ? '✅' : ''}
        </Text>
        <TextInput
          value={formattedPhone}
          onChangeText={(value) => setPhone(value)}
          placeholder="(905) 555-1234"
          keyboardType="phone-pad"
          placeholderTextColor="#C7CBD1"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm"
        />

        <Text className="text-sm font-medium text-gray-700 mt-4 mb-2">
          Program {isProgramValid ? '✅' : ''}
        </Text>
        <Pressable
          onPress={() => setShowPrograms(true)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50"
        >
          <Text className={`text-sm ${program ? 'text-gray-900' : 'text-gray-400'}`}>
            {program || 'Select your program'}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          className="mt-5 py-3 bg-maroon rounded-xl active:bg-maroon-dark disabled:opacity-60"
        >
          <Text className="text-center text-sm font-semibold text-white">
            {submitting ? 'Saving...' : 'Finish registration'}
          </Text>
        </Pressable>
      </View>

      <Modal visible={showPrograms} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/40 justify-center items-center px-6"
          onPress={() => setShowPrograms(false)}
        >
          <Pressable
            className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-base font-bold text-gray-900 px-5 pt-5 pb-3">
              Select program
            </Text>
            <FlatList
              data={PROGRAM_OPTIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setProgram(item);
                    setShowPrograms(false);
                  }}
                  className="px-5 py-3.5 border-t border-gray-100"
                >
                  <Text className="text-sm font-semibold text-gray-900">
                    {item}
                  </Text>
                </Pressable>
              )}
            />
            <Pressable
              onPress={() => setShowPrograms(false)}
              className="border-t border-gray-200 py-3.5"
            >
              <Text className="text-center text-sm font-medium text-gray-500">
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
