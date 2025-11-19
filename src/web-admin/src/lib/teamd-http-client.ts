/**
 * Team D HTTP Client Wrapper
 * Unwraps Team D's standardized API response format: { success, data }
 * before passing to shared api-client functions
 */

import type { HttpClient, RequestConfig, ApiClientConfig } from '@large-event/api-client';
import { createFetchClient } from '@large-event/api-client';

/**
 * Team D API Response Format
 */
interface TeamDApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

/**
 * Creates an HTTP client that automatically unwraps Team D's response format
 * Converts { success: true, data: {...} } to just {...}
 */
export function createTeamDHttpClient(config: ApiClientConfig): HttpClient {
  const baseClient = createFetchClient(config);

  /**
   * Unwrap Team D response format
   */
  function unwrapResponse<T>(response: TeamDApiResponse<T>): T {
    if (!response.success) {
      const errorMessage = response.error?.message || 'Request failed';
      throw new Error(errorMessage);
    }

    if (response.data === undefined) {
      throw new Error('Response data is undefined');
    }

    return response.data;
  }

  return {
    async get<T = any>(url: string, config?: RequestConfig): Promise<T> {
      const response = await baseClient.get<TeamDApiResponse<T>>(url, config);
      return unwrapResponse(response);
    },

    async post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
      const response = await baseClient.post<TeamDApiResponse<T>>(url, data, config);
      return unwrapResponse(response);
    },

    async put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
      const response = await baseClient.put<TeamDApiResponse<T>>(url, data, config);
      return unwrapResponse(response);
    },

    async delete<T = any>(url: string, config?: RequestConfig): Promise<T> {
      const response = await baseClient.delete<TeamDApiResponse<T>>(url, config);
      return unwrapResponse(response);
    },
  };
}
