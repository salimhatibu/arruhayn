import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

// Records when a subscriber was asked to confirm, so the scheduled job never asks twice.
// (`name` is added by 20261113_151800_subscriber_names, which has not reached production yet.)
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`subscribers\` ADD \`confirm_sent_at\` text;`)
  await db.run(sql`CREATE INDEX \`subscribers_confirm_sent_at_idx\` ON \`subscribers\` (\`confirm_sent_at\`);`)
  // Issues that went up before the site could send are treated as already sent, so switching
  // email on does not post the whole archive to everyone at once.
  await db.run(
    sql`UPDATE \`newsletters\` SET \`emailed_at\` = coalesce(\`publish_at\`, \`created_at\`) WHERE \`status\` = 'published' AND \`emailed_at\` IS NULL;`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`subscribers_confirm_sent_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`subscribers\` DROP COLUMN \`confirm_sent_at\`;`)
}
