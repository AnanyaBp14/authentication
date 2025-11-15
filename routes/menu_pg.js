// routes/menu_pg.js
const express = require("express");
const router = express.Router();
const pool = require("../db");

/* -----------------------------------------------------
   PUBLIC — Get Menu
------------------------------------------------------*/
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM menu ORDER BY id ASC");
    res.json(result.rows);  // PG uses .rows
  } catch (err) {
    console.error("Menu fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* -----------------------------------------------------
   ADMIN/BARISTA — Add item
------------------------------------------------------*/
router.post("/add", async (req, res) => {
  const { name, description, category, price, img } = req.body;

  if (!name || !price)
    return res.status(400).json({ message: "Missing fields" });

  try {
    await pool.query(
      `INSERT INTO menu (name, description, category, price, img)
       VALUES ($1,$2,$3,$4,$5)`,
      [name, description, category, price, img]
    );
    res.json({ message: "Item added" });
  } catch (err) {
    console.error("Menu add error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* -----------------------------------------------------
   UPDATE
------------------------------------------------------*/
router.put("/:id", async (req, res) => {
  const { name, description, category, price, img } = req.body;
  const { id } = req.params;

  try {
    await pool.query(
      `UPDATE menu SET name=$1, description=$2, category=$3, price=$4, img=$5
       WHERE id=$6`,
      [name, description, category, price, img, id]
    );
    res.json({ message: "Updated" });
  } catch (err) {
    console.error("Menu update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* -----------------------------------------------------
   DELETE
------------------------------------------------------*/
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM menu WHERE id=$1", [id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Menu delete error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
