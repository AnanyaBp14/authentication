// middleware/auth.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

function verifyAccessToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "Missing token" });
  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// requireRoles("barista","admin")
function requireRoles(...allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "No user" });
    if (!allowed.includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

module.exports = { verifyAccessToken, requireRoles };
