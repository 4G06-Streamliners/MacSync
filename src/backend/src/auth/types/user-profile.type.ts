/**
 * @file user-profile.type.ts
 * @brief Defines the UserProfile data type returned after successful authentication
 * @details Contains user identity information provided to other modules
 */

/**
 * @interface UserProfile
 * @brief Represents authenticated user profile information
 * @property userId - Unique identifier for the user
 * @property username - The user's username or email
 * @property email - The user's email address
 * @property roles - Array of roles assigned to the user (e.g., 'admin', 'user')
 * @property createdAt - Timestamp when the user account was created
 */
export interface UserProfile {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  createdAt: Date;
}
