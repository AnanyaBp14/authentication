// routes/menu_pg.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { verifyAccessToken, requireRoles } = require("../middleware/auth");

let io = null;
router.setSocketIO = (_io) => (io = _io);

/* ---------------- PUBLIC MENU ---------------- */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM menu ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Menu error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- ADD MENU ---------------- */
router.post(
  "/add",
  verifyAccessToken,
  requireRoles("admin", "barista"),
  async (req, res) => {
    const { name, description, category, price, img } = req.body;

    try {
      await pool.query(
        `INSERT INTO menu (name, description, category, price, img)
         VALUES ($1,$2,$3,$4,$5)`,
        [name, description, category, price, img]
      );

      if (io) io.emit("menu:update");
      res.json({ message: "Item added" });

    } catch (err) {
      console.error("Add menu error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/* ---------------- UPDATE MENU ---------------- */
router.put(
  "/:id",
  verifyAccessToken,
  requireRoles("admin", "barista"),
  async (req, res) => {
    const { id } = req.params;
    const { name, description, category, price, img } = req.body;

    try {
      await pool.query(
        `UPDATE menu
         SET name=$1, description=$2, category=$3, price=$4, img=$5
         WHERE id=$6`,
        [name, description, category, price, img, id]
      );

      if (io) io.emit("menu:update");
      res.json({ message: "Item updated" });

    } catch (err) {
      console.error("Update menu error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/* ---------------- DELETE MENU ---------------- */
router.delete(
  "/:id",
  verifyAccessToken,
  requireRoles("admin", "barista"),
  async (req, res) => {
    const { id } = req.params;

    try {
      await pool.query("DELETE FROM menu WHERE id=$1", [id]);

      if (io) io.emit("menu:update");
      res.json({ message: "Item deleted" });

    } catch (err) {
      console.error("Delete menu error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
