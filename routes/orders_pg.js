const express = require("express");
const pool = require("../db");
const { verifyAccessToken } = require("../middleware/auth");

const router = express.Router();

let io = null;
function setSocketIO(_io) {
  io = _io;
}

/* ---------------------------------------------------------
   CUSTOMER — PLACE ORDER
--------------------------------------------------------- */
router.post("/", verifyAccessToken, async (req, res) => {
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

/* ---------------------------------------------------------
   CUSTOMER — MY ORDERS
--------------------------------------------------------- */
router.get("/mine", verifyAccessToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM orders WHERE user_id=$1 ORDER BY id DESC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch my orders error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------------------
   BARISTA — VIEW ALL ORDERS
--------------------------------------------------------- */
router.get("/", verifyAccessToken, async (req, res) => {
  if (req.user.role !== "barista")
    return res.status(403).json({ message: "Forbidden" });

  try {
    const result = await pool.query("SELECT * FROM orders ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Orders fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------------------
   BARISTA — UPDATE ORDER STATUS
--------------------------------------------------------- */
router.patch("/:id/status", verifyAccessToken, async (req, res) => {
  if (req.user.role !== "barista")
    return res.status(403).json({ message: "Forbidden" });

  const { id } = req.params;
  const { status } = req.body;

  if (!["Preparing", "Ready", "Served"].includes(status))
    return res.status(400).json({ message: "Invalid status" });

  try {
    await pool.query(
      "UPDATE orders SET status=$1 WHERE id=$2",
      [status, id]
    );

    const result = await pool.query(
      "SELECT * FROM orders WHERE id=$1",
      [id]
    );

    const order = result.rows[0];

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

module.exports = router;
module.exports.setSocketIO = setSocketIO;
