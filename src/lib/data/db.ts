import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import path from "path";
import * as schema from "./schema";

// Initialize SQLite database with WAL mode for better performance
const sqlite = new Database(path.join(process.cwd(), "data/db.sqlite"), {
  create: true,
});
sqlite.exec("PRAGMA journal_mode = WAL;"); // Enable WAL mode for better performance

export const db = drizzle(sqlite, { schema });

// Ensure database is closed when the process exits
process.on("exit", () => {
  sqlite.close();
});
