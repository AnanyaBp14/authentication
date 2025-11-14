const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Create mochamist.db inside project folder
const dbPath = path.join(__dirname, "mochamist.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("SQLite connection error:", err);
  else console.log("SQLite connected →", dbPath);
});

// Initialize Tables + Default Data
db.serialize(() => {
  /* ---------------- USERS TABLE ---------------- */
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('customer','barista','admin')) NOT NULL,
      refresh_token TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✔ users table ready");

  /* ---------------- MENU TABLE ---------------- */
  db.run(`
    CREATE TABLE IF NOT EXISTS menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      category TEXT,
      price REAL,
      img TEXT
    )
  `);
  console.log("✔ menu table ready");

  /* ---------------- ORDERS TABLE ---------------- */
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      items TEXT NOT NULL,
      total REAL,
      status TEXT CHECK(status IN ('Preparing','Ready','Served')) DEFAULT 'Preparing',
      time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✔ orders table ready");


  /* ---------------- DEFAULT ADMIN ---------------- */
  db.run(`
    INSERT INTO users (email, password, role)
    SELECT 'admin@mochamist.com',
           '$2a$10$1hOqP1uH4hHhkf7S8BF7Sey7tOxFyGfF5vBZ9aLF/L/CyCyVJZZZe',
           'admin'
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='admin@mochamist.com')
  `);
  console.log("✔ default admin added (if missing)");

  /* ---------------- DEFAULT BARISTA ---------------- */
  db.run(`
    INSERT INTO users (email, password, role)
    SELECT 'barista@mochamist.com',
           '$2a$10$fe6ZyjPm7GWGLSu3H3TWuexxsB/JpDTnBkPAV/Q93SkJoefrxDPLu',
           'barista'
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='barista@mochamist.com')
  `);
  console.log("✔ default barista added (if missing)");

  /* ---------------- DEFAULT MENU ITEMS ---------------- */
  db.run(`
    INSERT INTO menu (name, description, category, price, img)
    SELECT 'Cappuccino', 'Rich espresso with steamed milk foam', 'Coffee', 140, 'https://i.imgur.com/2yAfYkL.jpeg'
    WHERE NOT EXISTS (SELECT 1 FROM menu)
  `);

  db.run(`
    INSERT INTO menu (name, description, category, price, img)
    SELECT 'Latte', 'Smooth and creamy milk + espresso', 'Coffee', 160, 'https://i.imgur.com/m7Iu5zs.jpeg'
    WHERE NOT EXISTS (SELECT 1 FROM menu WHERE name='Latte')
  `);

  db.run(`
    INSERT INTO menu (name, description, category, price, img)
    SELECT 'Cold Brew', 'Chilled slowly brewed coffee', 'Coffee', 180, 'https://i.imgur.com/lsVb3PO.jpeg'
    WHERE NOT EXISTS (SELECT 1 FROM menu WHERE name='Cold Brew')
  `);

  db.run(`
    INSERT INTO menu (name, description, category, price, img)
    SELECT 'Mocha', 'Chocolate + Espresso + Milk', 'Coffee', 170, 'https://i.imgur.com/dp2BoQ4.jpeg'
    WHERE NOT EXISTS (SELECT 1 FROM menu WHERE name='Mocha')
  `);

  db.run(`
    INSERT INTO menu (name, description, category, price, img)
    SELECT 'Espresso', 'Strong & bold single shot', 'Coffee', 90, 'https://i.imgur.com/SZlIc7r.jpeg'
    WHERE NOT EXISTS (SELECT 1 FROM menu WHERE name='Espresso')
  `);

  console.log("✔ default menu items added (if empty)");
});

module.exports = db;
