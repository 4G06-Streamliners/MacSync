import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Modal,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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
  /** Login only — never reused on the registration form */
  const [loginPassword, setLoginPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [program, setProgram] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showPrograms, setShowPrograms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  /** True after user taps Create account — then show field-level errors */
  const [registerAttempted, setRegisterAttempted] = useState(false);

  useEffect(() => {
    if (status !== 'needsRegistration') return;
    if (pendingEmail) setEmail(pendingEmail);
    setFirstName('');
    setLastName('');
    setPhone('');
    setProgram('');
    setRegPassword('');
    setRegConfirmPassword('');
    setRegisterAttempted(false);
    setErrorMessage('');
    setOtp('');
    setStep('register');
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
    regPassword.length >= 8 &&
    /[A-Z]/.test(regPassword) &&
    /[a-z]/.test(regPassword) &&
    /\d/.test(regPassword);
  const passwordsMatch =
    regPassword.length > 0 && regPassword === regConfirmPassword;

  const stepTitle = useMemo(() => {
    if (step === 'password') return 'Welcome back';
    if (step === 'otp') return 'Verify your email';
    if (step === 'register') return 'Create your account';
    return 'Welcome to MacSync';
  }, [step]);

  const stepSubtitle = useMemo(() => {
    if (step === 'password') return 'Enter your password to continue.';
    if (step === 'otp') return `Enter the code sent to ${normalizedEmail}.`;
    if (step === 'register')
      return 'Create your password and complete your profile.';
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
    if (!loginPassword) {
      const message = 'Password is required.';
      setErrorMessage(message);
      Alert.alert('Missing password', message);
      return;
    }
    setSubmitting(true);
    try {
      await login(normalizedEmail, loginPassword);
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
      setRegisterAttempted(false);
      setFirstName('');
      setLastName('');
      setPhone('');
      setProgram('');
      setRegPassword('');
      setRegConfirmPassword('');
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
    setRegisterAttempted(true);
    setErrorMessage('');

    if (
      !isFirstNameValid ||
      !isLastNameValid ||
      !isPhoneValid ||
      !isProgramValid ||
      !isPasswordComplex ||
      !passwordsMatch
    ) {
      return;
    }

    setSubmitting(true);
    try {
      await completeRegistration({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        phone: phoneDigits,
        program: program.trim(),
        password: regPassword,
        confirmPassword: regConfirmPassword,
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

  const inputClass =
    'w-full px-4 py-3.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900';

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F5F5F7]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: step === 'register' ? 48 : 0,
          paddingBottom: step === 'register' ? 48 : 0,
          justifyContent: step === 'register' ? 'flex-start' : 'center',
        }}
      >
        <View className={step === 'register' ? 'mb-6' : 'mb-8'}>
          <Text className="text-3xl font-bold text-gray-900">{stepTitle}</Text>
          <Text className="text-gray-500 mt-2 leading-6">{stepSubtitle}</Text>
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
              value={loginPassword}
              onChangeText={(value) => {
                setLoginPassword(value);
                if (errorMessage) setErrorMessage('');
              }}
              secureTextEntry
              placeholder="Enter your password"
              placeholderTextColor="#C7CBD1"
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={handlePasswordLogin}
              textContentType="password"
              autoComplete="password"
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
            <View className="mb-5 px-3 py-3 bg-[#FAFAFA] rounded-xl border border-gray-100">
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Verified email
              </Text>
              <Text className="text-sm font-semibold text-gray-900 mt-1">
                {pendingEmail || normalizedEmail}
              </Text>
            </View>

            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Profile
            </Text>

            <RequiredLabel>First name</RequiredLabel>
            <TextInput
              value={firstName}
              onChangeText={(v) => {
                setFirstName(v);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="Jane"
              placeholderTextColor="#C7CBD1"
              autoCapitalize="words"
              autoComplete="off"
              className={`${inputClass} ${registerAttempted && !isFirstNameValid ? 'border-red-300' : ''}`}
            />
            {registerAttempted && !isFirstNameValid ? (
              <FieldError>Use letters and hyphens only.</FieldError>
            ) : (
              <View className="mb-4" />
            )}

            <RequiredLabel>Last name</RequiredLabel>
            <TextInput
              value={lastName}
              onChangeText={(v) => {
                setLastName(v);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="Doe"
              placeholderTextColor="#C7CBD1"
              autoCapitalize="words"
              autoComplete="off"
              className={`${inputClass} ${registerAttempted && !isLastNameValid ? 'border-red-300' : ''}`}
            />
            {registerAttempted && !isLastNameValid ? (
              <FieldError>Use letters and hyphens only.</FieldError>
            ) : (
              <View className="mb-4" />
            )}

            <RequiredLabel>Phone number</RequiredLabel>
            <TextInput
              value={phone}
              onChangeText={(v) => {
                setPhone(v);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="Phone number"
              keyboardType="phone-pad"
              placeholderTextColor="#C7CBD1"
              autoComplete="off"
              textContentType="telephoneNumber"
              className={`${inputClass} ${registerAttempted && !isPhoneValid ? 'border-red-300' : ''}`}
            />
            {registerAttempted && !isPhoneValid ? (
              <FieldError>Use 10 digits or a number with country code.</FieldError>
            ) : (
              <View className="mb-4" />
            )}

            <RequiredLabel>Program</RequiredLabel>
            <Pressable
              onPress={() => setShowPrograms(true)}
              className={`w-full px-4 py-3.5 border rounded-xl bg-white flex-row items-center justify-between active:bg-gray-50 ${
                registerAttempted && !isProgramValid
                  ? 'border-red-300'
                  : 'border-gray-200'
              }`}
            >
              <Text
                className={`text-sm ${program ? 'text-gray-900 font-medium' : 'text-gray-400'}`}
              >
                {program || 'Tap to select'}
              </Text>
              <Text className="text-gray-300 text-xl font-light">›</Text>
            </Pressable>
            {registerAttempted && !isProgramValid ? (
              <FieldError>Select your program.</FieldError>
            ) : (
              <View className="mb-4" />
            )}

            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 mt-2">
              Password
            </Text>

            {registerAttempted && !isPasswordComplex ? (
              <View className="mb-3 p-3 rounded-xl bg-red-50 border border-red-100">
                <Text className="text-xs text-red-800 leading-5">
                  Use at least 8 characters with uppercase, lowercase, and a number.
                </Text>
              </View>
            ) : null}

            <RequiredLabel>Password</RequiredLabel>
            <TextInput
              value={regPassword}
              onChangeText={(v) => {
                setRegPassword(v);
                if (errorMessage) setErrorMessage('');
              }}
              secureTextEntry
              placeholder="Create a password"
              placeholderTextColor="#C7CBD1"
              textContentType="none"
              autoComplete="off"
              autoCorrect={false}
              {...(Platform.OS === 'android'
                ? { importantForAutofill: 'no' }
                : {})}
              className={`${inputClass} ${registerAttempted && !isPasswordComplex ? 'border-red-300' : ''}`}
            />
            <RequiredLabel>Confirm password</RequiredLabel>
            <TextInput
              value={regConfirmPassword}
              onChangeText={(v) => {
                setRegConfirmPassword(v);
                if (errorMessage) setErrorMessage('');
              }}
              secureTextEntry
              placeholder="Re-enter password"
              placeholderTextColor="#C7CBD1"
              textContentType="none"
              autoComplete="off"
              autoCorrect={false}
              {...(Platform.OS === 'android'
                ? { importantForAutofill: 'no' }
                : {})}
              className={`${inputClass} ${registerAttempted && !passwordsMatch ? 'border-red-300' : ''}`}
            />
            {registerAttempted && !passwordsMatch ? (
              <FieldError>Passwords must match.</FieldError>
            ) : (
              <View className="mb-4" />
            )}
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
                    : 'Create account'}
          </Text>
        </Pressable>
      </View>
      </ScrollView>

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
    </KeyboardAvoidingView>
  );
}

function RequiredLabel({ children }: { children: string }) {
  return (
    <Text className="text-sm font-semibold text-gray-800 mb-1.5">
      {children}
      <Text className="text-[#B91C1C]"> *</Text>
    </Text>
  );
}

function FieldError({ children }: { children: string }) {
  return (
    <Text className="text-xs text-red-600 mt-1.5 mb-4">{children}</Text>
  );
}
