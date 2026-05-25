import "dotenv/config";
import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";

async function runMigration() {
  const connection = await createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    multipleStatements: true,
  });

  const sql = readFileSync("./db/migrations/0000_solid_thor.sql", "utf-8");

  // Split by statement-breakpoint and execute each
  const statements = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Executing ${statements.length} statements...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await connection.execute(stmt);
      console.log(`✓ Statement ${i + 1}/${statements.length}`);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      // Ignore "already exists" errors
      if (error.code === "ER_TABLE_EXISTS_ERROR" || error.code === "ER_DUP_FIELDNAME" || error.code === "ER_CANT_DROP_FIELD_OR_KEY") {
        console.log(`⚠ Statement ${i + 1} skipped (already applied): ${error.message?.slice(0, 60)}`);
      } else {
        console.log(`✗ Statement ${i + 1} failed: ${error.message?.slice(0, 100)}`);
      }
    }
  }

  await connection.end();
  console.log("Migration complete!");
}

runMigration().catch(console.error);
