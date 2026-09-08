import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const password = process.env.MYSQL_PASSWORD;
if (!password || password === "replace-with-your-password") {
  console.error(
    "Open server/.env and set MYSQL_PASSWORD to your MySQL root password, then run this again.",
  );
  process.exit(1);
}

async function setup() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password,
    multipleStatements: true,
  });

  const schemaPath = path.join(__dirname, "..", "..", "database", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  await connection.query(schema);
  await connection.end();
  console.log("Database fittrack is ready.");
}

setup().catch((error) => {
  console.error("Could not set up the database.");
  console.error(error);
  process.exit(1);
});
