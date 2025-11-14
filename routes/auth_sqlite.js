const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../init_db");
require("dotenv").config();

const router = express.Router();
const COOKIE_NAME = process.env.COOKIE_NAME || "mm_rt";

// SQLite helpers
const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this); // lastID
    });
  });

// TOKEN GENERATORS
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

// LOGIN ROUTE
router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Missing fields" });

  try {
    const user = await get("SELECT * FROM users WHERE email=?", [email]);

    // AUTO REGISTER CUSTOMER
    if (!user) {
      if (role !== "customer")
        return res.status(401).json({
          message: "Only customers auto-register",
        });

      const hashed = await bcrypt.hash(password, 10);

      const insert = await run(
        "INSERT INTO users (email, password, role) VALUES (?, ?, 'customer')",
        [email, hashed]
      );

      const newUser = {
        id: insert.lastID,
        email,
        role: "customer"
      };

      const accessToken = signAccessToken(newUser);
      const refreshToken = signRefreshToken(newUser);

      await run("UPDATE users SET refresh_token=? WHERE id=?", [
        refreshToken,
        newUser.id,
      ]);

      res.cookie(COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      });

      return res.json({
        message: "Customer registered",
        accessToken,
        user: newUser,
      });
    }

    // EXISTING USER LOGIN
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ message: "Incorrect password" });

    if (user.role !== role)
      return res.status(403).json({
        message: `This account is ${user.role}. Select correct role.`,
      });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    await run("UPDATE users SET refresh_token=? WHERE id=?", [
      refreshToken,
      user.id,
    ]);

    res.cookie(COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    return res.json({
      message: "Login success",
      accessToken,
      user,
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// LOGOUT
router.post("/logout", async (req, res) => {
  const token = req.cookies[COOKIE_NAME];

  if (!token) return res.json({ message: "Logged out" });

  await run("UPDATE users SET refresh_token=NULL WHERE refresh_token=?", [
    token,
  ]);

  res.clearCookie(COOKIE_NAME);
  res.json({ message: "Logged out" });
});

module.exports = router;
