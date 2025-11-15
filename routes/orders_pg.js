// routes/orders_pg.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { verifyAccessToken, requireRoles } = require("../middleware/auth");

let io = null;
router.setSocketIO = (x) => (io = x);

/* CUSTOMER — PLACE ORDER */
router.post("/create",
  verifyAccessToken,
  requireRoles("customer"),
  async (req, res) => {
    try {
      const { items, total } = req.body;
      const userId = req.user.id;

      const result = await pool.query(
        `INSERT INTO orders (user_id, items, total)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, JSON.stringify(items), total]
      );

      const order = result.rows[0];

      io.to("baristas").emit("order:new", { order });
      io.to(`user_${userId}`).emit("order:placed", { order });

      res.json({ message: "Order placed", order });
    } catch (err) {
      console.log("ORDER ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/* CUSTOMER — GET MY ORDERS */
router.get("/mine",
  verifyAccessToken,
  requireRoles("customer"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM orders WHERE user_id=$1 ORDER BY id DESC`,
        [req.user.id]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
module.exports.setSocketIO = router.setSocketIO;
