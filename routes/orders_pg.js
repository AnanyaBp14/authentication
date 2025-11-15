// routes/orders_pg.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const pool = require("../db");

/* -------------------------------------------
   Inject Socket.IO
-------------------------------------------- */
let io = null;
router.setSocketIO = (_io) => (io = _io);

/* -------------------------------------------
   Verify Access Token
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
router.post("/create", verifyAccessToken, async (req, res) => {
  const { items, total } = req.body;

  if (!items || !total)
    return res.status(400).json({ message: "Missing fields" });

  try {
    const userId = req.user.id;

    const result = await pool.query(
      `INSERT INTO orders (user_id, items, total, status)
       VALUES ($1, $2, $3, 'Preparing')
       RETURNING *`,
      [userId, JSON.stringify(items), total]
    );

    const order = result.rows[0];

    // Notify baristas
    if (io) io.to("baristas").emit("order:new", { order });

    // Notify customer
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
    const result = await pool.query(
      "SELECT * FROM orders WHERE user_id=$1 ORDER BY id DESC",
      [userId]
    );
    res.json(result.rows);
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
    const result = await pool.query("SELECT * FROM orders ORDER BY id DESC");
    res.json(result.rows);
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
    await pool.query(
      "UPDATE orders SET status=$1 WHERE id=$2",
      [status, id]
    );

    const orderResult = await pool.query(
      "SELECT * FROM orders WHERE id=$1",
      [id]
    );
    const order = orderResult.rows[0];

    // Notify the customer
    if (io) io.to(`user_${order.user_id}`).emit("order:update", { order });

    // Notify baristas
    if (io) io.to("baristas").emit("order:update", { order });

    res.json({ message: "Status updated", order });
  } catch (err) {
    console.error("Status update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
