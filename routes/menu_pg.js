// routes/menu_pg.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { verifyAccessToken, requireRoles } = require("../middleware/auth");

router.get("/", async (req, res) => {
  try {
    const menu = await pool.query("SELECT * FROM menu ORDER BY id ASC");
    res.json(menu.rows);
  } catch (err) {
    res.status(500).json({ message: "Menu fetch error" });
  }
});

router.post(
  "/add",
  verifyAccessToken,
  requireRoles("barista"),
  async (req, res) => {
    const { name, description, category, price } = req.body;

    if (!name || !price)
      return res.status(400).json({ message: "Missing fields" });

    try {
      await pool.query(
        `INSERT INTO menu (name, description, category, price)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT(name) DO NOTHING`,
        [name, description, category, price]
      );

      res.json({ message: "Menu item added" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Menu add error" });
    }
  }
);

router.delete(
  "/:id",
  verifyAccessToken,
  requireRoles("barista"),
  async (req, res) => {
    try {
      await pool.query("DELETE FROM menu WHERE id=$1", [req.params.id]);
      res.json({ message: "Menu item deleted" });
    } catch (err) {
      res.status(500).json({ message: "Delete failed" });
    }
  }
);

module.exports = router;
