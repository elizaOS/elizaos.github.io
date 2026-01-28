/**
 * Database connection for GitHub Analytics
 * Connects to SQLite database for direct queries
 */

import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";

let db: DatabaseType | null = null;

export function getDb(): DatabaseType {
  if (!db) {
    const dbPath = process.env.MCP_DB_PATH;
    if (!dbPath) {
      throw new Error(
        "MCP_DB_PATH environment variable required. Set it to the path of your SQLite database.",
      );
    }
    db = new Database(dbPath, { readonly: true });
    db.pragma("journal_mode = WAL");
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Helper to run a query and return results
export function query<T>(sql: string, params: unknown[] = []): T[] {
  const stmt = getDb().prepare(sql);
  return stmt.all(...params) as T[];
}

// Helper to run a query and return first result
export function queryOne<T>(
  sql: string,
  params: unknown[] = [],
): T | undefined {
  const stmt = getDb().prepare(sql);
  return stmt.get(...params) as T | undefined;
}
