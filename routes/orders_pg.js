const express = require("express");
const router = express.Router();
const pool = require("../db");
const jwt = require("jsonwebtoken");

let io = null;
router.setSocketIO = (_io) => (io = _io);

// Verify JWT
function verifyAccessToken(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Missing token" });

    req.user = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

/* ---------------------------------------------
   CUSTOMER — PLACE ORDER
---------------------------------------------- */
router.post("/create", verifyAccessToken, async (req, res) => {
  const { items, total } = req.body;

  try {
    const q = await pool.query(
      `INSERT INTO orders (user_id, items, total, status)
       VALUES ($1,$2,$3,'Preparing')
       RETURNING *`,
      [req.user.id, JSON.stringify(items), total]
    );

    const order = q.rows[0];

    // notify baristas
    io.to("baristas").emit("new-order", { order });

    // notify customer
    io.to(`user_${req.user.id}`).emit("order:placed", { order });

    res.json({ message: "Order placed", order });

  } catch (err) {
    console.error("Order error:", err);
    res.status(500).json({ message: "Order error" });
  }
});

/* ---------------------------------------------
   CUSTOMER — MY ORDERS
---------------------------------------------- */
router.get("/mine", verifyAccessToken, async (req, res) => {
  try {
    const q = await pool.query(
      "SELECT * FROM orders WHERE user_id=$1 ORDER BY id DESC",
      [req.user.id]
    );
    res.json(q.rows);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
