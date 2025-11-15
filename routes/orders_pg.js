// routes/orders_pg.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { verifyAccessToken, requireRoles } = require("../middleware/auth");

let io = null;
function setSocketIO(_io) { io = _io; }

/* CUSTOMER — create order (POST /api/orders/create) */
router.post("/create", verifyAccessToken, requireRoles("customer"), async (req, res) => {
  const { items, total } = req.body;
  if (!items || total == null) return res.status(400).json({ message: "Missing fields" });

  try {
    const result = await pool.query(
      `INSERT INTO orders (user_id, items, total, status) VALUES ($1, $2, $3, 'Preparing') RETURNING *`,
      [req.user.id, JSON.stringify(items), total]
    );
    const order = result.rows[0];

    // notify baristas
    if (io) io.to("baristas").emit("order:new", { order });

    // notify customer room
    if (io) io.to(`user_${req.user.id}`).emit("order:placed", { order });

    res.json({ message: "Order placed", order });
  } catch (err) {
    console.error("Order create error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* CUSTOMER — get my orders (GET /api/orders/mine) */
router.get("/mine", verifyAccessToken, requireRoles("customer", "barista", "admin"), async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM orders WHERE user_id=$1 ORDER BY id DESC", [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch my orders error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* BARISTA/ADMIN — get all orders (GET /api/orders) */
router.get("/", verifyAccessToken, requireRoles("barista", "admin"), async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM orders ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch orders error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* BARISTA — update status (PUT /api/orders/status/:id) */
router.put("/status/:id", verifyAccessToken, requireRoles("barista", "admin"), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!["Preparing", "Ready", "Served"].includes(status)) return res.status(400).json({ message: "Invalid status" });

  try {
    await pool.query("UPDATE orders SET status=$1 WHERE id=$2", [status, id]);
    const r = await pool.query("SELECT * FROM orders WHERE id=$1", [id]);
    const order = r.rows[0];

    // notify the specific customer
    if (io) io.to(`user_${order.user_id}`).emit("order:update", { order });

    // notify baristas dashboards
    if (io) io.to("baristas").emit("order:update", { order });

    res.json({ message: "Status updated", order });
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
module.exports.setSocketIO = setSocketIO;
