import path from "node:path";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

function requiredPassword(): string {
  const password = process.env.MYSQL_PASSWORD;
  if (!password || password === "replace-with-your-password") {
    throw new Error(
      "Open server/.env and set MYSQL_PASSWORD to your MySQL root password.",
    );
  }
  return password;
}

export const USER_ID = 1;

export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: requiredPassword(),
  database: process.env.MYSQL_DATABASE || "fittrack",
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});
