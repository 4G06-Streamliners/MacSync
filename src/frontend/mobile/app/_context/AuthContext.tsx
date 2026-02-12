import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getMe,
  checkEmail,
  loginWithPassword,
  requestVerificationCode,
  requestOtp,
  verifyCode,
  verifyOtp,
  registerProfile,
  type User,
} from '../_lib/api';
import { getAuthToken, setAuthToken } from '../_lib/auth';

type AuthStatus = 'loading' | 'unauthenticated' | 'needsRegistration' | 'authenticated';

interface AuthContextType {
  status: AuthStatus;
  user: User | null;
  pendingEmail: string | null;
  isAdmin: boolean;
  checkEmail: (email: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<void>;
  requestCode: (email: string) => Promise<void>;
  requestOtp: (email: string) => Promise<void>;
  confirmCode: (email: string, code: string) => Promise<'needsRegistration'>;
  completeRegistration: (data: {
    firstName: string;
    lastName: string;
    phone: string;
    program: string;
    password: string;
    confirmPassword?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  status: 'loading',
  user: null,
  pendingEmail: null,
  isAdmin: false,
  checkEmail: async () => false,
  login: async () => {},
  requestCode: async () => {},
  requestOtp: async () => {},
  confirmCode: async () => 'needsRegistration',
  completeRegistration: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

function isProfileComplete(user: User) {
  return Boolean(
    (user.firstName?.trim() || user.name?.trim()) &&
      user.lastName?.trim() &&
      user.phoneNumber?.trim() &&
      user.program?.trim(),
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      const me = await getMe();
      setUser(me);
      setStatus(isProfileComplete(me) ? 'authenticated' : 'needsRegistration');
    } catch (error) {
      await setAuthToken(null);
      setUser(null);
      setStatus('unauthenticated');
    }
  };

  useEffect(() => {
    async function init() {
      const token = await getAuthToken();
      if (!token) {
        setStatus('unauthenticated');
        return;
      }
      await refreshUser();
    }
    init();
  }, []);

  const checkEmailStatus = async (email: string) => {
    const result = await checkEmail(email);
    return result.isRegistered;
  };

  const login = async (email: string, password: string) => {
    const result = await loginWithPassword(email, password);
    await setAuthToken(result.token);
    setUser(result.user);
    setPendingEmail(null);
    setStatus('authenticated');
  };

  const requestCode = async (email: string) => {
    await requestVerificationCode(email);
  };

  const requestOtpCode = async (email: string) => {
    await requestOtp(email);
  };

  const confirmCode = async (email: string, code: string) => {
    const result = await verifyOtp(email, code);
    await setAuthToken(result.token);
    setPendingEmail(email);
    setStatus('needsRegistration');
    return 'needsRegistration';
  };

  const completeRegistration = async (data: {
    firstName: string;
    lastName: string;
    phone: string;
    program: string;
    password: string;
    confirmPassword?: string;
  }) => {
    const result = await registerProfile(data);
    await setAuthToken(result.token);
    setUser(result.user);
    setPendingEmail(null);
    setStatus('authenticated');
  };

  const logout = async () => {
    await setAuthToken(null);
    setUser(null);
    setPendingEmail(null);
    setStatus('unauthenticated');
  };

  const isAdmin =
    user?.isSystemAdmin === true || (user?.roles?.includes('Admin') ?? false);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        pendingEmail,
        isAdmin,
        checkEmail: checkEmailStatus,
        login,
        requestCode,
        requestOtp: requestOtpCode,
        confirmCode,
        completeRegistration,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
