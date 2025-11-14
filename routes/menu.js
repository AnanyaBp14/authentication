// routes/menu.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { verifyAccessToken, requireRoles } = require("../middleware/auth");

/* -----------------------------------------------------
   1) PUBLIC — Get full menu (no login required)
------------------------------------------------------*/
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM menu ORDER BY id ASC");
    res.json(rows);
  } catch (err) {
    console.error("Menu fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* -----------------------------------------------------
   ADMIN/BARISTA (optional): Add menu item
------------------------------------------------------*/
router.post(
  "/add",
  verifyAccessToken,
  requireRoles("admin", "barista"),
  async (req, res) => {
    const { name, description, category, price, img } = req.body;

    if (!name || !price)
      return res.status(400).json({ message: "Missing fields" });

    try {
      await pool.query(
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

/* -----------------------------------------------------
   ADMIN/BARISTA (optional): Update item
------------------------------------------------------*/
router.put(
  "/:id",
  verifyAccessToken,
  requireRoles("admin", "barista"),
  async (req, res) => {
    const { id } = req.params;
    const { name, description, category, price, img } = req.body;

    try {
      await pool.query(
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

/* -----------------------------------------------------
   ADMIN/BARISTA (optional): Delete item
------------------------------------------------------*/
router.delete(
  "/:id",
  verifyAccessToken,
  requireRoles("admin", "barista"),
  async (req, res) => {
    const { id } = req.params;

    try {
      await pool.query("DELETE FROM menu WHERE id=?", [id]);
      res.json({ message: "Menu item deleted" });
    } catch (err) {
      console.error("Menu delete error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
