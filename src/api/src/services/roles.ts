/**
 * Role Service
 * Helper functions for role management and checking
 */

import { createTeamDDatabase } from '@teamd/database'
import { roles, userRoles } from '@teamd/database/overlays'
import { users } from '@large-event/database'
import { eq, and } from 'drizzle-orm'

// Lazy database connection - only create when needed
let db: ReturnType<typeof createTeamDDatabase> | null = null
function getDb() {
  if (!db) {
    db = createTeamDDatabase()
  }
  return db
}

export interface Role {
  id: number
  name: string
  description: string | null
  createdAt: Date
}

export interface UserRole {
  id: number
  userId: number
  roleId: number
  assignedAt: Date
  assignedBy: number | null
  role: Role
}

/**
 * Get all available roles
 */
export async function getAllRoles(): Promise<Role[]> {
  return await getDb().select().from(roles)
}

/**
 * Get role by name
 */
export async function getRoleByName(roleName: string): Promise<Role | null> {
  const [role] = await getDb()
    .select()
    .from(roles)
    .where(eq(roles.name, roleName))
    .limit(1)
  
  return role || null
}

/**
 * Get all roles for a specific user
 */
export async function getUserRoles(userId: number): Promise<UserRole[]> {
  const userRolesList = await getDb()
    .select({
      id: userRoles.id,
      userId: userRoles.userId,
      roleId: userRoles.roleId,
      assignedAt: userRoles.assignedAt,
      assignedBy: userRoles.assignedBy,
      role: {
        id: roles.id,
        name: roles.name,
        description: roles.description,
        createdAt: roles.createdAt,
      },
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId))

  return userRolesList.map(ur => ({
    id: ur.id,
    userId: ur.userId,
    roleId: ur.roleId,
    assignedAt: ur.assignedAt,
    assignedBy: ur.assignedBy,
    role: ur.role,
  }))
}

/**
 * Get role names for a user (simplified array of role names)
 */
export async function getUserRoleNames(userId: number): Promise<string[]> {
  const userRolesList = await getUserRoles(userId)
  return userRolesList.map(ur => ur.role.name)
}

/**
 * Check if user has a specific role
 */
export async function userHasRole(userId: number, roleName: string): Promise<boolean> {
  const role = await getRoleByName(roleName)
  if (!role) return false

  const [userRole] = await getDb()
    .select()
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, role.id)
      )
    )
    .limit(1)

  return !!userRole
}

/**
 * Assign a role to a user
 */
export async function assignRoleToUser(
  userId: number,
  roleName: string,
  assignedBy: number
): Promise<UserRole> {
  const role = await getRoleByName(roleName)
  if (!role) {
    throw new Error(`Role '${roleName}' not found`)
  }

  // Check if role is already assigned
  const existing = await getDb()
    .select()
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, role.id)
      )
    )
    .limit(1)

  if (existing.length > 0) {
    // Return existing assignment
    const [userRole] = await getUserRoles(userId)
    return userRole
  }

  // Assign the role
  const [newUserRole] = await getDb()
    .insert(userRoles)
    .values({
      userId,
      roleId: role.id,
      assignedBy,
    })
    .returning()

  // Fetch with role details
  const [userRoleWithDetails] = await getUserRoles(userId)
  return userRoleWithDetails
}

/**
 * Revoke a role from a user
 */
export async function revokeRoleFromUser(
  userId: number,
  roleName: string
): Promise<boolean> {
  const role = await getRoleByName(roleName)
  if (!role) {
    throw new Error(`Role '${roleName}' not found`)
  }

  const result = await getDb()
    .delete(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, role.id)
      )
    )
    .returning()

  return result.length > 0
}

