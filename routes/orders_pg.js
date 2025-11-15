const express = require("express");
const router = express.Router();
const pool = require("../db");
const { verifyAccessToken, requireRoles } = require("../middleware/auth");

let io = null;
router.setSocketIO = (socketInstance) => (io = socketInstance);

/* ----------------------------------------------------
   CUSTOMER — PLACE ORDER
---------------------------------------------------- */
router.post(
  "/create",
  verifyAccessToken,
  requireRoles("customer"),
  async (req, res) => {
    const { items, total } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items in order" });
    }

    try {
      const result = await pool.query(
        `INSERT INTO orders (user_id, items, total)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [req.user.id, JSON.stringify(items), total]
      );

      const order = result.rows[0];

      // send event to baristas
      if (io) io.to("baristas").emit("new-order", order);

      res.json({
        message: "Order placed",
        order
      });
    } catch (err) {
      console.error("Order create error:", err);
      res.status(500).json({ message: "Order error" });
    }
  }
);

/* ----------------------------------------------------
   CUSTOMER — GET OWN ORDERS
---------------------------------------------------- */
router.get(
  "/mine",
  verifyAccessToken,
  requireRoles("customer"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM orders
         WHERE user_id = $1
         ORDER BY id DESC`,
        [req.user.id]
      );

      res.json(result.rows);
    } catch (err) {
      console.error("Orders mine error:", err);
      res.status(500).json({ message: "Failed to load orders" });
    }
  }
);

/* ----------------------------------------------------
   BARISTA — GET ALL ORDERS
---------------------------------------------------- */
router.get(
  "/all",
  verifyAccessToken,
  requireRoles("barista"),
  async (_, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM orders ORDER BY id DESC"
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Barista get all error:", err);
      res.status(500).json({ message: "Failed to load orders" });
    }
  }
);

/* ----------------------------------------------------
   BARISTA — UPDATE ORDER STATUS
---------------------------------------------------- */
router.put(
  "/status/:id",
  verifyAccessToken,
  requireRoles("barista"),
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status)
      return res.status(400).json({ message: "Missing status" });

    try {
      await pool.query(
        "UPDATE orders SET status = $1 WHERE id = $2",
        [status, id]
      );

      if (io) io.emit("order-status", { id, status });

      res.json({ message: "Order updated" });
    } catch (err) {
      console.error("Status update error:", err);
      res.status(500).json({ message: "Failed to update order" });
    }
  }
);

module.exports = router;
