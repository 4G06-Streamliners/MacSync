import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import axios from 'axios';
import type { AuthUser, InstanceResponse, SignupSummary } from '@teamd/mobile-components';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  instances: InstanceResponse[];
  signups: SignupSummary | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshInstances: () => Promise<void>;
  refreshSignups: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = '@large-event/auth_token';

// Platform-aware API URL configuration
const getApiUrl = () => {
  // Production
  if (__DEV__ === false) {
    return 'https://api.large-event.com/api/v1/teamD';
  }

  // Development - Platform specific
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to access host machine's localhost
    return 'http://10.0.2.2:3004/api';
  }

  // iOS simulator and web
  return 'http://localhost:3004/api';
};

const API_URL = getApiUrl();

// Create axios instance with response unwrapping interceptor
const apiClient = axios.create();

// Unwrap { success, data } API response format
apiClient.interceptors.response.use(
  (response) => {
    // If response has { success, data } format, unwrap it
    if (response.data?.success && 'data' in response.data) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [instances, setInstances] = useState<InstanceResponse[]>([]);
  const [signups, setSignups] = useState<SignupSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Load token and user on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      console.log('[AuthContext] Loading stored auth...');
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      console.log('[AuthContext] Stored token:', storedToken ? 'Found' : 'Not found');

      if (storedToken) {
        setToken(storedToken);
        // Configure axios with token
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

        // Fetch user info and instances
        await fetchUserData(storedToken);
      }
    } catch (error) {
      console.error('[AuthContext] Error loading auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async (authToken: string) => {
    try {
      console.log('[AuthContext] Fetching user data from:', `${API_URL}/users/me`);
      // Fetch user profile
      const userResponse = await apiClient.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('[AuthContext] User response:', userResponse.data);
      setUser(userResponse.data);

      // Fetch instances
      await Promise.all([refreshInstances(), refreshSignups()]);
    } catch (error) {
      console.error('[AuthContext] Error fetching user data:', error);
      // If unauthorized or forbidden, clear auth
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        console.log('[AuthContext] Invalid/expired token, clearing auth');
        await logout();
      }
    }
  };

  const login = async (email: string) => {
    try {
      console.log('[AuthContext] Attempting login to:', `${API_URL}/auth/login`);
      // Simple email-based login (no password for demo)
      const response = await apiClient.post(`${API_URL}/auth/login`, { email });
      console.log('[AuthContext] Login response:', response.data);
      const { token: newToken, user: newUser } = response.data;

      setToken(newToken);
      setUser(newUser);
      await AsyncStorage.setItem(TOKEN_KEY, newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

      // Fetch instances
      await Promise.all([refreshInstances(), refreshSignups()]);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setInstances([]);
    await AsyncStorage.removeItem(TOKEN_KEY);
    delete axios.defaults.headers.common['Authorization'];
  };

  const refreshInstances = async () => {
    try {
      console.log('[AuthContext] Fetching instances from:', `${API_URL}/instances`);
      const response = await apiClient.get(`${API_URL}/instances`);
      console.log('[AuthContext] Instances response:', response.data);

      // API returns { success: true, data: { instances: [...], count: N } }
      const instancesData = response.data?.instances || [];
      console.log('[AuthContext] Setting instances:', instancesData.length, 'instances');
      setInstances(instancesData);
    } catch (error) {
      console.error('[AuthContext] Error fetching instances:', error);
    }
  };

  const refreshSignups = async () => {
    try {
      console.log('[AuthContext] Fetching signups from:', `${API_URL}/users/me/signups`);
      const response = await apiClient.get(`${API_URL}/users/me/signups`);
      const summary = (response.data ?? response) as SignupSummary;
      setSignups(summary);
    } catch (error) {
      console.error('[AuthContext] Error fetching signups:', error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    instances,
    signups,
    isAuthenticated: !!user && !!token,
    loading,
    login,
    logout,
    refreshInstances,
    refreshSignups,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
