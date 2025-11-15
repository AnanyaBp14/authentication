// routes/auth_pg.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
require("dotenv").config();

const router = express.Router();
const COOKIE_NAME = process.env.COOKIE_NAME || "mm_rt";

/* ---------------------------------------------
   TOKEN GENERATORS
--------------------------------------------- */
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

/* ---------------------------------------------
   LOGIN (Customer auto-registers)
--------------------------------------------- */
router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role)
    return res.status(400).json({ message: "Missing fields" });

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    let user = result.rows[0];

    /* CUSTOMER AUTO REGISTER */
    if (!user) {
      if (role !== "customer") {
        return res.status(401).json({ message: "Only customers auto-register" });
      }

      const hashed = await bcrypt.hash(password, 10);

      const inserted = await pool.query(
        `INSERT INTO users (email, password, role)
         VALUES ($1, $2, 'customer')
         RETURNING *`,
        [email, hashed]
      );

      user = inserted.rows[0];
    }

    /* CHECK PASSWORD */
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Incorrect password" });

    /* ROLE CORRECT? */
    if (user.role !== role)
      return res.status(403).json({
        message: `Account is ${user.role}. Select correct role.`
      });

    /* TOKENS */
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

    return res.json({
      message: "Login success",
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- LOGOUT ---------------- */
router.post("/logout", async (req, res) => {
  const token = req.cookies[COOKIE_NAME];

  if (token) {
    await pool.query("UPDATE users SET refresh_token=NULL WHERE refresh_token=$1", [token]);
  }

  res.clearCookie(COOKIE_NAME);
  res.json({ message: "Logged out" });
});

module.exports = router;
