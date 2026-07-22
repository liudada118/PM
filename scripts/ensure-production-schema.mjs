import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { config } from "dotenv";
import mysql from "mysql2/promise";

function readPm2DatabaseUrl() {
  try {
    const processes = JSON.parse(
      execFileSync("pm2", ["jlist"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      })
    );
    const app = processes.find(process => process.name === "pm-collab");
    return app?.pm2_env?.DATABASE_URL;
  } catch {
    return undefined;
  }
}

export function selectProductionDatabaseUrl(
  pm2DatabaseUrl,
  environmentDatabaseUrl
) {
  if (pm2DatabaseUrl) {
    return { databaseUrl: pm2DatabaseUrl, source: "pm2 pm-collab" };
  }
  if (environmentDatabaseUrl) {
    return { databaseUrl: environmentDatabaseUrl, source: "environment/.env" };
  }
  return { databaseUrl: undefined, source: undefined };
}

export async function ensureProductionSchema() {
  // PM2 may retain a DATABASE_URL that differs from /opt/pm/.env. The running
  // process is the source of truth because this schema must match that process.
  const pm2DatabaseUrl = readPm2DatabaseUrl();
  config();
  const environmentDatabaseUrl = process.env.DATABASE_URL;
  const { databaseUrl, source } = selectProductionDatabaseUrl(
    pm2DatabaseUrl,
    environmentDatabaseUrl
  );

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is missing from /opt/pm/.env, the server environment, and pm2 pm-collab"
    );
  }

  if (
    pm2DatabaseUrl &&
    environmentDatabaseUrl &&
    pm2DatabaseUrl !== environmentDatabaseUrl
  ) {
    console.warn(
      "DATABASE_URL differs between pm2 pm-collab and environment/.env; updating the active PM2 database"
    );
  }
  console.log(`Checking production schema using ${source}`);

  const connection = await mysql.createConnection(databaseUrl);

  try {
    const [issueColumns] = await connection.query(
      `SELECT COLUMN_NAME AS columnName
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'issues'
       AND COLUMN_NAME = 'originalAssigneeId'`
    );

    if (issueColumns.length === 0) {
      await connection.query(
        "ALTER TABLE `issues` ADD COLUMN `originalAssigneeId` int NULL AFTER `assigneeId`"
      );
      console.log("Added issues.originalAssigneeId");
    } else {
      console.log("issues.originalAssigneeId already exists");
    }

    const [roleColumns] = await connection.query(
      `SELECT COLUMN_TYPE AS columnType
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'project_members'
       AND COLUMN_NAME = 'role'`
    );

    if (roleColumns.length === 0) {
      throw new Error("project_members.role does not exist");
    }

    const roleType = String(roleColumns[0].columnType).toLowerCase();
    if (!roleType.includes("'tester'")) {
      await connection.query(
        "ALTER TABLE `project_members` MODIFY COLUMN `role` enum('owner','member','tester') NOT NULL DEFAULT 'member'"
      );
      console.log("Added tester to project_members.role");
    } else {
      console.log("project_members.role already supports tester");
    }

    const [architectureViewColumns] = await connection.query(
      `SELECT COLUMN_NAME AS columnName
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'architecture_docs'
       AND COLUMN_NAME = 'viewMode'`
    );

    if (architectureViewColumns.length === 0) {
      await connection.query(
        "ALTER TABLE `architecture_docs` ADD COLUMN `viewMode` enum('mindmap','hybrid') NOT NULL DEFAULT 'mindmap' AFTER `projectId`"
      );
      console.log("Added architecture_docs.viewMode");
    } else {
      console.log("architecture_docs.viewMode already exists");
    }

    const [businessStageColumns] = await connection.query(
      `SELECT COLUMN_NAME AS columnName
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'architecture_docs'
       AND COLUMN_NAME = 'businessStageNames'`
    );

    if (businessStageColumns.length === 0) {
      await connection.query(
        "ALTER TABLE `architecture_docs` ADD COLUMN `businessStageNames` json NULL AFTER `viewMode`"
      );
      console.log("Added architecture_docs.businessStageNames");
    } else {
      console.log("architecture_docs.businessStageNames already exists");
    }
  } finally {
    await connection.end();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await ensureProductionSchema();
}
