// test-db.js - Database debugging script
const mysql = require("mysql2/promise");
require('dotenv').config();

async function initDatabase(connection, dbName) {
  console.log("📦 Initializing database tables...\n");

  // Create users table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(100) UNIQUE,
      password VARCHAR(255),
      role ENUM('customer','barista','admin') NOT NULL,
      refresh_token VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✅ Created users table");

  // Create menu table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS menu (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100),
      description TEXT,
      category VARCHAR(50),
      price DECIMAL(10,2),
      img VARCHAR(255)
    )
  `);
  console.log("✅ Created menu table");

  // Create orders table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      items LONGTEXT NOT NULL,
      total DECIMAL(10,2),
      status ENUM('Preparing','Ready','Served') DEFAULT 'Preparing',
      time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✅ Created orders table\n");
}

async function testDatabase() {
  console.log("🔍 Testing Database Connection...\n");

  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASS || "",
    });

    console.log("✅ Connected to MySQL\n");

    // Create/select database
    const dbName = process.env.DB_NAME || "mochamist";
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.query(`USE \`${dbName}\``);
    console.log(`✅ Using database: ${dbName}\n`);

    // Initialize tables
    await initDatabase(connection, dbName);

    // Check tables
    const [tables] = await connection.query("SHOW TABLES");
    console.log("📋 Existing tables:", tables.map(t => Object.values(t)[0]));

    // Check users table
    const [users] = await connection.query("SELECT COUNT(*) as count FROM users");
    console.log(`\n👥 Total users in database: ${users[0].count}`);

    // List all users
    if (users[0].count > 0) {
      const [allUsers] = await connection.query("SELECT id, email, role FROM users");
      console.log("\n📧 Users in database:");
      allUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.role}) [ID: ${user.id}]`);
      });
    }

    // Test insert (optional demo user)
    console.log("\n➕ Creating test user (if needed)...");
    const bcrypt = require("bcryptjs");
    const testEmail = "test@mochamist.com";
    const testPassword = "test123";

    try {
      const hashed = await bcrypt.hash(testPassword, 10);
      await connection.query(
        "INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
        [testEmail, hashed, "customer"]
      );
      console.log(`✅ Created test user:\n   Email: ${testEmail}\n   Password: ${testPassword}\n   Role: customer`);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        console.log(`ℹ️  Test user already exists: ${testEmail}`);
      } else {
        throw err;
      }
    }

    console.log("\n🎉 Database is ready to use!\n");
    console.log("Try logging in with:");
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log(`   Server: http://localhost:5000`);

    await connection.end();
  } catch (err) {
    console.error("❌ Database error:", err.message);
    console.error("\n🔧 Troubleshooting:");
    console.error("   1. Make sure MySQL is running");
    console.error("   2. Check .env file for correct credentials");
    console.error("   3. Verify DB_HOST, DB_USER, and DB_PASS");
    console.error("   4. Run: npm install mysql2 bcryptjs");
    process.exit(1);
  }
}

testDatabase();
