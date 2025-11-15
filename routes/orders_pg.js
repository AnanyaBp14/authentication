const express = require("express");
const router = express.Router();
const pool = require("../db");
const { verifyAccessToken, requireRoles } = require("../middleware/auth");

let io = null;
router.setSocket = (socket) => (io = socket);

/* --------------------------------------------------
   1. CUSTOMER — CREATE ORDER
-------------------------------------------------- */
router.post(
  "/create",
  verifyAccessToken,
  requireRoles("customer"),
  async (req, res) => {
    const { items, total } = req.body;

    if (!items || !total) {
      return res.status(400).json({ message: "Missing fields" });
    }

    try {
      const result = await pool.query(
        `INSERT INTO orders (user_id, items, total, status, time)
         VALUES ($1, $2, $3, 'Preparing', NOW())
         RETURNING *`,
        [req.user.id, JSON.stringify(items), total]
      );

      const order = result.rows[0];

      // notify all baristas (socket)
      if (io) io.to("baristas").emit("order:new", order);

      res.json({ message: "Order placed", order });
    } catch (err) {
      console.error("❌ Order create error:", err.message);
      res.status(500).json({ message: "Order failed" });
    }
  }
);

/* --------------------------------------------------
   2. CUSTOMER — VIEW MY ORDERS
-------------------------------------------------- */
router.get(
  "/mine",
  verifyAccessToken,
  requireRoles("customer"),
  async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM orders WHERE user_id=$1 ORDER BY id DESC",
        [req.user.id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("❌ My orders error:", err.message);
      res.status(500).json({ message: "Failed to load orders" });
    }
  }
);

/* --------------------------------------------------
   3. BARISTA — GET ALL ORDERS
-------------------------------------------------- */
router.get(
  "/",
  verifyAccessToken,
  requireRoles("barista", "admin"),
  async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM orders ORDER BY id DESC"
      );
      res.json(result.rows);
    } catch (err) {
      console.error("❌ Orders fetch error:", err.message);
      res.status(500).json({ message: "Failed to load orders" });
    }
  }
);

/* --------------------------------------------------
   4. BARISTA — UPDATE STATUS
-------------------------------------------------- */
router.put(
  "/status/:id",
  verifyAccessToken,
  requireRoles("barista", "admin"),
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Preparing", "Ready", "Served"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    try {
      const result = await pool.query(
        "UPDATE orders SET status=$1 WHERE id=$2 RETURNING *",
        [status, id]
      );

      const order = result.rows[0];
      if (!order) return res.status(404).json({ message: "Order not found" });

      // notify customer
      if (io) io.to(`user_${order.user_id}`).emit("order:update", order);

      // notify baristas
      if (io) io.to("baristas").emit("order:update", order);

      res.json({ message: "Status updated", order });
    } catch (err) {
      console.error("❌ Status update error:", err.message);
      res.status(500).json({ message: "Status update failed" });
    }
  }
);

module.exports = router;
