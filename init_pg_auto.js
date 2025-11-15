// init_pg_auto.js
const pool = require("./db");

async function initializePostgres() {
  console.log("🔄 Checking PostgreSQL structure...");

  try {
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
    console.log("✔ users table OK");

    /* ---------------- MENU TABLE ---------------- */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        description TEXT,
        category VARCHAR(50),
        price NUMERIC(10,2),
        img TEXT
      );
    `);
    console.log("✔ menu table OK");

    /* ---------------- ORDERS TABLE ---------------- */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        items JSON NOT NULL,
        total NUMERIC(10,2),
        status VARCHAR(20) DEFAULT 'Preparing',
        time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✔ orders table OK");

    /* ---------------- DEFAULT ADMIN ---------------- */
    await pool.query(`
      INSERT INTO users (email, password, role)
      VALUES (
        'admin@mochamist.com',
        '$2a$10$1hOqP1uH4hHhkf7S8BF7Sey7tOxFyGfF5vBZ9aLF/L/CyCyVJZZZe',
        'admin'
      )
      ON CONFLICT (email) DO NOTHING;
    `);

    /* ---------------- DEFAULT BARISTA ---------------- */
    await pool.query(`
      INSERT INTO users (email, password, role)
      VALUES (
        'barista@mochamist.com',
        '$2a$10$fe6ZyjPm7GWGLSu3H3TWuexxsB/JpDTnBkPAV/Q93SkJoefrxDPLu',
        'barista'
      )
      ON CONFLICT (email) DO NOTHING;
    `);

    console.log("✔ Default users inserted");

    /* ---------------- DEFAULT MENU ---------------- */
    await pool.query(`
      INSERT INTO menu (name, description, category, price)
      SELECT * FROM (
        VALUES
          ('Cappuccino','Rich espresso with steamed milk foam','Coffee',140),
          ('Latte','Smooth and creamy milk + espresso','Coffee',160),
          ('Cold Brew','Chilled slowly brewed coffee','Coffee',180),
          ('Mocha','Chocolate + Espresso + Milk','Coffee',170),
          ('Espresso','Strong & bold single shot','Coffee',90)
      ) AS tmp(name,description,category,price)
      WHERE NOT EXISTS (SELECT 1 FROM menu LIMIT 1);
    `);

    console.log("✔ Default menu inserted");

    console.log("🎉 PostgreSQL Auto-Init Complete!");

  } catch (err) {
    console.error("❌ PG Init Error:", err.message);
  }
}

module.exports = initializePostgres;
