// routes/orders_pg.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { verifyAccessToken, requireRoles } = require("../middleware/auth");

let io = null;
router.setSocketIO = (socketInstance) => (io = socketInstance);

/* CUSTOMER — place order */
router.post(
  "/create",
  verifyAccessToken,
  requireRoles("customer"),
  async (req, res) => {
    const { items, total } = req.body;

    try {
      const result = await pool.query(
        `INSERT INTO orders (user_id, items, total)
         VALUES ($1,$2,$3)
         RETURNING *`,
        [req.user.id, JSON.stringify(items), total]
      );

      io.to("baristas").emit("new-order", result.rows[0]);

      res.json({ message: "Order placed", order: result.rows[0] });
    } catch (err) {
      res.status(500).json({ message: "Order error" });
    }
  }
);

/* BARISTA — get orders */
router.get(
  "/all",
  verifyAccessToken,
  requireRoles("barista"),
  async (_, res) => {
    const result = await pool.query("SELECT * FROM orders ORDER BY id DESC");
    res.json(result.rows);
  }
);

/* BARISTA — update status */
router.put(
  "/status/:id",
  verifyAccessToken,
  requireRoles("barista"),
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    await pool.query(
      "UPDATE orders SET status=$1 WHERE id=$2",
      [status, id]
    );

    io.emit("order-status", { id, status });

    res.json({ message: "Order updated" });
  }
);

module.exports = router;
