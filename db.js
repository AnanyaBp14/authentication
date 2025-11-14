const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function init() {
  const conn = await pool.getConnection();
  try {
    /* ---------------------------
       CREATE DATABASE
    ---------------------------- */
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    await conn.query(`USE \`${process.env.DB_NAME}\``);

    /* ---------------------------
       USERS TABLE
    ---------------------------- */
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('customer','barista','admin') NOT NULL,
        refresh_token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    /* ---------------------------
       MENU TABLE
    ---------------------------- */
    await conn.query(`
      CREATE TABLE IF NOT EXISTS menu (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        description TEXT,
        category VARCHAR(50),
        price DECIMAL(10,2),
        img VARCHAR(255)
      )
    `);

    /* ---------------------------
       ORDERS TABLE
       user_id = NULL (for no-login customers)
    ---------------------------- */
    await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        items LONGTEXT NOT NULL,
        total DECIMAL(10,2),
        status ENUM('Preparing','Ready','Served') DEFAULT 'Preparing',
        time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("✔ Tables created");

    /* ---------------------------
       DEFAULT ADMIN & BARISTA
    ---------------------------- */
    const adminEmail = "admin@mochamist.com";
    const baristaEmail = "barista@mochamist.com";

    const adminPass = bcrypt.hashSync("admin123", 10);
    const baristaPass = bcrypt.hashSync("barista123", 10);

    const [adminRow] = await conn.query("SELECT * FROM users WHERE email=?", [
      adminEmail,
    ]);
    if (adminRow.length === 0) {
      await conn.query(
        "INSERT INTO users (email,password,role) VALUES (?,?,?)",
        [adminEmail, adminPass, "admin"]
      );
      console.log("👑 Default admin created");
    }

    const [baristaRow] = await conn.query("SELECT * FROM users WHERE email=?", [
      baristaEmail,
    ]);
    if (baristaRow.length === 0) {
      await conn.query(
        "INSERT INTO users (email,password,role) VALUES (?,?,?)",
        [baristaEmail, baristaPass, "barista"]
      );
      console.log("☕ Default barista created");
    }

    /* ---------------------------
       DEFAULT MENU ITEMS
    ---------------------------- */
    const defaultMenu = [
      ["Cappuccino", "Rich espresso with steamed milk foam", "Coffee", 140, "https://i.imgur.com/2yAfYkL.jpeg"],
      ["Latte", "Smooth and creamy milk + espresso", "Coffee", 160, "https://i.imgur.com/m7Iu5zs.jpeg"],
      ["Cold Brew", "Chilled slowly brewed coffee", "Coffee", 180, "https://i.imgur.com/lsVb3PO.jpeg"],
      ["Mocha", "Chocolate + Espresso + Milk", "Coffee", 170, "https://i.imgur.com/dp2BoQ4.jpeg"],
      ["Espresso", "Strong & bold single shot", "Coffee", 90, "https://i.imgur.com/SZlIc7r.jpeg"]
    ];

    const [menuCount] = await conn.query("SELECT COUNT(*) AS count FROM menu");
    if (menuCount[0].count === 0) {
      for (let m of defaultMenu) {
        await conn.query(
          "INSERT INTO menu (name, description, category, price, img) VALUES (?, ?, ?, ?, ?)",
          m
        );
      }
      console.log("📌 Default menu items inserted");
    }

    console.log("🎉 Database initialized successfully!");

  } catch (err) {
    console.error("❌ DB ERROR:", err);
  } finally {
    conn.release();
  }
}

module.exports = { pool, init };

if (require.main === module) {
  init().then(() => process.exit(0));
}
