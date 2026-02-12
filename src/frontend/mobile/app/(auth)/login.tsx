import { useEffect, useMemo, useState } from 'react';
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
import { useAuth } from '../_context/AuthContext';

type Step = 'email' | 'password' | 'otp' | 'register';

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

export default function LoginScreen() {
  const router = useRouter();
  const {
    status,
    pendingEmail,
    checkEmail,
    login,
    requestOtp,
    confirmCode,
    completeRegistration,
  } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [program, setProgram] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPrograms, setShowPrograms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (status === 'needsRegistration') {
      if (pendingEmail) {
        setEmail(pendingEmail);
      }
      setStep('register');
    }
  }, [status, pendingEmail]);

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedFirstName = firstName.replace(/\s+/g, ' ').trim();
  const normalizedLastName = lastName.replace(/\s+/g, ' ').trim();
  const phoneDigits = phone.replace(/\D/g, '');
  const namePattern = /^[A-Za-z-]+$/;
  const isFirstNameValid =
    normalizedFirstName.length > 0 && namePattern.test(normalizedFirstName);
  const isLastNameValid =
    normalizedLastName.length > 0 && namePattern.test(normalizedLastName);
  const isPhoneValid = /^\d{10,15}$/.test(phoneDigits);
  const isProgramValid = program.trim().length > 0;
  const isPasswordComplex =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const stepTitle = useMemo(() => {
    if (step === 'password') return 'Welcome back';
    if (step === 'otp') return 'Verify your email';
    if (step === 'register') return 'Complete your profile';
    return 'Welcome to MacSync';
  }, [step]);

  const stepSubtitle = useMemo(() => {
    if (step === 'password') return 'Enter your password to continue.';
    if (step === 'otp') return `Enter the code sent to ${normalizedEmail}.`;
    if (step === 'register') return 'Create your password and profile.';
    return 'Sign in with your McMaster email to continue.';
  }, [step, normalizedEmail]);

  const handleEmailContinue = async () => {
    if (!normalizedEmail.endsWith('@mcmaster.ca')) {
      const message = 'Please use your @mcmaster.ca email.';
      setErrorMessage(message);
      Alert.alert('Invalid email', message);
      return;
    }

    setSubmitting(true);
    try {
      const isRegistered = await checkEmail(normalizedEmail);
      setErrorMessage('');
      if (isRegistered) {
        setStep('password');
      } else {
        await requestOtp(normalizedEmail);
        setStep('otp');
      }
    } catch (error: any) {
      const message = error.message || 'Failed to continue.';
      setErrorMessage(message);
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!password) {
      const message = 'Password is required.';
      setErrorMessage(message);
      Alert.alert('Missing password', message);
      return;
    }
    setSubmitting(true);
    try {
      await login(normalizedEmail, password);
      setErrorMessage('');
      router.replace('/(tabs)');
    } catch (error: any) {
      const message = error.message || 'Login failed.';
      setErrorMessage(message);
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length !== 6) {
      const message = 'Enter the 6-digit verification code.';
      setErrorMessage(message);
      Alert.alert('Invalid code', message);
      return;
    }
    setSubmitting(true);
    try {
      await confirmCode(normalizedEmail, otp.trim());
      setErrorMessage('');
      setStep('register');
    } catch (error: any) {
      const message = error.message || 'Failed to verify code.';
      setErrorMessage(message);
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!isFirstNameValid || !isLastNameValid) {
      const message = 'Use letters and hyphens only.';
      setErrorMessage(message);
      Alert.alert('Invalid name', message);
      return;
    }
    if (!isPhoneValid) {
      const message = 'Use 10 digits or include a valid country code.';
      setErrorMessage(message);
      Alert.alert('Invalid phone number', message);
      return;
    }
    if (!isProgramValid) {
      const message = 'Please select your program.';
      setErrorMessage(message);
      Alert.alert('Missing program', message);
      return;
    }
    if (!isPasswordComplex) {
      const message =
        'Password must be 8+ chars with upper, lower, and number.';
      setErrorMessage(message);
      Alert.alert('Weak password', message);
      return;
    }
    if (!passwordsMatch) {
      const message = 'Passwords do not match.';
      setErrorMessage(message);
      Alert.alert('Password mismatch', message);
      return;
    }

    setSubmitting(true);
    try {
      await completeRegistration({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        phone: phoneDigits,
        program: program.trim(),
        password,
        confirmPassword,
      });
      setErrorMessage('');
      router.replace('/(tabs)');
    } catch (error: any) {
      const message = error.message || 'Failed to complete registration.';
      setErrorMessage(message);
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F5F5F7] px-6 justify-center">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-gray-900">{stepTitle}</Text>
        <Text className="text-gray-500 mt-2">{stepSubtitle}</Text>
      </View>

      <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {step === 'email' && (
          <>
            <Text className="text-sm font-medium text-gray-700 mb-2">Email</Text>
            <TextInput
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (errorMessage) setErrorMessage('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="name@mcmaster.ca"
              placeholderTextColor="#C7CBD1"
              returnKeyType="next"
              blurOnSubmit
              onSubmitEditing={handleEmailContinue}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm"
            />
          </>
        )}

        {step === 'password' && (
          <>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (errorMessage) setErrorMessage('');
              }}
              secureTextEntry
              placeholder="Enter your password"
              placeholderTextColor="#C7CBD1"
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={handlePasswordLogin}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm"
            />
          </>
        )}

        {step === 'otp' && (
          <>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Verification code
            </Text>
            <TextInput
              value={otp}
              onChangeText={(value) => {
                setOtp(value);
                if (errorMessage) setErrorMessage('');
              }}
              keyboardType="number-pad"
              placeholder="123456"
              maxLength={6}
              placeholderTextColor="#C7CBD1"
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={handleVerifyOtp}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm tracking-widest text-center"
            />
          </>
        )}

        {step === 'register' && (
          <>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              First name {isFirstNameValid ? '✅' : ''}
            </Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Jane"
              placeholderTextColor="#C7CBD1"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm"
            />

            <Text className="text-sm font-medium text-gray-700 mt-4 mb-2">
              Last name {isLastNameValid ? '✅' : ''}
            </Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Doe"
              placeholderTextColor="#C7CBD1"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm"
            />

            <Text className="text-sm font-medium text-gray-700 mt-4 mb-2">
              Phone number {isPhoneValid ? '✅' : ''}
            </Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
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
              <Text
                className={`text-sm ${
                  program ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {program || 'Select your program'}
              </Text>
            </Pressable>

            <Text className="text-sm font-medium text-gray-700 mt-4 mb-2">
              Password {isPasswordComplex ? '✅' : ''}
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Create a password"
              placeholderTextColor="#C7CBD1"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm"
            />

            <Text className="text-sm font-medium text-gray-700 mt-4 mb-2">
              Confirm password {passwordsMatch ? '✅' : ''}
            </Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Re-enter password"
              placeholderTextColor="#C7CBD1"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm"
            />
          </>
        )}

        {!!errorMessage && (
          <Text className="text-xs text-red-600 mt-2">{errorMessage}</Text>
        )}

        <Pressable
          onPress={() => {
            if (step === 'email') return handleEmailContinue();
            if (step === 'password') return handlePasswordLogin();
            if (step === 'otp') return handleVerifyOtp();
            return handleRegister();
          }}
          disabled={submitting}
          className="mt-5 py-3 bg-maroon rounded-xl active:bg-maroon-dark disabled:opacity-60"
        >
          <Text className="text-center text-sm font-semibold text-white">
            {submitting
              ? 'Please wait...'
              : step === 'email'
                ? 'Continue'
                : step === 'password'
                  ? 'Login'
                  : step === 'otp'
                    ? 'Verify code'
                    : 'Finish registration'}
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
