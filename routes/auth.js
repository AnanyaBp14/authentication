const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../db");
require("dotenv").config();

const router = express.Router();

// Cookie name (refresh token)
const COOKIE_NAME = process.env.COOKIE_NAME || "mm_rt";

/* ---------------------------------------------------
   TOKEN HELPERS
-----------------------------------------------------*/
function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXP || "15m" }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXP || "7d" }
  );
}

/* ---------------------------------------------------
   LOGIN (Admin, Barista, Customer)
-----------------------------------------------------*/
router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Missing fields" });

  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email=?", [
      email,
    ]);

    /* ---------------------------------------------------
       CASE 1: CUSTOMER DOES NOT EXIST → AUTO-REGISTER
    -----------------------------------------------------*/
    if (rows.length === 0) {
      if (role !== "customer")
        return res.status(401).json({
          message: "Account does not exist. Only customers auto-register.",
        });

      const hashed = await bcrypt.hash(password, 10);

      await pool.query(
        "INSERT INTO users (email, password, role) VALUES (?, ?, 'customer')",
        [email, hashed]
      );

      const [newUserRows] = await pool.query(
        "SELECT * FROM users WHERE email=?",
        [email]
      );

      const user = newUserRows[0];
      const accessToken = signAccessToken(user);
      const refreshToken = signRefreshToken(user);

      await pool.query("UPDATE users SET refresh_token=? WHERE id=?", [
        refreshToken,
        user.id,
      ]);

      res.cookie(COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        message: "New customer created",
        accessToken,
        user: { id: user.id, email: user.email, role: user.role },
      });
    }

    /* ---------------------------------------------------
       CASE 2: USER EXISTS
    -----------------------------------------------------*/
    const user = rows[0];

    // Validate Password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ message: "Incorrect password" });

    // Role mismatch protection (optional safety)
    if (user.role !== role)
      return res.status(403).json({
        message: `This account is a ${user.role}. Select correct role.`,
      });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    await pool.query("UPDATE users SET refresh_token=? WHERE id=?", [
      refreshToken,
      user.id,
    ]);

    res.cookie(COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      message: `${user.role} login success`,
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------------
   LOGOUT
-----------------------------------------------------*/
router.post("/logout", async (req, res) => {
  const token = req.cookies[COOKIE_NAME];

  if (!token) return res.json({ message: "Logged out" });

  await pool.query(
    "UPDATE users SET refresh_token=NULL WHERE refresh_token=?",
    [token]
  );

  res.clearCookie(COOKIE_NAME);
  res.json({ message: "Logged out" });
});

module.exports = router;
