// routes/menu_pg.js
const express = require("express");
const router = express.Router();
const pool = require("../db");   // Postgres pool
const { verifyAccessToken, requireRoles } = require("../middleware/auth");

/* -------------------------------------------------------
   1) PUBLIC — GET MENU (NO LOGIN REQUIRED)
-------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM menu ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Menu fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* -------------------------------------------------------
   2) BARISTA/ADMIN — ADD ITEM
-------------------------------------------------------- */
router.post(
  "/add",
  verifyAccessToken,
  requireRoles("barista", "admin"),
  async (req, res) => {
    const { name, description, category, price } = req.body;

    if (!name || !price)
      return res.status(400).json({ message: "Missing fields" });

    try {
      await pool.query(
        `INSERT INTO menu (name, description, category, price)
         VALUES ($1, $2, $3, $4)`,
        [name, description, category, price]
      );

      res.json({ message: "Menu item added" });
    } catch (err) {
      console.error("Menu add error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/* -------------------------------------------------------
   3) BARISTA/ADMIN — DELETE ITEM
-------------------------------------------------------- */
router.delete(
  "/:id",
  verifyAccessToken,
  requireRoles("barista", "admin"),
  async (req, res) => {
    const id = req.params.id;

    try {
      await pool.query("DELETE FROM menu WHERE id = $1", [id]);
      res.json({ message: "Menu item deleted" });
    } catch (err) {
      console.error("Menu delete error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
