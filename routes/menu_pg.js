// routes/menu_pg.js
const express = require("express");
const router = express.Router();
const pool = require("../db");

/* -----------------------------------------------------
   PUBLIC — FETCH FULL MENU (no login required)
------------------------------------------------------ */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, description, category, price FROM menu ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Menu fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
