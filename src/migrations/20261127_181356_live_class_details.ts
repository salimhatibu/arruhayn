import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`class_joins\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`class_id\` integer NOT NULL,
  	\`visitor\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`class_id\`) REFERENCES \`classes\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`class_joins_class_idx\` ON \`class_joins\` (\`class_id\`);`)
  await db.run(sql`CREATE INDEX \`class_joins_updated_at_idx\` ON \`class_joins\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`class_joins_created_at_idx\` ON \`class_joins\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`class_visitor_idx\` ON \`class_joins\` (\`class_id\`,\`visitor\`);`)
  await db.run(sql`ALTER TABLE \`classes\` ADD \`started_at\` text;`)
  await db.run(sql`ALTER TABLE \`classes\` ADD \`ended_at\` text;`)
  await db.run(sql`ALTER TABLE \`classes\` ADD \`live_minutes\` numeric;`)
  await db.run(sql`ALTER TABLE \`classes\` ADD \`attendance\` numeric;`)
  await db.run(sql`ALTER TABLE \`classes_locales\` ADD \`speaker\` text;`)
  await db.run(sql`ALTER TABLE \`recordings_locales\` ADD \`speaker\` text;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`class_joins_id\` integer REFERENCES class_joins(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_class_joins_id_idx\` ON \`payload_locked_documents_rels\` (\`class_joins_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`class_joins\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`fatwas_id\` integer,
  	\`topics_id\` integer,
  	\`scholars_id\` integer,
  	\`questions_id\` integer,
  	\`newsletters_id\` integer,
  	\`news_id\` integer,
  	\`guides_id\` integer,
  	\`glossary_id\` integer,
  	\`classes_id\` integer,
  	\`recordings_id\` integer,
  	\`events_id\` integer,
  	\`hijri_months_id\` integer,
  	\`subscribers_id\` integer,
  	\`media_id\` integer,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`fatwas_id\`) REFERENCES \`fatwas\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`topics_id\`) REFERENCES \`topics\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`scholars_id\`) REFERENCES \`scholars\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`questions_id\`) REFERENCES \`questions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`newsletters_id\`) REFERENCES \`newsletters\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`news_id\`) REFERENCES \`news\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`guides_id\`) REFERENCES \`guides\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`glossary_id\`) REFERENCES \`glossary\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`classes_id\`) REFERENCES \`classes\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`recordings_id\`) REFERENCES \`recordings\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`events_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`hijri_months_id\`) REFERENCES \`hijri_months\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`subscribers_id\`) REFERENCES \`subscribers\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "fatwas_id", "topics_id", "scholars_id", "questions_id", "newsletters_id", "news_id", "guides_id", "glossary_id", "classes_id", "recordings_id", "events_id", "hijri_months_id", "subscribers_id", "media_id", "users_id") SELECT "id", "order", "parent_id", "path", "fatwas_id", "topics_id", "scholars_id", "questions_id", "newsletters_id", "news_id", "guides_id", "glossary_id", "classes_id", "recordings_id", "events_id", "hijri_months_id", "subscribers_id", "media_id", "users_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_fatwas_id_idx\` ON \`payload_locked_documents_rels\` (\`fatwas_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_topics_id_idx\` ON \`payload_locked_documents_rels\` (\`topics_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_scholars_id_idx\` ON \`payload_locked_documents_rels\` (\`scholars_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_questions_id_idx\` ON \`payload_locked_documents_rels\` (\`questions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_newsletters_id_idx\` ON \`payload_locked_documents_rels\` (\`newsletters_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_news_id_idx\` ON \`payload_locked_documents_rels\` (\`news_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_guides_id_idx\` ON \`payload_locked_documents_rels\` (\`guides_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_glossary_id_idx\` ON \`payload_locked_documents_rels\` (\`glossary_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_classes_id_idx\` ON \`payload_locked_documents_rels\` (\`classes_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_recordings_id_idx\` ON \`payload_locked_documents_rels\` (\`recordings_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_events_id_idx\` ON \`payload_locked_documents_rels\` (\`events_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_hijri_months_id_idx\` ON \`payload_locked_documents_rels\` (\`hijri_months_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_subscribers_id_idx\` ON \`payload_locked_documents_rels\` (\`subscribers_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`ALTER TABLE \`classes\` DROP COLUMN \`started_at\`;`)
  await db.run(sql`ALTER TABLE \`classes\` DROP COLUMN \`ended_at\`;`)
  await db.run(sql`ALTER TABLE \`classes\` DROP COLUMN \`live_minutes\`;`)
  await db.run(sql`ALTER TABLE \`classes\` DROP COLUMN \`attendance\`;`)
  await db.run(sql`ALTER TABLE \`classes_locales\` DROP COLUMN \`speaker\`;`)
  await db.run(sql`ALTER TABLE \`recordings_locales\` DROP COLUMN \`speaker\`;`)
}
