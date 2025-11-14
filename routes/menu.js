// routes/menu.js
const express = require("express");
const router = express.Router();
const db = require("../init_db");
const { verifyAccessToken, requireRoles } = require("../middleware/auth");

// Promise helpers for sqlite3
const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this); // this.lastID, this.changes
    });
  });

// PUBLIC — Get full menu
router.get("/", async (req, res) => {
  try {
    const rows = await all("SELECT * FROM menu ORDER BY id ASC");
    res.json(rows);
  } catch (err) {
    console.error("Menu fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ADMIN/BARISTA: Add menu item
router.post(
  "/add",
  verifyAccessToken,
  requireRoles("admin", "barista"),
  async (req, res) => {
    const { name, description = "", category = "", price = 0, img = "" } = req.body;

    if (!name || price == null) return res.status(400).json({ message: "Missing fields" });

    try {
      await run(
        "INSERT INTO menu (name, description, category, price, img) VALUES (?, ?, ?, ?, ?)",
        [name, description, category, price, img]
      );
      res.json({ message: "Menu item added" });
    } catch (err) {
      console.error("Menu add error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ADMIN/BARISTA: Update item
router.put(
  "/:id",
  verifyAccessToken,
  requireRoles("admin", "barista"),
  async (req, res) => {
    const { id } = req.params;
    const { name, description = "", category = "", price = null, img = "" } = req.body;

    try {
      await run(
        "UPDATE menu SET name=?, description=?, category=?, price=?, img=? WHERE id=?",
        [name, description, category, price, img, id]
      );
      res.json({ message: "Menu item updated" });
    } catch (err) {
      console.error("Menu update error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ADMIN/BARISTA: Delete item
router.delete(
  "/:id",
  verifyAccessToken,
  requireRoles("admin", "barista"),
  async (req, res) => {
    const { id } = req.params;
    try {
      await run("DELETE FROM menu WHERE id=?", [id]);
      res.json({ message: "Menu item deleted" });
    } catch (err) {
      console.error("Menu delete error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
