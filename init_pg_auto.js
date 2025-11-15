// init_pg_auto.js — FINAL RENDER SAFE VERSION (NO ERRORS)
require("dotenv").config();
const pool = require("./db");

async function initializePostgres() {
  console.log("🔄 Checking PostgreSQL tables...");

  try {
    /* ------------------------------------------------------
       USERS TABLE (customer + barista ONLY)
    -------------------------------------------------------*/
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

    /* ------------------------------------------------------
       MENU TABLE
    -------------------------------------------------------*/
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        category VARCHAR(50),
        price NUMERIC(10,2)
      );
    `);

    /* ------------------------------------------------------
       ORDERS TABLE
    -------------------------------------------------------*/
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

    console.log("✔ Tables confirmed");

    /* ------------------------------------------------------
       DEFAULT BARISTA ACCOUNT
    -------------------------------------------------------*/
    await pool.query(`
      INSERT INTO users (email, password, role)
      VALUES (
        'barista@mochamist.com',
        '$2a$10$fe6ZyjPm7GWGLSu3H3TWuexxsB/JpDTnBkPAV/Q93SkJoefrxDPLu',
        'barista'
      )
      ON CONFLICT (email) DO NOTHING;
    `);

    console.log("✔ default barista ready");

    /* ------------------------------------------------------
       DEFAULT MENU ITEMS (NO TYPE ERRORS)
    -------------------------------------------------------*/
    const menuItems = [
      ["Cappuccino", "Rich espresso with steamed milk foam", "Coffee", 140],
      ["Latte", "Smooth and creamy milk + espresso", "Coffee", 160],
      ["Cold Brew", "Slow brewed cold coffee", "Coffee", 180],
      ["Mocha", "Chocolate + Espresso + Milk", "Coffee", 170],
      ["Espresso", "Strong & bold single shot", "Coffee", 90]
    ];

    for (const item of menuItems) {
      await pool.query(
        `
        INSERT INTO menu (name, description, category, price)
        VALUES ($1::varchar, $2::text, $3::varchar, $4::numeric)
        ON CONFLICT (name) DO NOTHING;
        `,
        item
      );
    }

    console.log("✔ default menu items added");

  } catch (err) {
    console.error("❌ Auto-init error:", err);
  }
}

initializePostgres();
