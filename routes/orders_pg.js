// routes/orders_pg.js
const express = require("express");
const pool = require("../db");
const { verifyAccessToken, requireRoles } = require("../middleware/auth");
const router = express.Router();

let io = null;
function setSocketIO(socketInstance) { io = socketInstance; }

// POST /create  (customer place order)
router.post("/create", verifyAccessToken, requireRoles("customer"), async (req, res) => {
  const { items, total } = req.body;
  if (!items || total == null) return res.status(400).json({ message: "Missing fields" });

  try {
    const result = await pool.query(
      "INSERT INTO orders (user_id, items, total) VALUES ($1,$2,$3) RETURNING *",
      [req.user.id, JSON.stringify(items), total]
    );
    const order = result.rows[0];

    // emit to baristas
    if (io) io.to("baristas").emit("new-order", { order });
    // emit to customer sockets (they join room user_{id} on socket.connect)
    if (io) io.to(`user_${req.user.id}`).emit("order:placed", { order });

    res.json({ message: "Order placed", order });
  } catch (err) {
    console.error("Order place error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /mine
router.get("/mine", verifyAccessToken, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM orders WHERE user_id=$1 ORDER BY id DESC", [req.user.id]);
    res.json(r.rows);
  } catch (err) {
    console.error("Fetch my orders error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /all (barista)
router.get("/all", verifyAccessToken, requireRoles("barista", "admin"), async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM orders ORDER BY id DESC");
    res.json(r.rows);
  } catch (err) {
    console.error("Orders fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /status/:id
router.put("/status/:id", verifyAccessToken, requireRoles("barista", "admin"), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!["Preparing", "Ready", "Served"].includes(status)) return res.status(400).json({ message: "Invalid status" });

  try {
    await pool.query("UPDATE orders SET status=$1 WHERE id=$2", [status, id]);
    const r = await pool.query("SELECT * FROM orders WHERE id=$1", [id]);
    const order = r.rows[0];
    if (io) {
      io.to(`user_${order.user_id}`).emit("order:update", { order });
      io.to("baristas").emit("order:update", { order });
    }
    res.json({ message: "Order updated", order });
  } catch (err) {
    console.error("Status update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
module.exports.setSocketIO = setSocketIO;
