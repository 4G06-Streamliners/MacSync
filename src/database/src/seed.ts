/**
 * Team D Database Seed Script
 *
 * Populates the database with initial organizations, instances, users, and events
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as sharedSchema from '@large-event/database/schemas';
import * as overlaySchema from './overlays';
import { eq } from 'drizzle-orm';

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
    await db.insert(sharedSchema.userInstanceAccess).values([
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
    // 6. Create Signup Artifacts (bus routes, tables, RSVPs)
    // =========================================================================
    console.log('Creating sample bus routes...');
    const [fireballLoop, gradExpress] = await db.insert(overlaySchema.busRoutes).values([
      {
        instanceId: fireball.id,
        name: 'Fireball Downtown Loop',
        description: 'Pick-up at Hatch Centre, drop-off at Liuna Station.',
        capacity: 50,
        waitlistCapacity: 10,
        departureLocation: 'Hatch Centre',
      },
      {
        instanceId: grad.id,
        name: 'Grad Express',
        description: 'Express shuttle to the Burlington Convention Centre.',
        capacity: 40,
        waitlistCapacity: 5,
        departureLocation: 'JHE Bus Loop',
      },
    ]).returning();

    console.log('Creating sample event tables...');
    const [fireballTableA, fireballTableB] = await db.insert(overlaySchema.eventTables).values([
      {
        instanceId: fireball.id,
        label: 'Table A',
        capacity: 10,
        location: 'Grand Ballroom - Front Left',
      },
      {
        instanceId: fireball.id,
        label: 'Table B',
        capacity: 10,
        location: 'Grand Ballroom - Front Right',
      },
    ]).returning();

    console.log('Creating sample signups...');
    await db.insert(overlaySchema.busSignups).values([
      {
        instanceId: fireball.id,
        routeId: fireballLoop.id,
        userId: mesUser.id,
        status: 'confirmed',
      },
      {
        instanceId: fireball.id,
        routeId: fireballLoop.id,
        userId: cfesUser.id,
        status: 'waitlisted',
        waitlistPosition: 1,
      },
      {
        instanceId: grad.id,
        routeId: gradExpress.id,
        userId: gradAdmin.id,
        status: 'confirmed',
      },
    ]);

    await db.insert(overlaySchema.tableSignups).values([
      {
        instanceId: fireball.id,
        tableId: fireballTableA.id,
        userId: mesUser.id,
        groupName: 'Purple Team',
        seatsRequested: 2,
        status: 'confirmed',
      },
      {
        instanceId: fireball.id,
        tableId: fireballTableB.id,
        userId: cfesUser.id,
        groupName: 'CFES Friends',
        seatsRequested: 4,
        status: 'pending',
      },
    ]);

    await db.insert(overlaySchema.eventRsvps).values([
      {
        instanceId: fireball.id,
        userId: mesUser.id,
        status: 'confirmed',
      },
      {
        instanceId: fireball.id,
        userId: cfesUser.id,
        status: 'waitlisted',
        waitlistPosition: 1,
      },
      {
        instanceId: toga.id,
        userId: mesAdmin.id,
        status: 'confirmed',
      },
    ]);

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
    console.log(`   - Bus Routes: 2`);
    console.log(`   - Event Tables: 2`);
    console.log(`   - Signup Records: 8`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
