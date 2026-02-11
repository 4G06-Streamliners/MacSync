/**
 * @file credentials.type.ts
 * @brief Defines the Credentials data type for user authentication
 * @details Contains username and password fields required for login operations
 */

/**
 * @interface Credentials
 * @brief Represents user credentials for authentication
 * @property username - The unique identifier for the user (email or username)
 * @property password - The user's password for authentication
 * @property apiKey - Optional API key for service-to-service authentication
 */
export interface Credentials {
  username: string;
  password: string;
  apiKey?: string;
}
