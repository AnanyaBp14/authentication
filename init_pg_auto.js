// init_pg_auto.js
require("dotenv").config();
const pool = require("./db");

async function initializePostgres() {
  console.log("🔄 Checking PostgreSQL tables...");

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('customer','barista')),
        refresh_token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        category VARCHAR(50),
        price NUMERIC(10,2)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        items JSON NOT NULL,
        total NUMERIC(10,2),
        status VARCHAR(20) DEFAULT 'Preparing',
        time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✔ Tables OK");

    await pool.query(`
      INSERT INTO users (email, password, role)
      VALUES (
        'barista@mochamist.com',
        '$2a$10$fe6ZyjPm7GWGLSu3H3TWuexxsB/JpDTnBkPAV/Q93SkJoefrxDPLu',
        'barista'
      )
      ON CONFLICT (email) DO NOTHING;
    `);

    console.log("✔ Default barista ready");

  } catch (err) {
    console.error("❌ Auto-init error:", err.message);
  }
}

module.exports = initializePostgres;
