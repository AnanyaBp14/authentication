// init_pg_auto.js
const pool = require("./db");

async function initializePostgres() {
  console.log("🔄 Checking PostgreSQL structure...");

  try {
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

    // default admin (password is bcrypt hash for some sample password)
    await pool.query(`
      INSERT INTO users (email, password, role)
      VALUES ($1,$2,$3)
      ON CONFLICT (email) DO NOTHING;
    `, ['admin@mochamist.com', '$2a$10$1hOqP1uH4hHhkf7S8BF7Sey7tOxFyGfF5vBZ9aLF/L/CyCyVJZZZe', 'admin']);

    // default barista (password: barista123 hashed)
    await pool.query(`
      INSERT INTO users (email, password, role)
      VALUES ($1,$2,$3)
      ON CONFLICT (email) DO NOTHING;
    `, ['barista@mochamist.com', '$2a$10$fe6ZyjPm7GWGLSu3H3TWuexxsB/JpDTnBkPAV/Q93SkJoefrxDPLu', 'barista']);

    // default menu items if menu empty
    await pool.query(`
      INSERT INTO menu (name, description, category, price)
      SELECT * FROM (
        VALUES
        ('Cappuccino','Rich espresso with steamed milk foam','Coffee',140),
        ('Latte','Smooth and creamy milk + espresso','Coffee',160),
        ('Cold Brew','Chilled slowly brewed coffee','Coffee',180),
        ('Mocha','Chocolate + Espresso + Milk','Coffee',170),
        ('Espresso','Strong & bold single shot','Coffee',90)
      ) AS t(name,description,category,price)
      WHERE NOT EXISTS (SELECT 1 FROM menu);
    `);

    console.log("🎉 PostgreSQL Auto-Init Complete!");
  } catch (err) {
    console.error("❌ PG Init Error:", err.message || err);
  }
}

module.exports = initializePostgres;
