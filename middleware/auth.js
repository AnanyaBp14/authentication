// middleware/auth.js
const jwt = require("jsonwebtoken");

/* ----------------------------------------
   Verify Access Token from Authorization header
   Format: Authorization: Bearer <token>
-----------------------------------------*/
function verifyAccessToken(req, res, next) {
  const header = req.headers.authorization;

  if (!header)
    return res.status(401).json({ message: "Missing token" });

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded;  // user = { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/* --------------------------------------------------
   Role-based protection (Admin / Barista only routes)
   Usage example:
      router.get("/admin", requireRole("admin"), ...
----------------------------------------------------*/
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ message: "Not authenticated" });

    if (req.user.role !== role)
      return res.status(403).json({ message: "Forbidden" });

    next();
  };
}

/* --------------------------------------------------
   Allow multiple roles
   requireRoles("barista", "admin")
----------------------------------------------------*/
function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ message: "Not authenticated" });

    if (!roles.includes(req.user.role))
      return res.status(403).json({ message: "Forbidden" });

    next();
  };
}

module.exports = {
  verifyAccessToken,
  requireRole,
  requireRoles
};
