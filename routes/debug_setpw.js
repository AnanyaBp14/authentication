// routes/debug_setpw.js (TEMPORARY — delete after use)
const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db");
const router = express.Router();

router.post("/fix-barista", async (req, res) => {
  try {
    const newPlainPassword = "barista123";  // ⭐ desired password
    const hashed = bcrypt.hashSync(newPlainPassword, 10);

    await pool.query(
      "UPDATE users SET password=$1 WHERE email='barista@mochamist.com'",
      [hashed]
    );

    res.json({
      message: "Barista password updated successfully",
      newPassword: newPlainPassword
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating password", error: err });
  }
});

module.exports = router;
