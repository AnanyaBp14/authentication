// routes/debug.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcryptjs");

// ⚠️ WARNING: TEMPORARY DEBUG ROUTE
router.get("/fix-barista", async (req, res) => {
  try {
    const hashed = await bcrypt.hash("barista123", 10);

    await pool.query(
      `UPDATE users SET password=$1 WHERE email='barista@mochamist.com'`,
      [hashed]
    );

    res.json({
      message: "Barista password reset to 'barista123'"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fixing barista password" });
  }
});

module.exports = router;
