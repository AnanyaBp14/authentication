// routes/orders_pg.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { verifyAccessToken, requireRoles } = require("../middleware/auth");

let io = null;
router.setSocketIO = s => io = s;

/* CUSTOMER — PLACE ORDER */
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

      // Notify baristas
      io.to("baristas").emit("new-order", result.rows[0]);

      res.json({
        message: "Order placed",
        order: result.rows[0]
      });

    } catch (err) {
      console.error("Order error:", err);
      res.status(500).json({ message: "Order failed" });
    }
  }
);

/* CUSTOMER — THEIR OWN ORDERS */
router.get(
  "/mine",
  verifyAccessToken,
  requireRoles("customer"),
  async (req, res) => {
    const result = await pool.query(
      "SELECT * FROM orders WHERE user_id=$1 ORDER BY id DESC",
      [req.user.id]
    );
    res.json(result.rows);
  }
);

/* BARISTA — ALL ORDERS */
router.get(
  "/all",
  verifyAccessToken,
  requireRoles("barista"),
  async (req, res) => {
    const result = await pool.query(
      "SELECT * FROM orders ORDER BY id DESC"
    );
    res.json(result.rows);
  }
);

/* BARISTA — UPDATE STATUS */
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
    res.json({ message: "Status updated" });
  }
);

module.exports = router;
