require("dotenv").config();
const pool = require("./db");

async function initializePostgres() {
  try {
    console.log("🔄 Checking PostgreSQL tables...");

    /* USERS TABLE */
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

    /* MENU TABLE */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        category VARCHAR(50),
        price DECIMAL(10,2)
      );
    `);

    /* ORDERS */
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

    console.log("✔ Tables confirmed");

    /* DEFAULT BARISTA USER */
    await pool.query(`
      INSERT INTO users (email, password, role)
      SELECT 'barista@mochamist.com',
             '$2a$10$fe6ZyjPm7GWGLSu3H3TWuexxsB/JpDTnBkPAV/Q93SkJoefrxDPLu',
             'barista'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='barista@mochamist.com');
    `);

    console.log("✔ default barista ready");

    /* DEFAULT MENU */
    const defaultMenu = [
      ["Cappuccino", "Rich espresso with steamed milk foam", "Coffee", 140],
      ["Latte", "Smooth and creamy milk + espresso", "Coffee", 160],
      ["Cold Brew", "Chilled slowly brewed coffee", "Coffee", 180],
      ["Mocha", "Chocolate + Espresso + Milk", "Coffee", 170],
      ["Espresso", "Strong & bold single shot", "Coffee", 90]
    ];

    for (const m of defaultMenu) {
      await pool.query(
        `
        INSERT INTO menu (name, description, category, price)
        SELECT $1, $2, $3, $4
        WHERE NOT EXISTS (SELECT 1 FROM menu WHERE name=$1);
        `,
        m
      );
    }

    console.log("✔ Default menu ensured");

  } catch (err) {
    console.error("❌ Auto-init error:", err);
  }
}

module.exports = initializePostgres;
