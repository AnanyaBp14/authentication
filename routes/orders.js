// routes/orders.js
const express = require("express");
const router = express.Router();
const db = require("../init_db");
const jwt = require("jsonwebtoken");
const { verifyAccessToken } = require("../middleware/auth");

let io = null;
function setSocketIO(_io) {
  io = _io;
}

// SQLite helpers
const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

/* ----------------------------------------------------------
   1) CUSTOMER — PLACE ORDER
-----------------------------------------------------------*/
router.post("/", verifyAccessToken, async (req, res) => {
  const { items, total } = req.body;

  if (!items || total == null)
    return res.status(400).json({ message: "Missing fields" });

  try {
    const userId = req.user.id;

    const result = await run(
      "INSERT INTO orders (user_id, items, total, status) VALUES (?, ?, ?, 'Preparing')",
      [userId, JSON.stringify(items), total]
    );

    const orderId = result.lastID;
    const order = await get("SELECT * FROM orders WHERE id=?", [orderId]);

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

/* ----------------------------------------------------------
   2) CUSTOMER — GET MY ORDERS
-----------------------------------------------------------*/
router.get("/mine", verifyAccessToken, async (req, res) => {
  try {
    const rows = await all(
      "SELECT * FROM orders WHERE user_id=? ORDER BY id DESC",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Fetch my orders error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ----------------------------------------------------------
   3) BARISTA OR ADMIN — VIEW ALL ORDERS
-----------------------------------------------------------*/
router.get("/", verifyAccessToken, async (req, res) => {
  if (!["barista", "admin"].includes(req.user.role))
    return res.status(403).json({ message: "Forbidden" });

  try {
    const rows = await all("SELECT * FROM orders ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("Orders fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ----------------------------------------------------------
   4) BARISTA OR ADMIN — UPDATE ORDER STATUS
-----------------------------------------------------------*/
router.patch("/:id/status", verifyAccessToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["barista", "admin"].includes(req.user.role))
    return res.status(403).json({ message: "Forbidden" });

  if (!["Preparing", "Ready", "Served"].includes(status))
    return res.status(400).json({ message: "Invalid status" });

  try {
    await run("UPDATE orders SET status=? WHERE id=?", [status, id]);

    const order = await get("SELECT * FROM orders WHERE id=?", [id]);

    // Notify customer
    if (io) io.to(`user_${order.user_id}`).emit("order:update", { order });

    // Notify all baristas dashboards
    if (io) io.to("baristas").emit("order:update", { order });

    res.json({ message: "Status updated", order });
  } catch (err) {
    console.error("Status update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
module.exports.setSocketIO = setSocketIO;
