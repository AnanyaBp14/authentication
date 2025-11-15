// routes/auth_pg.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();
const COOKIE_NAME = process.env.COOKIE_NAME || "mm_rt";

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "15m" }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role)
    return res.status(400).json({ message: "Missing fields" });

  try {
    let user = (await pool.query("SELECT * FROM users WHERE email=$1", [email])).rows[0];

    if (!user) {
      // Auto-create customer
      if (role !== "customer")
        return res.status(401).json({ message: "Only customers auto-register" });

      const hashed = await bcrypt.hash(password, 10);

      user = (await pool.query(
        `INSERT INTO users (email, password, role)
         VALUES ($1,$2,'customer')
         RETURNING *`,
        [email, hashed]
      )).rows[0];
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Incorrect password" });

    if (user.role !== role)
      return res.status(403).json({ message: `Account is ${user.role}` });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    await pool.query(
      "UPDATE users SET refresh_token=$1 WHERE id=$2",
      [refreshToken, user.id]
    );

    res.cookie(COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    });

    res.json({
      message: "Login success",
      accessToken,
      user: { id: user.id, email: user.email, role: user.role }
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
