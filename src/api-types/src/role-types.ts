/**
 * Role-Based Access Control (RBAC) Type Definitions
 * 
 * Types for managing user roles and permissions
 */

/**
 * Role definition
 * Represents a role that can be assigned to users
 */

export interface Role {
    id: number
    name: string
    description: string | null
    createdAt: Date | string
}

/**
 * User Role assignment
 * Represents a role assigned to a specific user
 */
export interface UserRole {
    id: number
    userId: number
    roleId: number
    assignedAt: Date | string
    assignedBy: number | null
    role: Role
}

/**
 * Request body for assigning a role to a user
 */
export interface AssignRoleRequest {
    roleName: string
}
  
/**
 * Response for getting all roles
 */
export interface RolesListResponse {
    roles: Role[]
    count: number
}
  
/**
 * Response for getting user roles
 */
export interface UserRolesResponse {
    userId: number
    roles: UserRole[]
    roleNames: string[]
}

/**
 * Response for assigning a role
 */
export interface AssignRoleResponse {
    message: string
    userRole: UserRole
}
  
/**
 * Response for revoking a role
 */
export interface RevokeRoleResponse {
    message: string
}