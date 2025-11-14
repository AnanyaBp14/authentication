// middleware/auth.js
require("dotenv").config();
const jwt = require("jsonwebtoken");
const db = require("../init_db");

// small helper to fetch user by id from SQLite
const getUserById = (id) =>
  new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

function verifyAccessToken(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header) return res.status(401).json({ message: "Missing token" });

  const parts = header.split(" ");
  if (parts.length !== 2) return res.status(401).json({ message: "Invalid token format" });

  const token = parts[1];
  try {
    const user = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    // attach user payload (id, email, role) to req.user
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// factory to require one or more roles
function requireRoles(...allowedRoles) {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Missing token" });
      // optionally, fetch fresh role from DB to be safe
      const fresh = await getUserById(req.user.id);
      if (!fresh) return res.status(401).json({ message: "User not found" });

      if (!allowedRoles.includes(fresh.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // attach fresh user info
      req.user = { id: fresh.id, email: fresh.email, role: fresh.role };
      next();
    } catch (err) {
      console.error("requireRoles error:", err);
      res.status(500).json({ message: "Server error" });
    }
  };
}

module.exports = { verifyAccessToken, requireRoles, getUserById };
