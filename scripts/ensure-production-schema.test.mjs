import { describe, expect, it } from "vitest";

import { selectProductionDatabaseUrl } from "./ensure-production-schema.mjs";

describe("production database selection", () => {
  it("uses the active PM2 database when it differs from the .env database", () => {
    expect(
      selectProductionDatabaseUrl("mysql://pm2-db", "mysql://env-db")
    ).toEqual({
      databaseUrl: "mysql://pm2-db",
      source: "pm2 pm-collab",
    });
  });

  it("falls back to the environment database before the app exists in PM2", () => {
    expect(selectProductionDatabaseUrl(undefined, "mysql://env-db")).toEqual({
      databaseUrl: "mysql://env-db",
      source: "environment/.env",
    });
  });

  it("reports a missing database configuration", () => {
    expect(selectProductionDatabaseUrl(undefined, undefined)).toEqual({
      databaseUrl: undefined,
      source: undefined,
    });
  });
});
