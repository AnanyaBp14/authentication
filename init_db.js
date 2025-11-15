// init_pg.js  → PostgreSQL initializer for Render
require("dotenv").config();
const pool = require("./db");

async function initDB() {
  try {
    console.log("🔄 Initializing PostgreSQL tables...");

    /* ---------------- USERS TABLE ---------------- */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('customer','barista','admin')),
        refresh_token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✔ users table ready");

    /* ---------------- MENU TABLE (NO IMAGES) ---------------- */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        category VARCHAR(50),
        price DECIMAL(10,2)
      );
    `);
    console.log("✔ menu table ready");

    /* ---------------- ORDERS TABLE ---------------- */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        items JSON NOT NULL,
        total DECIMAL(10,2),
        status VARCHAR(20) DEFAULT 'Preparing',
        time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✔ orders table ready");

    /* ---------------- DEFAULT ADMIN ---------------- */
    await pool.query(`
      INSERT INTO users (email, password, role)
      SELECT 'admin@mochamist.com',
             '$2a$10$1hOqP1uH4hHhkf7S8BF7Sey7tOxFyGfF5vBZ9aLF/L/CyCyVJZZZe',
             'admin'
      WHERE NOT EXISTS (
        SELECT 1 FROM users WHERE email='admin@mochamist.com'
      );
    `);
    console.log("✔ default admin inserted (if missing)");

    /* ---------------- DEFAULT BARISTA ---------------- */
    await pool.query(`
      INSERT INTO users (email, password, role)
      SELECT 'barista@mochamist.com',
             '$2a$10$fe6ZyjPm7GWGLSu3H3TWuexxsB/JpDTnBkPAV/Q93SkJoefrxDPLu',
             'barista'
      WHERE NOT EXISTS (
        SELECT 1 FROM users WHERE email='barista@mochamist.com'
      );
    `);
    console.log("✔ default barista inserted (if missing)");

    /* ---------------- DEFAULT MENU ---------------- */
    const defaultMenu = [
      ['Cappuccino', 'Rich espresso with steamed milk foam', 'Coffee', 140],
      ['Latte', 'Smooth and creamy milk + espresso', 'Coffee', 160],
      ['Cold Brew', 'Chilled slowly brewed coffee', 'Coffee', 180],
      ['Mocha', 'Chocolate + Espresso + Milk', 'Coffee', 170],
      ['Espresso', 'Strong & bold single shot', 'Coffee', 90]
    ];

    for (const item of defaultMenu) {
      await pool.query(
        `INSERT INTO menu (name, description, category, price)
         SELECT $1, $2, $3, $4
         WHERE NOT EXISTS (SELECT 1 FROM menu WHERE name=$1);`,
        item
      );
    }

    console.log("✔ default menu items added (no duplicates)");

    console.log("🎉 PostgreSQL initialization complete!");
    process.exit(0);

  } catch (err) {
    console.error("❌ Initialization error:", err);
    process.exit(1);
  }
}

initDB();
