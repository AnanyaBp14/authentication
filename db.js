// db.js
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING;
const isRender = typeof connectionString === "string" && connectionString.includes("render.com");

const pool = new Pool({
  connectionString,
  ssl: isRender ? { rejectUnauthorized: false } : undefined,
  // optional: max, idleTimeoutMillis etc.
});

module.exports = pool;
