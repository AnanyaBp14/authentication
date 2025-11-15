// routes/auth_pg.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const pool = require("../db");

const router = express.Router();

const COOKIE_NAME = process.env.COOKIE_NAME || "mm_rt";

/* ---------------------------------------------------------
   TOKEN GENERATORS
--------------------------------------------------------- */
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

/* ---------------------------------------------------------
   LOGIN (WITH CUSTOMER AUTO-REGISTER)
--------------------------------------------------------- */
router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    let user = result.rows[0];

    /* ---------------------------------------------
       CASE 1 — NEW CUSTOMER → AUTO REGISTER
    --------------------------------------------- */
    if (!user && role === "customer") {
      const hashed = await bcrypt.hash(password, 10);

      const insert = await pool.query(
        `INSERT INTO users (email, password, role)
         VALUES ($1, $2, 'customer')
         RETURNING *;`,
        [email, hashed]
      );

      user = insert.rows[0];
      console.log("Auto-registered new customer:", user.email);
    }

    /* ---------------------------------------------
       CASE 2 — USER NOT FOUND (barista/admin)
    --------------------------------------------- */
    if (!user) {
      return res.status(404).json({ message: "Account does not exist" });
    }

    /* ---------------------------------------------
       ROLE CHECK
    --------------------------------------------- */
    if (user.role !== role) {
      return res.status(403).json({
        message: `This account is '${user.role}'. Select correct role.`
      });
    }

    /* ---------------------------------------------
       PASSWORD VERIFY
    --------------------------------------------- */
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    /* ---------------------------------------------
       ISSUE TOKENS
    --------------------------------------------- */
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    try {
      await pool.query("UPDATE users SET refresh_token=$1 WHERE id=$2", [refreshToken, user.id]);
    } catch (e) {
      console.error("Failed to save refresh token to DB:", e);
      // Not fatal for login — continue
    }

    // Cookie options: secure in production only
    const cookieOptions = {
      httpOnly: true,
      sameSite: "none"
    };
    if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

    res.cookie(COOKIE_NAME, refreshToken, cookieOptions);

    // Return tokens and user object — frontend should save accessToken (localStorage)
    return res.json({
      message: "Login success",
      accessToken,
      refreshToken, // useful for debugging / refresh flow
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------------------
   LOGOUT
--------------------------------------------------------- */
router.post("/logout", async (req, res) => {
  const token = req.cookies[COOKIE_NAME];

  if (token) {
    try {
      await pool.query("UPDATE users SET refresh_token=NULL WHERE refresh_token=$1", [token]);
    } catch (e) {
      console.error("Failed to clear refresh token:", e);
    }
  }

  res.clearCookie(COOKIE_NAME);
  res.json({ message: "Logged out" });
});

module.exports = router;
