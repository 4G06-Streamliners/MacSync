/**
 * Team D API Client for Mobile
 *
 * Connects to Team D API server (port 3004) for data fetching
 */

import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { InstanceListResponse, InstanceResponse, ApiResponse } from '@large-event/api-types';

// Team D API base URL
const getApiBaseUrl = () => {
  if (__DEV__) {
    // Development mode - direct connection to Team D API
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3004/api';  // Android emulator
    }
    return 'http://localhost:3004/api';  // iOS simulator
  }
  // Production
  return 'https://api.large-event.com/api/v1/teamD';
};

const API_BASE_URL = getApiBaseUrl();
const TOKEN_KEY = '@large-event/auth_token';

// Create axios instance
const teamDApiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
teamDApiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - unwrap ApiResponse format
teamDApiClient.interceptors.response.use(
  (response) => {
    // Unwrap standardized { success, data } response
    if (response.data?.success) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
    return Promise.reject(error);
  }
);

// Instances API
// Conforms to InstanceApi interface from @large-event/api
export const teamDInstances = {
  /**
   * Get all instances user has access to
   */
  getInstances: async (): Promise<InstanceListResponse> => {
    const response = await teamDApiClient.get<{
      instances: InstanceResponse[];
      count: number;
    }>('/instances');
    return {
      instances: response.data.instances || [],
      count: response.data.count || 0,
    };
  },

  /**
   * Get specific instance by ID
   */
  getInstance: async (id: number): Promise<InstanceResponse> => {
    const response = await teamDApiClient.get<{ instance: InstanceResponse }>(`/instances/${id}`);
    return response.data.instance;
  },
};

// Users API
export const teamDUsers = {
  /**
   * Get current user profile
   */
  getProfile: async () => {
    const response = await teamDApiClient.get('/users/me/profile');
    return response.data.profile;
  },
};

// Token storage helpers
export const tokenStorage = {
  save: async (token: string) => {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },

  get: async () => {
    return await AsyncStorage.getItem(TOKEN_KEY);
  },

  remove: async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },
};
