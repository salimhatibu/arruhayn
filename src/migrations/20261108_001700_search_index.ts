import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

// Full-text search over fatwas and newsletters. Rows are written by the collections' hooks with
// normalized text (see src/lib/search-index.ts), so this table is not managed by Payload's schema.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
    type UNINDEXED,
    ref_id UNINDEXED,
    locale UNINDEXED,
    title,
    body,
    keywords,
    tokenize = 'unicode61 remove_diacritics 2'
  );`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE IF EXISTS search_index;`)
}
