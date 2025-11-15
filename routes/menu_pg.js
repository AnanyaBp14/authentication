const express = require("express");
const router = express.Router();
const pool = require("../db");
const { verifyAccessToken, requireRoles } = require("../middleware/auth");

/* ---------------------------------------------------------
   PUBLIC — Get Menu
--------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM menu ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Menu fetch error:", err);
    res.status(500).json({ message: "Menu fetch failed" });
  }
});

/* ---------------------------------------------------------
   BARISTA / ADMIN — Add menu item
--------------------------------------------------------- */
router.post(
  "/add",
  verifyAccessToken,
  requireRoles("barista", "admin"),
  async (req, res) => {
    const { name, description, category, price } = req.body;

    if (!name || !price)
      return res.status(400).json({ message: "Name & price required" });

    try {
      const result = await pool.query(
        `INSERT INTO menu (name, description, category, price)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [name, description, category, price]
      );

      console.log("✔ New menu item added:", result.rows[0]);

      // Tell all customers/bartistas menu updated
      if (router.io) {
        router.io.emit("menu:update", result.rows[0]);
      }

      res.json({ message: "Item added", item: result.rows[0] });
    } catch (err) {
      console.error("❌ Menu add error:", err);
      res.status(500).json({ message: "Menu add failed" });
    }
  }
);

/* ---------------------------------------------------------
   DELETE MENU ITEM
--------------------------------------------------------- */
router.delete(
  "/:id",
  verifyAccessToken,
  requireRoles("barista", "admin"),
  async (req, res) => {
    const { id } = req.params;

    try {
      const result = await pool.query("DELETE FROM menu WHERE id=$1", [id]);

      if (router.io) router.io.emit("menu:update", { id });

      res.json({ message: "Deleted" });
    } catch (err) {
      console.error("❌ Menu delete error:", err);
      res.status(500).json({ message: "Delete failed" });
    }
  }
);

router.setSocket = (io) => (router.io = io);
module.exports = router;
