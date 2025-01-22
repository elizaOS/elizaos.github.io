import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "@/lib/data/db";
import { ingestHistoricalData } from "@/lib/data/ingest";

async function main() {
  console.log("Initializing database...");
  await migrate(db, { migrationsFolder: "./drizzle" });

  await ingestHistoricalData();

  console.log("Done!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
