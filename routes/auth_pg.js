// routes/auth_pg.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
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
   LOGIN / AUTO REGISTER CUSTOMER
--------------------------------------------------------- */
router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role)
    return res.status(400).json({ message: "Missing fields" });

  try {
    // Find user
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);
    let user = result.rows[0];

    /* ---------------------------------------------------------
       AUTO-REGISTER CUSTOMER
    --------------------------------------------------------- */
    if (!user && role === "customer") {
      const hashed = await bcrypt.hash(password, 10);

      const insert = await pool.query(
        `INSERT INTO users (email, password, role)
         VALUES ($1, $2, 'customer')
         RETURNING *;`,
        [email, hashed]
      );

      user = insert.rows[0];
    }

    // If still no user → wrong email
    if (!user)
      return res.status(404).json({ message: "No account found for this email" });

    /* ---------------------------------------------------------
       ROLE MISMATCH
    --------------------------------------------------------- */
    if (user.role !== role) {
      return res.status(403).json({
        message: `This email belongs to a ${user.role} account.`,
      });
    }

    /* ---------------------------------------------------------
       PASSWORD CHECK
    --------------------------------------------------------- */
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(401).json({ message: "Incorrect password" });

    /* ---------------------------------------------------------
       TOKENS
    --------------------------------------------------------- */
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // Store refresh token in DB
    await pool.query(
      "UPDATE users SET refresh_token=$1 WHERE id=$2",
      [refreshToken, user.id]
    );

    // Render requires SameSite=None + secure
    res.cookie(COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    return res.json({
      message: "Login successful",
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------------------
   LOGOUT
--------------------------------------------------------- */
router.post("/logout", async (req, res) => {
  const token = req.cookies[COOKIE_NAME];

  if (token) {
    await pool.query("UPDATE users SET refresh_token=null WHERE refresh_token=$1", [
      token,
    ]);
  }

  res.clearCookie(COOKIE_NAME);
  res.json({ message: "Logged out" });
});

module.exports = router;
