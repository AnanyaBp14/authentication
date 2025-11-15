const jwt = require("jsonwebtoken");
require("dotenv").config();

/* ------------------------------------------------------------
   VERIFY ACCESS TOKEN
-------------------------------------------------------------*/
function verifyAccessToken(req, res, next) {
  let token = null;

  // 1) Authorization Header
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "No access token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    console.error("Invalid access token:", err);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}

/* ------------------------------------------------------------
   REQUIRE SPECIFIC ROLES (e.g., barista)
-------------------------------------------------------------*/
function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ message: "Unauthorized" });

    if (!roles.includes(req.user.role))
      return res.status(403).json({ message: "Forbidden" });

    next();
  };
}

module.exports = { verifyAccessToken, requireRoles };
