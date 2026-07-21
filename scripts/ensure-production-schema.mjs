import { execFileSync } from "node:child_process";
import "dotenv/config";
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

const databaseUrl = process.env.DATABASE_URL || readPm2DatabaseUrl();

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is missing from /opt/pm/.env, the server environment, and pm2 pm-collab"
  );
}

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
} finally {
  await connection.end();
}
