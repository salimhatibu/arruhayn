import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`fatwas\` ADD \`published_by\` text;`)
  await db.run(sql`ALTER TABLE \`fatwas_locales\` ADD \`translated_by\` text;`)
  await db.run(sql`ALTER TABLE \`_fatwas_v\` ADD \`version_published_by\` text;`)
  await db.run(sql`ALTER TABLE \`_fatwas_v_locales\` ADD \`version_translated_by\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`fatwas\` DROP COLUMN \`published_by\`;`)
  await db.run(sql`ALTER TABLE \`fatwas_locales\` DROP COLUMN \`translated_by\`;`)
  await db.run(sql`ALTER TABLE \`_fatwas_v\` DROP COLUMN \`version_published_by\`;`)
  await db.run(sql`ALTER TABLE \`_fatwas_v_locales\` DROP COLUMN \`version_translated_by\`;`)
}
