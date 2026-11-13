import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`users_sessions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`created_at\` text,
  	\`expires_at\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_sessions_order_idx\` ON \`users_sessions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`users_sessions_parent_id_idx\` ON \`users_sessions\` (\`_parent_id\`);`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`reset_password_token\` text;`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`reset_password_expiration\` text;`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`salt\` text;`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`hash\` text;`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`reset_password_requested_at\` text;`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`login_attempts\` numeric DEFAULT 0;`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`lock_until\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`users_sessions\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`reset_password_token\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`reset_password_expiration\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`salt\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`hash\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`reset_password_requested_at\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`login_attempts\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`lock_until\`;`)
}
