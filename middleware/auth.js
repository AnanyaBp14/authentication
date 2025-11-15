// middleware/auth.js
const jwt = require("jsonwebtoken");

function verifyAccessToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(403).json({ message: "Invalid token" });
  }
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res.status(403).json({ message: "Access denied" });

    next();
  };
}

module.exports = { verifyAccessToken, requireRoles };
