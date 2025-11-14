// routes/orders.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { pool } = require("../db");

/* -------------------------------------------
   Socket.IO instance (injected from server)
-------------------------------------------- */
let io = null;
function setSocketIO(_io) {
  io = _io;
}

/* -------------------------------------------
   Middleware: Verify Access Token
-------------------------------------------- */
function verifyAccessToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "Missing token" });

  const token = header.split(" ")[1];
  try {
    const user = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

/* -------------------------------------------
   1) CUSTOMER — PLACE ORDER
-------------------------------------------- */
router.post("/", verifyAccessToken, async (req, res) => {
  const { items, total } = req.body;

  if (!items || !total) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    const userId = req.user.id;

    const [result] = await pool.query(
      "INSERT INTO orders (user_id, items, total, status) VALUES (?, ?, ?, 'Preparing')",
      [userId, JSON.stringify(items), total]
    );

    const orderId = result.insertId;

    const [rows] = await pool.query("SELECT * FROM orders WHERE id=?", [
      orderId,
    ]);
    const order = rows[0];

    // Notify baristas
    if (io) io.to("baristas").emit("order:new", { order });

    // Notify THIS customer
    if (io) io.to(`user_${userId}`).emit("order:placed", { order });

    res.json({ message: "Order placed", order });
  } catch (err) {
    console.error("Order place error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* -------------------------------------------
   2) CUSTOMER — GET MY ORDERS
-------------------------------------------- */
router.get("/mine", verifyAccessToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM orders WHERE user_id=? ORDER BY id DESC",
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Fetch my orders error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* -------------------------------------------
   3) BARISTA/ADMIN — VIEW ALL ORDERS
-------------------------------------------- */
router.get("/", verifyAccessToken, async (req, res) => {
  if (!["barista", "admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    const [rows] = await pool.query("SELECT * FROM orders ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("Orders fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* -------------------------------------------
   4) BARISTA/ADMIN — UPDATE ORDER STATUS
-------------------------------------------- */
router.patch("/:id/status", verifyAccessToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["barista", "admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (!["Preparing", "Ready", "Served"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    await pool.query("UPDATE orders SET status=? WHERE id=?", [status, id]);

    const [rows] = await pool.query("SELECT * FROM orders WHERE id=?", [id]);
    const order = rows[0];

    // Notify customer
    if (io) io.to(`user_${order.user_id}`).emit("order:update", { order });

    // Notify baristas dashboard
    if (io) io.to("baristas").emit("order:update", { order });

    res.json({ message: "Status updated", order });
  } catch (err) {
    console.error("Status update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* -------------------------------------------
   EXPORTS
-------------------------------------------- */
module.exports = router;
module.exports.setSocketIO = setSocketIO;
