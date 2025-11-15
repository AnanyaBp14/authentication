const express = require("express");
const router = express.Router();
const pool = require("../db");
const { verifyAccessToken, requireRoles } = require("../middleware/auth");

let io = null;
router.setSocketIO = (socket) => (io = socket);

/* -----------------------------------------
   PUBLIC — Get full menu
------------------------------------------ */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM menu ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Menu fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* -----------------------------------------
   BARISTA — Add menu item
------------------------------------------ */
router.post(
  "/add",
  verifyAccessToken,
  requireRoles("barista", "admin"),
  async (req, res) => {
    const { name, description, category, price, img } = req.body;

    if (!name || !price) {
      return res.status(400).json({ message: "Missing fields" });
    }

    try {
      const result = await pool.query(
        `INSERT INTO menu (name, description, category, price, img)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [name, description || "", category || "", price, img || ""]
      );

      const item = result.rows[0];

      if (io) io.emit("menu:update", { type: "add", item });

      res.json({ message: "Item added", item });
    } catch (err) {
      console.error("Menu add error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/* -----------------------------------------
   BARISTA — Delete item
------------------------------------------ */
router.delete(
  "/:id",
  verifyAccessToken,
  requireRoles("barista", "admin"),
  async (req, res) => {
    const { id } = req.params;

    try {
      await pool.query("DELETE FROM menu WHERE id=$1", [id]);

      if (io) io.emit("menu:update", { type: "delete", id });

      res.json({ message: "Item deleted" });
    } catch (err) {
      console.error("Menu delete error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
