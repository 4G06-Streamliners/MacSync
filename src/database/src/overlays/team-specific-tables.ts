/**
 * Team D Specific Tables
 * 
 * RBAC (Role-Based Access Control) tables for managing user roles
 */

import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from '@large-event/database/schemas';

/**
 * Roles Table
 * Stores role definitions (admin, student, etc.)
 */
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * User Roles Junction Table
 * Links users to their assigned roles
 */
export const userRoles = pgTable('user_roles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  roleId: integer('role_id')
    .notNull()
    .references(() => roles.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  assignedBy: integer('assigned_by')
    .references(() => users.id, { onDelete: 'set null' }),
});
