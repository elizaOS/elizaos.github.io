import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/lib/data/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: "file:data/db.sqlite",
  },
  verbose: true,
});
