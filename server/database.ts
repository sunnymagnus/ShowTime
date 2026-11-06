import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync } from "node:fs";
import path from "node:path";
import { dataDirectory, projectRoot } from "./config";

// The adapter keeps the SQL operations used by booking routes small and explicit.
// Each group update executes synchronously inside one SQLite transaction.
export function createDatabase(filename: string) {
  const sqlite = new DatabaseSync(filename);
  sqlite.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  const version = Number(
    (sqlite.prepare("PRAGMA user_version").get() as any).user_version,
  );
  if (version === 0) {
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      sqlite.exec(
        readFileSync(path.join(projectRoot, "database/schema.sql"), "utf8"),
      );
      sqlite.exec("PRAGMA user_version=1; COMMIT");
    } catch (error) {
      sqlite.exec("ROLLBACK");
      throw error;
    }
  }
  if (version > 1)
    throw new Error("This database belongs to a newer Showtime version.");
  function prepare(sql: string, args: SQLInputValue[] = []): LocalStatement {
    return {
      sql,
      args,
      bind(...values: SQLInputValue[]) {
        return prepare(sql, values);
      },
      async all() {
        return { results: sqlite.prepare(sql).all(...args) };
      },
      async first() {
        return sqlite.prepare(sql).get(...args) || null;
      },
      async run() {
        const result = sqlite.prepare(sql).run(...args);
        return { meta: { changes: Number(result.changes) } };
      },
    };
  }
  return {
    prepare,
    async batch(statements: LocalStatement[]) {
      sqlite.exec("BEGIN IMMEDIATE");
      try {
        const results = statements.map((s) => ({
          meta: {
            changes: Number(sqlite.prepare(s.sql).run(...s.args).changes),
          },
        }));
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
    close() {
      sqlite.close();
    },
  };
}
export type LocalStatement = {
  sql: string;
  args: SQLInputValue[];
  bind(...values: SQLInputValue[]): LocalStatement;
  all(): Promise<{ results: any[] }>;
  first(): Promise<any>;
  run(): Promise<{ meta: { changes: number } }>;
};
export type LocalDatabase = ReturnType<typeof createDatabase>;
export const database = createDatabase(
  path.join(dataDirectory, "showtime.sqlite"),
);
