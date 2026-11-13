import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`fatwas_sources\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`url\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`fatwas\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`fatwas_sources_order_idx\` ON \`fatwas_sources\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`fatwas_sources_parent_id_idx\` ON \`fatwas_sources\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`fatwas_sources_locales\` (
  	\`reference\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`fatwas_sources\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`fatwas_sources_locales_locale_parent_id_unique\` ON \`fatwas_sources_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`fatwas_sources_locales_parent_id_idx\` ON \`fatwas_sources_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`fatwas\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`number\` numeric,
  	\`scholar_id\` integer,
  	\`original_url\` text,
  	\`status\` text DEFAULT 'draft' NOT NULL,
  	\`published_at\` text,
  	\`reviewed_by_id\` integer,
  	\`from_question_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`scholar_id\`) REFERENCES \`scholars\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`from_question_id\`) REFERENCES \`questions\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`fatwas_number_idx\` ON \`fatwas\` (\`number\`);`)
  await db.run(sql`CREATE INDEX \`fatwas_scholar_idx\` ON \`fatwas\` (\`scholar_id\`);`)
  await db.run(sql`CREATE INDEX \`fatwas_status_idx\` ON \`fatwas\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`fatwas_published_at_idx\` ON \`fatwas\` (\`published_at\`);`)
  await db.run(sql`CREATE INDEX \`fatwas_reviewed_by_idx\` ON \`fatwas\` (\`reviewed_by_id\`);`)
  await db.run(sql`CREATE INDEX \`fatwas_from_question_idx\` ON \`fatwas\` (\`from_question_id\`);`)
  await db.run(sql`CREATE INDEX \`fatwas_updated_at_idx\` ON \`fatwas\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`fatwas_created_at_idx\` ON \`fatwas\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`fatwas_locales\` (
  	\`title\` text NOT NULL,
  	\`question\` text NOT NULL,
  	\`answer\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`fatwas\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`fatwas_locales_locale_parent_id_unique\` ON \`fatwas_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`fatwas_locales_parent_id_idx\` ON \`fatwas_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`fatwas_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`topics_id\` integer,
  	\`fatwas_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`fatwas\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`topics_id\`) REFERENCES \`topics\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`fatwas_id\`) REFERENCES \`fatwas\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`fatwas_rels_order_idx\` ON \`fatwas_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`fatwas_rels_parent_idx\` ON \`fatwas_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`fatwas_rels_path_idx\` ON \`fatwas_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`fatwas_rels_topics_id_idx\` ON \`fatwas_rels\` (\`topics_id\`);`)
  await db.run(sql`CREATE INDEX \`fatwas_rels_fatwas_id_idx\` ON \`fatwas_rels\` (\`fatwas_id\`);`)
  await db.run(sql`CREATE TABLE \`_fatwas_v_version_sources\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`url\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_fatwas_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_fatwas_v_version_sources_order_idx\` ON \`_fatwas_v_version_sources\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_fatwas_v_version_sources_parent_id_idx\` ON \`_fatwas_v_version_sources\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_fatwas_v_version_sources_locales\` (
  	\`reference\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_fatwas_v_version_sources\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_fatwas_v_version_sources_locales_locale_parent_id_unique\` ON \`_fatwas_v_version_sources_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_fatwas_v_version_sources_locales_parent_id_idx\` ON \`_fatwas_v_version_sources_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_fatwas_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_number\` numeric,
  	\`version_scholar_id\` integer,
  	\`version_original_url\` text,
  	\`version_status\` text DEFAULT 'draft' NOT NULL,
  	\`version_published_at\` text,
  	\`version_reviewed_by_id\` integer,
  	\`version_from_question_id\` integer,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`fatwas\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_scholar_id\`) REFERENCES \`scholars\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_from_question_id\`) REFERENCES \`questions\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_fatwas_v_parent_idx\` ON \`_fatwas_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_fatwas_v_version_version_number_idx\` ON \`_fatwas_v\` (\`version_number\`);`)
  await db.run(sql`CREATE INDEX \`_fatwas_v_version_version_scholar_idx\` ON \`_fatwas_v\` (\`version_scholar_id\`);`)
  await db.run(sql`CREATE INDEX \`_fatwas_v_version_version_status_idx\` ON \`_fatwas_v\` (\`version_status\`);`)
  await db.run(sql`CREATE INDEX \`_fatwas_v_version_version_published_at_idx\` ON \`_fatwas_v\` (\`version_published_at\`);`)
  await db.run(sql`CREATE INDEX \`_fatwas_v_version_version_reviewed_by_idx\` ON \`_fatwas_v\` (\`version_reviewed_by_id\`);`)
  await db.run(sql`CREATE INDEX \`_fatwas_v_version_version_from_question_idx\` ON \`_fatwas_v\` (\`version_from_question_id\`);`)
  await db.run(sql`CREATE INDEX \`_fatwas_v_version_version_updated_at_idx\` ON \`_fatwas_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_fatwas_v_version_version_created_at_idx\` ON \`_fatwas_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_fatwas_v_created_at_idx\` ON \`_fatwas_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_fatwas_v_updated_at_idx\` ON \`_fatwas_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE TABLE \`_fatwas_v_locales\` (
  	\`version_title\` text NOT NULL,
  	\`version_question\` text NOT NULL,
  	\`version_answer\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_fatwas_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_fatwas_v_locales_locale_parent_id_unique\` ON \`_fatwas_v_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_fatwas_v_locales_parent_id_idx\` ON \`_fatwas_v_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_fatwas_v_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`topics_id\` integer,
  	\`fatwas_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`_fatwas_v\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`topics_id\`) REFERENCES \`topics\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`fatwas_id\`) REFERENCES \`fatwas\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_fatwas_v_rels_order_idx\` ON \`_fatwas_v_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`_fatwas_v_rels_parent_idx\` ON \`_fatwas_v_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_fatwas_v_rels_path_idx\` ON \`_fatwas_v_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`_fatwas_v_rels_topics_id_idx\` ON \`_fatwas_v_rels\` (\`topics_id\`);`)
  await db.run(sql`CREATE INDEX \`_fatwas_v_rels_fatwas_id_idx\` ON \`_fatwas_v_rels\` (\`fatwas_id\`);`)
  await db.run(sql`CREATE TABLE \`topics\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`slug\` text NOT NULL,
  	\`order\` numeric DEFAULT 100,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`topics_slug_idx\` ON \`topics\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`topics_updated_at_idx\` ON \`topics\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`topics_created_at_idx\` ON \`topics\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`topics_locales\` (
  	\`name\` text NOT NULL,
  	\`description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`topics\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`topics_locales_locale_parent_id_unique\` ON \`topics_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`topics_locales_parent_id_idx\` ON \`topics_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`topics_texts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`topics\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`topics_texts_order_parent\` ON \`topics_texts\` (\`order\`,\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`topics_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`topics_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`topics\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`topics_id\`) REFERENCES \`topics\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`topics_rels_order_idx\` ON \`topics_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`topics_rels_parent_idx\` ON \`topics_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`topics_rels_path_idx\` ON \`topics_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`topics_rels_topics_id_idx\` ON \`topics_rels\` (\`topics_id\`);`)
  await db.run(sql`CREATE TABLE \`scholars\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`scholars_updated_at_idx\` ON \`scholars\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`scholars_created_at_idx\` ON \`scholars\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`scholars_locales\` (
  	\`name\` text NOT NULL,
  	\`bio\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`scholars\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`scholars_locales_locale_parent_id_unique\` ON \`scholars_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`scholars_locales_parent_id_idx\` ON \`scholars_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`questions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`question\` text NOT NULL,
  	\`language\` text DEFAULT 'en' NOT NULL,
  	\`email\` text,
  	\`status\` text DEFAULT 'new' NOT NULL,
  	\`linked_fatwa_id\` integer,
  	\`answered_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`linked_fatwa_id\`) REFERENCES \`fatwas\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`questions_status_idx\` ON \`questions\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`questions_linked_fatwa_idx\` ON \`questions\` (\`linked_fatwa_id\`);`)
  await db.run(sql`CREATE INDEX \`questions_answered_at_idx\` ON \`questions\` (\`answered_at\`);`)
  await db.run(sql`CREATE INDEX \`questions_updated_at_idx\` ON \`questions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`questions_created_at_idx\` ON \`questions\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`newsletters\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`issue\` numeric NOT NULL,
  	\`cover_id\` integer,
  	\`status\` text DEFAULT 'draft' NOT NULL,
  	\`publish_at\` text,
  	\`emailed_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`cover_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`newsletters_issue_idx\` ON \`newsletters\` (\`issue\`);`)
  await db.run(sql`CREATE INDEX \`newsletters_cover_idx\` ON \`newsletters\` (\`cover_id\`);`)
  await db.run(sql`CREATE INDEX \`newsletters_status_idx\` ON \`newsletters\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`newsletters_publish_at_idx\` ON \`newsletters\` (\`publish_at\`);`)
  await db.run(sql`CREATE INDEX \`newsletters_updated_at_idx\` ON \`newsletters\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`newsletters_created_at_idx\` ON \`newsletters\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`newsletters_locales\` (
  	\`title\` text NOT NULL,
  	\`summary\` text,
  	\`body\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`newsletters\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`newsletters_locales_locale_parent_id_unique\` ON \`newsletters_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`newsletters_locales_parent_id_idx\` ON \`newsletters_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`newsletters_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`topics_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`newsletters\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`topics_id\`) REFERENCES \`topics\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`newsletters_rels_order_idx\` ON \`newsletters_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`newsletters_rels_parent_idx\` ON \`newsletters_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`newsletters_rels_path_idx\` ON \`newsletters_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`newsletters_rels_topics_id_idx\` ON \`newsletters_rels\` (\`topics_id\`);`)
  await db.run(sql`CREATE TABLE \`_newsletters_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_issue\` numeric NOT NULL,
  	\`version_cover_id\` integer,
  	\`version_status\` text DEFAULT 'draft' NOT NULL,
  	\`version_publish_at\` text,
  	\`version_emailed_at\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`newsletters\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_cover_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_newsletters_v_parent_idx\` ON \`_newsletters_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_newsletters_v_version_version_issue_idx\` ON \`_newsletters_v\` (\`version_issue\`);`)
  await db.run(sql`CREATE INDEX \`_newsletters_v_version_version_cover_idx\` ON \`_newsletters_v\` (\`version_cover_id\`);`)
  await db.run(sql`CREATE INDEX \`_newsletters_v_version_version_status_idx\` ON \`_newsletters_v\` (\`version_status\`);`)
  await db.run(sql`CREATE INDEX \`_newsletters_v_version_version_publish_at_idx\` ON \`_newsletters_v\` (\`version_publish_at\`);`)
  await db.run(sql`CREATE INDEX \`_newsletters_v_version_version_updated_at_idx\` ON \`_newsletters_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_newsletters_v_version_version_created_at_idx\` ON \`_newsletters_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_newsletters_v_created_at_idx\` ON \`_newsletters_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_newsletters_v_updated_at_idx\` ON \`_newsletters_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE TABLE \`_newsletters_v_locales\` (
  	\`version_title\` text NOT NULL,
  	\`version_summary\` text,
  	\`version_body\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_newsletters_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_newsletters_v_locales_locale_parent_id_unique\` ON \`_newsletters_v_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_newsletters_v_locales_parent_id_idx\` ON \`_newsletters_v_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_newsletters_v_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`topics_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`_newsletters_v\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`topics_id\`) REFERENCES \`topics\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_newsletters_v_rels_order_idx\` ON \`_newsletters_v_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`_newsletters_v_rels_parent_idx\` ON \`_newsletters_v_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_newsletters_v_rels_path_idx\` ON \`_newsletters_v_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`_newsletters_v_rels_topics_id_idx\` ON \`_newsletters_v_rels\` (\`topics_id\`);`)
  await db.run(sql`CREATE TABLE \`news\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`date\` text NOT NULL,
  	\`status\` text DEFAULT 'draft' NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`news_date_idx\` ON \`news\` (\`date\`);`)
  await db.run(sql`CREATE INDEX \`news_status_idx\` ON \`news\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`news_updated_at_idx\` ON \`news\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`news_created_at_idx\` ON \`news\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`news_locales\` (
  	\`title\` text NOT NULL,
  	\`summary\` text,
  	\`body\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`news\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`news_locales_locale_parent_id_unique\` ON \`news_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`news_locales_parent_id_idx\` ON \`news_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`guides_steps\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`fatwa_id\` integer,
  	FOREIGN KEY (\`fatwa_id\`) REFERENCES \`fatwas\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`guides\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`guides_steps_order_idx\` ON \`guides_steps\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`guides_steps_parent_id_idx\` ON \`guides_steps\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`guides_steps_fatwa_idx\` ON \`guides_steps\` (\`fatwa_id\`);`)
  await db.run(sql`CREATE TABLE \`guides_steps_locales\` (
  	\`title\` text NOT NULL,
  	\`body\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`guides_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`guides_steps_locales_locale_parent_id_unique\` ON \`guides_steps_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`guides_steps_locales_parent_id_idx\` ON \`guides_steps_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`guides\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`slug\` text NOT NULL,
  	\`type\` text DEFAULT 'article' NOT NULL,
  	\`status\` text DEFAULT 'draft' NOT NULL,
  	\`order\` numeric DEFAULT 100,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`guides_slug_idx\` ON \`guides\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`guides_updated_at_idx\` ON \`guides\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`guides_created_at_idx\` ON \`guides\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`guides_locales\` (
  	\`title\` text NOT NULL,
  	\`summary\` text,
  	\`intro\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`guides\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`guides_locales_locale_parent_id_unique\` ON \`guides_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`guides_locales_parent_id_idx\` ON \`guides_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`glossary\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`glossary_updated_at_idx\` ON \`glossary\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`glossary_created_at_idx\` ON \`glossary\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`glossary_locales\` (
  	\`term\` text NOT NULL,
  	\`definition\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`glossary\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`glossary_locales_locale_parent_id_unique\` ON \`glossary_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`glossary_locales_parent_id_idx\` ON \`glossary_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`glossary_texts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`glossary\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`glossary_texts_order_parent\` ON \`glossary_texts\` (\`order\`,\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`classes\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`teacher_id\` integer NOT NULL,
  	\`starts_at\` text NOT NULL,
  	\`duration_minutes\` numeric DEFAULT 90,
  	\`status\` text DEFAULT 'scheduled' NOT NULL,
  	\`meeting_id\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`teacher_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`classes_teacher_idx\` ON \`classes\` (\`teacher_id\`);`)
  await db.run(sql`CREATE INDEX \`classes_starts_at_idx\` ON \`classes\` (\`starts_at\`);`)
  await db.run(sql`CREATE INDEX \`classes_status_idx\` ON \`classes\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`classes_updated_at_idx\` ON \`classes\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`classes_created_at_idx\` ON \`classes\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`classes_locales\` (
  	\`title\` text NOT NULL,
  	\`description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`classes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`classes_locales_locale_parent_id_unique\` ON \`classes_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`classes_locales_parent_id_idx\` ON \`classes_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recordings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`teacher_id\` integer NOT NULL,
  	\`class_id\` integer,
  	\`language\` text DEFAULT 'ar',
  	\`file_key\` text NOT NULL,
  	\`mime_type\` text,
  	\`size_bytes\` numeric,
  	\`duration_seconds\` numeric,
  	\`status\` text DEFAULT 'draft' NOT NULL,
  	\`in_feed\` integer DEFAULT true,
  	\`published_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`teacher_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`class_id\`) REFERENCES \`classes\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`recordings_teacher_idx\` ON \`recordings\` (\`teacher_id\`);`)
  await db.run(sql`CREATE INDEX \`recordings_class_idx\` ON \`recordings\` (\`class_id\`);`)
  await db.run(sql`CREATE INDEX \`recordings_status_idx\` ON \`recordings\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`recordings_published_at_idx\` ON \`recordings\` (\`published_at\`);`)
  await db.run(sql`CREATE INDEX \`recordings_updated_at_idx\` ON \`recordings\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`recordings_created_at_idx\` ON \`recordings\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`recordings_locales\` (
  	\`title\` text NOT NULL,
  	\`description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`recordings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`recordings_locales_locale_parent_id_unique\` ON \`recordings_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`recordings_locales_parent_id_idx\` ON \`recordings_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recordings_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`topics_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`recordings\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`topics_id\`) REFERENCES \`topics\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recordings_rels_order_idx\` ON \`recordings_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`recordings_rels_parent_idx\` ON \`recordings_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`recordings_rels_path_idx\` ON \`recordings_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`recordings_rels_topics_id_idx\` ON \`recordings_rels\` (\`topics_id\`);`)
  await db.run(sql`CREATE TABLE \`events\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`date_type\` text DEFAULT 'gregorian' NOT NULL,
  	\`gregorian_date\` text,
  	\`hijri_month\` text,
  	\`hijri_day\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`events_updated_at_idx\` ON \`events\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`events_created_at_idx\` ON \`events\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`events_locales\` (
  	\`title\` text NOT NULL,
  	\`description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`events_locales_locale_parent_id_unique\` ON \`events_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`events_locales_parent_id_idx\` ON \`events_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`hijri_months\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`year\` numeric NOT NULL,
  	\`month\` text NOT NULL,
  	\`start\` text NOT NULL,
  	\`label\` text,
  	\`note\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`hijri_months_updated_at_idx\` ON \`hijri_months\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`hijri_months_created_at_idx\` ON \`hijri_months\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`subscribers\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`email\` text NOT NULL,
  	\`language\` text DEFAULT 'en',
  	\`status\` text DEFAULT 'pending' NOT NULL,
  	\`confirm_token\` text,
  	\`unsubscribe_token\` text,
  	\`confirmed_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`subscribers_email_idx\` ON \`subscribers\` (\`email\`);`)
  await db.run(sql`CREATE INDEX \`subscribers_status_idx\` ON \`subscribers\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`subscribers_confirm_token_idx\` ON \`subscribers\` (\`confirm_token\`);`)
  await db.run(sql`CREATE INDEX \`subscribers_unsubscribe_token_idx\` ON \`subscribers\` (\`unsubscribe_token\`);`)
  await db.run(sql`CREATE INDEX \`subscribers_updated_at_idx\` ON \`subscribers\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`subscribers_created_at_idx\` ON \`subscribers\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`media\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_objectkey\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`url\` text,
  	\`thumbnail_u_r_l\` text,
  	\`filename\` text,
  	\`mime_type\` text,
  	\`filesize\` numeric,
  	\`width\` numeric,
  	\`height\` numeric
  );
  `)
  await db.run(sql`CREATE INDEX \`media_updated_at_idx\` ON \`media\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`media_created_at_idx\` ON \`media\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`media_filename_idx\` ON \`media\` (\`filename\`);`)
  await db.run(sql`CREATE TABLE \`media_locales\` (
  	\`alt\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`media_locales_locale_parent_id_unique\` ON \`media_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`media_locales_parent_id_idx\` ON \`media_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`users_roles\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_roles_order_idx\` ON \`users_roles\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`users_roles_parent_idx\` ON \`users_roles\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`users\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`email\` text NOT NULL,
  	\`name\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`users_email_idx\` ON \`users\` (\`email\`);`)
  await db.run(sql`CREATE INDEX \`users_updated_at_idx\` ON \`users\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`users_created_at_idx\` ON \`users\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_kv\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text NOT NULL,
  	\`data\` text NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`payload_kv_key_idx\` ON \`payload_kv\` (\`key\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`global_slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_global_slug_idx\` ON \`payload_locked_documents\` (\`global_slug\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_updated_at_idx\` ON \`payload_locked_documents\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_created_at_idx\` ON \`payload_locked_documents\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents_rels\` (
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
  await db.run(sql`CREATE TABLE \`payload_preferences\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text,
  	\`value\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_key_idx\` ON \`payload_preferences\` (\`key\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_updated_at_idx\` ON \`payload_preferences\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_created_at_idx\` ON \`payload_preferences\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_users_id_idx\` ON \`payload_preferences_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_migrations\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`batch\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_migrations_updated_at_idx\` ON \`payload_migrations\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_migrations_created_at_idx\` ON \`payload_migrations\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`site_settings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`email_sending\` integer DEFAULT false,
  	\`contact_email\` text,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
  await db.run(sql`CREATE TABLE \`site_settings_locales\` (
  	\`disclaimer\` text,
  	\`about\` text,
  	\`privacy\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_settings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`site_settings_locales_locale_parent_id_unique\` ON \`site_settings_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_settings_locales_parent_id_idx\` ON \`site_settings_locales\` (\`_parent_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`fatwas_sources\`;`)
  await db.run(sql`DROP TABLE \`fatwas_sources_locales\`;`)
  await db.run(sql`DROP TABLE \`fatwas\`;`)
  await db.run(sql`DROP TABLE \`fatwas_locales\`;`)
  await db.run(sql`DROP TABLE \`fatwas_rels\`;`)
  await db.run(sql`DROP TABLE \`_fatwas_v_version_sources\`;`)
  await db.run(sql`DROP TABLE \`_fatwas_v_version_sources_locales\`;`)
  await db.run(sql`DROP TABLE \`_fatwas_v\`;`)
  await db.run(sql`DROP TABLE \`_fatwas_v_locales\`;`)
  await db.run(sql`DROP TABLE \`_fatwas_v_rels\`;`)
  await db.run(sql`DROP TABLE \`topics\`;`)
  await db.run(sql`DROP TABLE \`topics_locales\`;`)
  await db.run(sql`DROP TABLE \`topics_texts\`;`)
  await db.run(sql`DROP TABLE \`topics_rels\`;`)
  await db.run(sql`DROP TABLE \`scholars\`;`)
  await db.run(sql`DROP TABLE \`scholars_locales\`;`)
  await db.run(sql`DROP TABLE \`questions\`;`)
  await db.run(sql`DROP TABLE \`newsletters\`;`)
  await db.run(sql`DROP TABLE \`newsletters_locales\`;`)
  await db.run(sql`DROP TABLE \`newsletters_rels\`;`)
  await db.run(sql`DROP TABLE \`_newsletters_v\`;`)
  await db.run(sql`DROP TABLE \`_newsletters_v_locales\`;`)
  await db.run(sql`DROP TABLE \`_newsletters_v_rels\`;`)
  await db.run(sql`DROP TABLE \`news\`;`)
  await db.run(sql`DROP TABLE \`news_locales\`;`)
  await db.run(sql`DROP TABLE \`guides_steps\`;`)
  await db.run(sql`DROP TABLE \`guides_steps_locales\`;`)
  await db.run(sql`DROP TABLE \`guides\`;`)
  await db.run(sql`DROP TABLE \`guides_locales\`;`)
  await db.run(sql`DROP TABLE \`glossary\`;`)
  await db.run(sql`DROP TABLE \`glossary_locales\`;`)
  await db.run(sql`DROP TABLE \`glossary_texts\`;`)
  await db.run(sql`DROP TABLE \`classes\`;`)
  await db.run(sql`DROP TABLE \`classes_locales\`;`)
  await db.run(sql`DROP TABLE \`recordings\`;`)
  await db.run(sql`DROP TABLE \`recordings_locales\`;`)
  await db.run(sql`DROP TABLE \`recordings_rels\`;`)
  await db.run(sql`DROP TABLE \`events\`;`)
  await db.run(sql`DROP TABLE \`events_locales\`;`)
  await db.run(sql`DROP TABLE \`hijri_months\`;`)
  await db.run(sql`DROP TABLE \`subscribers\`;`)
  await db.run(sql`DROP TABLE \`media\`;`)
  await db.run(sql`DROP TABLE \`media_locales\`;`)
  await db.run(sql`DROP TABLE \`users_roles\`;`)
  await db.run(sql`DROP TABLE \`users\`;`)
  await db.run(sql`DROP TABLE \`payload_kv\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_migrations\`;`)
  await db.run(sql`DROP TABLE \`site_settings\`;`)
  await db.run(sql`DROP TABLE \`site_settings_locales\`;`)
}
