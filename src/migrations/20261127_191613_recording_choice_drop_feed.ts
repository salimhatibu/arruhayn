import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`classes\` ADD \`allow_recording\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`recordings\` DROP COLUMN \`in_feed\`;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`recordings\` ADD \`in_feed\` integer DEFAULT true;`)
  await db.run(sql`ALTER TABLE \`classes\` DROP COLUMN \`allow_recording\`;`)
}
