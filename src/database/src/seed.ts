/**
 * Team D Database Seed Script
 *
 * Populates the database with initial organizations, instances, users, and events
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as sharedSchema from '@large-event/database/schemas';
import * as overlaySchema from './overlays';
import { eq, and } from 'drizzle-orm';

async function seed() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/large_event_db';

  console.log('🌱 Seeding Team D database...');
  console.log(`📍 Database: ${connectionString.replace(/:[^:@]*@/, ':***@')}`);

  const pool = new Pool({
    connectionString,
  });

  const mergedSchema = {
    ...sharedSchema,
    ...overlaySchema,
  };

  const db = drizzle(pool, { schema: mergedSchema });

  try {
    // =========================================================================
    // 1. Create Organizations
    // =========================================================================
    console.log('Creating organizations...');
    const [cfes, cale, mes] = await db.insert(sharedSchema.organizations).values([
      {
        name: 'Canadian Federation of Engineering Students',
        acronym: 'CFES',
      },
      {
        name: 'Conference on Advocacy and Leadership in Engineering',
        acronym: 'CALE',
      },
      {
        name: 'McMaster Engineering Society',
        acronym: 'MES',
      },
    ]).returning();

    console.log(`✅ Created 3 organizations`);

    // =========================================================================
    // 2. Create Instances (with renamed "National Survey")
    // =========================================================================
    console.log('Creating instances...');
    const [
      mesDashboard,
      fireball,
      toga,
      grad,
      graffiti,
      cale2026,
      natsurvey
    ] = await db.insert(sharedSchema.instances).values([
      {
        name: 'MES Dashboard',
        ownerOrganizationId: mes.id,
      },
      {
        name: 'Fireball',
        ownerOrganizationId: mes.id,
      },
      {
        name: 'Toga',
        ownerOrganizationId: mes.id,
      },
      {
        name: 'Grad',
        ownerOrganizationId: mes.id,
      },
      {
        name: 'Graffiti',
        ownerOrganizationId: mes.id,
      },
      {
        name: 'CALE 2026',
        ownerOrganizationId: cale.id,
      },
      {
        name: 'National Survey',
        ownerOrganizationId: cfes.id,
      },
    ]).returning();

    console.log(`✅ Created 7 instances`);

    // =========================================================================
    // 3. Create Users
    // =========================================================================
    console.log('Creating users...');

    // Helper function to create or get user
    async function createOrGetUser(email: string, name: string, isSystemAdmin = false) {
      const existing = await db
        .select()
        .from(sharedSchema.users)
        .where(eq(sharedSchema.users.email, email))
        .limit(1);

      if (existing.length > 0) {
        console.log(`  User ${email} already exists, using existing`);
        return existing[0];
      }

      const [user] = await db.insert(sharedSchema.users).values({
        email,
        name,
        isSystemAdmin,
      }).returning();

      return user;
    }

    // System admin
    const systemAdmin = await createOrGetUser('admin@system.com', 'System Administrator', true);

    // Organization superadmins
    const mesAdmin = await createOrGetUser('admin@mes.dev', 'MES Admin');
    const cfesAdmin = await createOrGetUser('admin@cfes.dev', 'CFES Admin');
    const caleAdmin = await createOrGetUser('admin@cale.dev', 'CALE Admin');

    // MES event instance admins
    const fireballAdmin = await createOrGetUser('admin@fireball.dev', 'Fireball Admin');
    const togaAdmin = await createOrGetUser('admin@toga.dev', 'Toga Admin');
    const gradAdmin = await createOrGetUser('admin@grad.dev', 'Grad Admin');
    const graffitiAdmin = await createOrGetUser('admin@graffiti.dev', 'Graffiti Admin');

    // CFES instance admin
    const natsurveyAdmin = await createOrGetUser('admin@natsurvey.dev', 'NatSurvey Admin');

    // CALE instance admin
    const cale2026Admin = await createOrGetUser('admin@cale2026.dev', 'CALE 2026 Admin');

    // Regular users
    const mesUser = await createOrGetUser('user@mes.dev', 'MES User');
    const cfesUser = await createOrGetUser('user@cfes.dev', 'CFES User');
    const caleUser = await createOrGetUser('user@cale.dev', 'CALE User');

    console.log(`✅ Created/verified 14 users`);

    // =========================================================================
    // 4. Create User-Organization Memberships
    // =========================================================================
    console.log('Creating user-organization memberships...');

    await db.insert(sharedSchema.userOrganizations).values([
      // Organization superadmins
      { userId: mesAdmin.id, organizationId: mes.id, isOrganizationAdmin: true },
      { userId: cfesAdmin.id, organizationId: cfes.id, isOrganizationAdmin: true },
      { userId: caleAdmin.id, organizationId: cale.id, isOrganizationAdmin: true },

      // Regular organization members
      { userId: mesUser.id, organizationId: mes.id, isOrganizationAdmin: false },
      { userId: cfesUser.id, organizationId: cfes.id, isOrganizationAdmin: false },
      { userId: caleUser.id, organizationId: cale.id, isOrganizationAdmin: false },

      // Event admins as MES members (non-org admins)
      { userId: fireballAdmin.id, organizationId: mes.id, isOrganizationAdmin: false },
      { userId: togaAdmin.id, organizationId: mes.id, isOrganizationAdmin: false },
      { userId: gradAdmin.id, organizationId: mes.id, isOrganizationAdmin: false },
      { userId: graffitiAdmin.id, organizationId: mes.id, isOrganizationAdmin: false },

      // CFES event admin
      { userId: natsurveyAdmin.id, organizationId: cfes.id, isOrganizationAdmin: false },

      // CALE event admin
      { userId: cale2026Admin.id, organizationId: cale.id, isOrganizationAdmin: false },
    ]);

    console.log(`✅ Created 12 user-organization memberships`);

    // =========================================================================
    // 5. Grant User-Instance Access
    // =========================================================================
    console.log('Granting user-instance access...');

    // System admin gets 'both' access to all instances
    const allInstances = [mesDashboard, fireball, toga, grad, graffiti, cale2026, natsurvey];
    for (const instance of allInstances) {
      await db.insert(sharedSchema.userInstanceAccess).values({
        userId: systemAdmin.id,
        instanceId: instance.id,
        accessLevel: 'both',
        grantedBy: null,
      });
    }

    // Organization admins automatically get 'both' access via their org membership
    // But we'll grant it explicitly for clarity in the seed data
    // MES Admin → all MES instances
    for (const instance of [mesDashboard, fireball, toga, grad, graffiti]) {
      await db.insert(sharedSchema.userInstanceAccess).values({
        userId: mesAdmin.id,
        instanceId: instance.id,
        accessLevel: 'both',
        grantedBy: systemAdmin.id,
      });
    }

    // CFES Admin → CFES instances
    await db.insert(sharedSchema.userInstanceAccess).values({
      userId: cfesAdmin.id,
      instanceId: natsurvey.id,
      accessLevel: 'both',
      grantedBy: systemAdmin.id,
    });

    // CALE Admin → CALE instances
    await db.insert(sharedSchema.userInstanceAccess).values({
      userId: caleAdmin.id,
      instanceId: cale2026.id,
      accessLevel: 'both',
      grantedBy: systemAdmin.id,
    });

    // Event admins → their specific instances (admin portal access)
    await db.insert(overlaySchema.userInstanceAccess).values([
      { userId: fireballAdmin.id, instanceId: fireball.id, accessLevel: 'web_admin', grantedBy: mesAdmin.id },
      { userId: togaAdmin.id, instanceId: toga.id, accessLevel: 'web_admin', grantedBy: mesAdmin.id },
      { userId: gradAdmin.id, instanceId: grad.id, accessLevel: 'web_admin', grantedBy: mesAdmin.id },
      { userId: graffitiAdmin.id, instanceId: graffiti.id, accessLevel: 'web_admin', grantedBy: mesAdmin.id },
      { userId: natsurveyAdmin.id, instanceId: natsurvey.id, accessLevel: 'web_admin', grantedBy: cfesAdmin.id },
      { userId: cale2026Admin.id, instanceId: cale2026.id, accessLevel: 'web_admin', grantedBy: caleAdmin.id },
    ]);

    // Regular users → their org's instances (user portal access)
    // MES User → all MES instances
    for (const instance of [mesDashboard, fireball, toga, grad, graffiti]) {
      await db.insert(sharedSchema.userInstanceAccess).values({
        userId: mesUser.id,
        instanceId: instance.id,
        accessLevel: 'web_user',
        grantedBy: mesAdmin.id,
      });
    }

    // CFES User → CFES instances
    await db.insert(sharedSchema.userInstanceAccess).values({
      userId: cfesUser.id,
      instanceId: natsurvey.id,
      accessLevel: 'web_user',
      grantedBy: cfesAdmin.id,
    });

    // CALE User → CALE instances
    await db.insert(sharedSchema.userInstanceAccess).values({
      userId: caleUser.id,
      instanceId: cale2026.id,
      accessLevel: 'web_user',
      grantedBy: caleAdmin.id,
    });

    console.log(`✅ Granted access for all users`);

    // =========================================================================
    // 6. Create Roles and Assign to Users (RBAC)
    // =========================================================================
    console.log('Creating roles...');

    // Helper function to create or get role
    async function createOrGetRole(name: string, description: string) {
      const existing = await db
        .select()
        .from(overlaySchema.roles)
        .where(eq(overlaySchema.roles.name, name))
        .limit(1);

      if (existing.length > 0) {
        console.log(`  Role ${name} already exists, using existing`);
        return existing[0];
      }

      const [role] = await db.insert(overlaySchema.roles).values({
        name,
        description,
      }).returning();

      return role;
    }

    // Create roles
    const adminRole = await createOrGetRole('admin', 'Administrator role with full access to manage users and roles');
    const studentRole = await createOrGetRole('student', 'Student role with access to student-specific features');

    console.log(`✅ Created/verified 2 roles (admin, student)`);

    // Assign roles to users
    console.log('Assigning roles to users...');

    // Helper function to assign role to user
    async function assignRoleToUser(userId: number, roleId: number, assignedBy: number | null = null) {
      // Check if role is already assigned
      const existing = await db
        .select()
        .from(overlaySchema.userRoles)
        .where(
          and(
            eq(overlaySchema.userRoles.userId, userId),
            eq(overlaySchema.userRoles.roleId, roleId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return; // Role already assigned
      }

      await db.insert(overlaySchema.userRoles).values({
        userId,
        roleId,
        assignedBy,
      });
    }

    // System admin and org admins get 'admin' role
    await assignRoleToUser(systemAdmin.id, adminRole.id, null);
    await assignRoleToUser(mesAdmin.id, adminRole.id, systemAdmin.id);
    await assignRoleToUser(cfesAdmin.id, adminRole.id, systemAdmin.id);
    await assignRoleToUser(caleAdmin.id, adminRole.id, systemAdmin.id);

    // Instance admins also get 'admin' role for demo purposes
    await assignRoleToUser(fireballAdmin.id, adminRole.id, mesAdmin.id);
    await assignRoleToUser(togaAdmin.id, adminRole.id, mesAdmin.id);
    await assignRoleToUser(gradAdmin.id, adminRole.id, mesAdmin.id);
    await assignRoleToUser(graffitiAdmin.id, adminRole.id, mesAdmin.id);
    await assignRoleToUser(natsurveyAdmin.id, adminRole.id, cfesAdmin.id);
    await assignRoleToUser(cale2026Admin.id, adminRole.id, caleAdmin.id);

    // Regular users get 'student' role
    await assignRoleToUser(mesUser.id, studentRole.id, mesAdmin.id);
    await assignRoleToUser(cfesUser.id, studentRole.id, cfesAdmin.id);
    await assignRoleToUser(caleUser.id, studentRole.id, caleAdmin.id);

    console.log(`✅ Assigned roles to users`);
    console.log(`   - Admin role: ${1 + 3 + 6} users (system admin + org admins + instance admins)`);
    console.log(`   - Student role: 3 users (regular users)`);

    // =========================================================================
    // Summary
    // =========================================================================
    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Organizations: 3 (MES, CFES, CALE)`);
    console.log(`   - Instances: 7 (MES Dashboard, Fireball, Toga, Grad, Graffiti, CALE 2026, National Survey)`);
    console.log(`   - Users: 14`);
    console.log(`     * System Admin: admin@system.com`);
    console.log(`     * Org Admins: admin@mes.dev, admin@cfes.dev, admin@cale.dev`);
    console.log(`     * Instance Admins: admin@fireball.dev, admin@toga.dev, admin@grad.dev, admin@graffiti.dev, admin@natsurvey.dev, admin@cale2026.dev`);
    console.log(`     * Regular Users: user@mes.dev, user@cfes.dev, user@cale.dev`);
    console.log(`   - User-Organization Memberships: 12`);
    console.log(`   - User-Instance Access Grants: ${7 + 5 + 1 + 1 + 6 + 5 + 1 + 1} (with various access levels)`);
    console.log(`   - Roles: 2 (admin, student)`);
    console.log(`   - Role Assignments: 13 (10 admin, 3 student)`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
