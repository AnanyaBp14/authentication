// routes/orders_pg.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { verifyAccessToken } = require("../middleware/auth");

let io = null;
router.setSocketIO = (_io) => (io = _io);

/* ---------------- PLACE ORDER ---------------- */
router.post("/create", verifyAccessToken, async (req, res) => {
  const { items, total } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO orders (user_id, items, total, status)
       VALUES ($1,$2,$3,'Preparing')
       RETURNING *`,
      [req.user.id, JSON.stringify(items), total]
    );

    const order = result.rows[0];

    io.to("baristas").emit("order:new", { order });
    io.to(`user_${req.user.id}`).emit("order:placed", { order });

    res.json({ message: "Order placed", order });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- GET MY ORDERS ---------------- */
router.get("/mine", verifyAccessToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM orders WHERE user_id=$1 ORDER BY id DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch my orders error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- BARISTA: ALL ORDERS ---------------- */
router.get("/", verifyAccessToken, async (req, res) => {
  if (!["barista", "admin"].includes(req.user.role))
    return res.status(403).json({ message: "Forbidden" });

  try {
    const result = await pool.query("SELECT * FROM orders ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Orders error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- BARISTA: UPDATE ORDER ---------------- */
router.patch("/:id/status", verifyAccessToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["barista", "admin"].includes(req.user.role))
    return res.status(403).json({ message: "Forbidden" });

  try {
    await pool.query(`UPDATE orders SET status=$1 WHERE id=$2`, [status, id]);

    const updated = await pool.query(`SELECT * FROM orders WHERE id=$1`, [id]);
    const order = updated.rows[0];

    io.to(`user_${order.user_id}`).emit("order:update", { order });
    io.to("baristas").emit("order:update", { order });

    res.json({ message: "Status updated", order });

  } catch (err) {
    console.error("Status update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
