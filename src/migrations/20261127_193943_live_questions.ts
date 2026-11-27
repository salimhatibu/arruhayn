import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`questions\` ADD \`class_id\` integer REFERENCES classes(id);`)
  await db.run(sql`ALTER TABLE \`questions\` ADD \`asked_by\` text;`)
  await db.run(sql`ALTER TABLE \`questions\` ADD \`visitor\` text;`)
  await db.run(sql`CREATE INDEX \`questions_class_idx\` ON \`questions\` (\`class_id\`);`)
  await db.run(sql`CREATE INDEX \`questions_visitor_idx\` ON \`questions\` (\`visitor\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_questions\` (
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
  await db.run(sql`INSERT INTO \`__new_questions\`("id", "question", "language", "email", "status", "linked_fatwa_id", "answered_at", "updated_at", "created_at") SELECT "id", "question", "language", "email", "status", "linked_fatwa_id", "answered_at", "updated_at", "created_at" FROM \`questions\`;`)
  await db.run(sql`DROP TABLE \`questions\`;`)
  await db.run(sql`ALTER TABLE \`__new_questions\` RENAME TO \`questions\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`questions_status_idx\` ON \`questions\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`questions_linked_fatwa_idx\` ON \`questions\` (\`linked_fatwa_id\`);`)
  await db.run(sql`CREATE INDEX \`questions_answered_at_idx\` ON \`questions\` (\`answered_at\`);`)
  await db.run(sql`CREATE INDEX \`questions_updated_at_idx\` ON \`questions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`questions_created_at_idx\` ON \`questions\` (\`created_at\`);`)
}
