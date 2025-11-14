var mysql = require("mysql");

var dbName = "mochamist";

var can = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "",
  port: 3306
});

can.connect(function (err) {
  if (err) throw err;
  console.log("Connected to MySQL!");

  /* ---------------- CREATE DATABASE ---------------- */
  can.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``, function (err) {
    if (err) throw err;
    console.log("Database created or already exists");

    can.changeUser({ database: dbName }, function (err) {
      if (err) throw err;
      console.log("Using database:", dbName);

      /* ---------------- USERS TABLE ---------------- */
      var usersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role ENUM('customer','barista','admin') NOT NULL,
          refresh_token TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      can.query(usersTable, function (err) {
        if (err) throw err;
        console.log("Users table created");
      });

      /* ---------------- MENU TABLE ---------------- */
      var menuTable = `
        CREATE TABLE IF NOT EXISTS menu (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100),
          description TEXT,
          category VARCHAR(50),
          price DECIMAL(10,2),
          img VARCHAR(255)
        )
      `;
      can.query(menuTable, function (err) {
        if (err) throw err;
        console.log("Menu table created");
      });

      /* ---------------- ORDERS TABLE ---------------- */
      var ordersTable = `
        CREATE TABLE IF NOT EXISTS orders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          items LONGTEXT NOT NULL,
          total DECIMAL(10,2),
          status ENUM('Preparing','Ready','Served') DEFAULT 'Preparing',
          time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      can.query(ordersTable, function (err) {
        if (err) throw err;
        console.log("Orders table created");
      });

      /* ---------------- DEFAULT ADMIN ---------------- */
      var adminInsert = `
        INSERT INTO users (email, password, role)
        SELECT * FROM (
          SELECT 'admin@mochamist.com',
                 '$2a$10$1hOqP1uH4hHhkf7S8BF7Sey7tOxFyGfF5vBZ9aLF/L/CyCyVJZZZe',
                 'admin'
        ) AS tmp
        WHERE NOT EXISTS (
          SELECT 1 FROM users WHERE email='admin@mochamist.com'
        )
        LIMIT 1
      `;
      can.query(adminInsert, function (err) {
        if (err) throw err;
        console.log("Admin created (if missing)");
      });

      /* ---------------- DEFAULT BARISTA ---------------- */
      var baristaInsert = `
        INSERT INTO users (email, password, role)
        SELECT * FROM (
          SELECT 'barista@mochamist.com',
                 '$2a$10$fe6ZyjPm7GWGLSu3H3TWuexxsB/JpDTnBkPAV/Q93SkJoefrxDPLu',
                 'barista'
        ) AS tmp
        WHERE NOT EXISTS (
          SELECT 1 FROM users WHERE email='barista@mochamist.com'
        )
        LIMIT 1
      `;
      can.query(baristaInsert, function (err) {
        if (err) throw err;
        console.log("Barista created (if missing)");
      });

      /* ---------------- INSERT DEFAULT MENU ITEMS ---------------- */
      var defaultItems = `
        INSERT INTO menu (name, description, category, price, img)
        SELECT * FROM (
            SELECT 'Cappuccino', 'Rich espresso with steamed milk foam', 'Coffee', 140, 'https://i.imgur.com/2yAfYkL.jpeg'
          UNION ALL
            SELECT 'Latte', 'Smooth and creamy milk + espresso', 'Coffee', 160, 'https://i.imgur.com/m7Iu5zs.jpeg'
          UNION ALL
            SELECT 'Cold Brew', 'Chilled slowly brewed coffee', 'Coffee', 180, 'https://i.imgur.com/lsVb3PO.jpeg'
          UNION ALL
            SELECT 'Mocha', 'Chocolate + Espresso + Milk', 'Coffee', 170, 'https://i.imgur.com/dp2BoQ4.jpeg'
          UNION ALL
            SELECT 'Espresso', 'Strong & bold single shot', 'Coffee', 90, 'https://i.imgur.com/SZlIc7r.jpeg'
        ) AS tmp
        WHERE (SELECT COUNT(*) FROM menu) = 0
      `;
      can.query(defaultItems, function (err) {
        if (err) throw err;
        console.log("Default menu items inserted (only if empty)");
      });

      /* -----------------------------------------------------
         🔥 FINAL FIX — FORCE CREATE orders IF STILL MISSING
      ------------------------------------------------------*/
      can.query("SHOW TABLES LIKE 'orders'", function (err, result) {
        if (err) throw err;

        if (result.length === 0) {
          console.log("⚠️ Orders table missing — creating now...");

          const fixOrders = `
            CREATE TABLE orders (
              id INT AUTO_INCREMENT PRIMARY KEY,
              user_id INT NOT NULL,
              items LONGTEXT NOT NULL,
              total DECIMAL(10,2),
              status ENUM('Preparing','Ready','Served') DEFAULT 'Preparing',
              time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `;

          can.query(fixOrders, function (err) {
            if (err) throw err;
            console.log("🔥 Orders table created successfully!");
          });
        } else {
          console.log("✔ Orders table already exists");
        }
      });

    });
  });
});
