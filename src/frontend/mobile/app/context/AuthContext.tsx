import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getMe,
  requestVerificationCode,
  verifyCode,
  registerProfile,
  type User,
} from '../lib/api';
import { getAuthToken, setAuthToken } from '../lib/auth';

type AuthStatus = 'loading' | 'unauthenticated' | 'needsRegistration' | 'authenticated';

interface AuthContextType {
  status: AuthStatus;
  user: User | null;
  pendingEmail: string | null;
  isAdmin: boolean;
  requestCode: (email: string) => Promise<void>;
  confirmCode: (email: string, code: string) => Promise<'needsRegistration' | 'authenticated'>;
  completeRegistration: (data: { name: string; phone: string; program: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  status: 'loading',
  user: null,
  pendingEmail: null,
  isAdmin: false,
  requestCode: async () => {},
  confirmCode: async () => 'needsRegistration',
  completeRegistration: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

function isProfileComplete(user: User) {
  return Boolean(user.name?.trim() && user.phoneNumber?.trim() && user.program?.trim());
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

  const requestCode = async (email: string) => {
    await requestVerificationCode(email);
  };

  const confirmCode = async (email: string, code: string) => {
    const result = await verifyCode(email, code);
    await setAuthToken(result.token);
    setPendingEmail(email);
    if (result.needsRegistration) {
      setStatus('needsRegistration');
      setUser(result.user ?? null);
      return 'needsRegistration';
    }
    setUser(result.user);
    setStatus('authenticated');
    return 'authenticated';
  };

  const completeRegistration = async (data: { name: string; phone: string; program: string }) => {
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
        requestCode,
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
