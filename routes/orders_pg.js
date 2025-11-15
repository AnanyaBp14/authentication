// routes/orders_pg.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const pool = require("../db");

let io = null;
router.setSocketIO = (_io) => (io = _io);

/* ---------------- VERIFY ACCESS TOKEN ---------------- */
function verifyAccessToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "Missing token" });

  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

/* ---------------- CUSTOMER: PLACE ORDER ---------------- */
router.post("/", verifyAccessToken, async (req, res) => {
  const { items, total } = req.body;
  const userId = req.user.id;

  if (!items || !total)
    return res.status(400).json({ message: "Missing fields" });

  try {
    const insert = await pool.query(
      `INSERT INTO orders (user_id, items, total, status)
       VALUES ($1, $2, $3, 'Preparing')
       RETURNING *`,
      [userId, JSON.stringify(items), total]
    );

    const order = insert.rows[0];

    // Notify baristas
    if (io) io.to("baristas").emit("order:new", { order });

    // Notify this customer
    if (io) io.to(`user_${userId}`).emit("order:placed", { order });

    return res.json({ message: "Order placed", order });
  } catch (err) {
    console.error("PG Order Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- CUSTOMER: MY ORDERS ---------------- */
router.get("/mine", verifyAccessToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM orders WHERE user_id=$1 ORDER BY id DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("PG Mine Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- BARISTA: ALL ORDERS ---------------- */
router.get("/", verifyAccessToken, async (req, res) => {
  if (!["barista", "admin"].includes(req.user.role))
    return res.status(403).json({ message: "Forbidden" });

  try {
    const result = await pool.query(`SELECT * FROM orders ORDER BY id DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error("PG Fetch Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- BARISTA: UPDATE STATUS ---------------- */
router.patch("/:id/status", verifyAccessToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["Preparing", "Ready", "Served"].includes(status))
    return res.status(400).json({ message: "Invalid status" });

  if (!["barista", "admin"].includes(req.user.role))
    return res.status(403).json({ message: "Forbidden" });

  try {
    await pool.query(`UPDATE orders SET status=$1 WHERE id=$2`, [status, id]);

    const result = await pool.query(`SELECT * FROM orders WHERE id=$1`, [id]);
    const order = result.rows[0];

    io.to(`user_${order.user_id}`).emit("order:update", { order });
    io.to("baristas").emit("order:update", { order });

    res.json({ message: "Status updated", order });
  } catch (err) {
    console.error("PG Status Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
module.exports.setSocketIO = router.setSocketIO;
