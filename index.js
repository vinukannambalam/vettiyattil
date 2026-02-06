console.log("=== DEPLOYED BUILD v4 - TREE FLOW + ORDER_ID + CORS ===");

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

// Proper CORS for Netlify (handles preflight too)
app.use(cors({
  origin: "https://vettiyattil.netlify.app",
  methods: ["GET", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// DB connection
const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: { rejectUnauthorized: false }
});

// 1️⃣ Roots: Oldest known ancestors (both parents NULL)
app.get("/api/family/roots", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, full_name, photo_url, spouse_id, order_id
      FROM family_members
      WHERE father_id IS NULL AND mother_id IS NULL
      ORDER BY order_id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("ROOTS ERROR:", err);
    res.status(500).json({ error: "Failed to load roots" });
  }
});

// 2️⃣ Children of a selected person
app.get("/api/family/children", async (req, res) => {
  try {
    const parentId = req.query.parent_id;

    const result = await pool.query(`
      SELECT id, full_name, photo_url, spouse_id, order_id
      FROM family_members
      WHERE father_id = $1 OR mother_id = $1
      ORDER BY order_id
    `, [parentId]);

    res.json(result.rows);
  } catch (err) {
    console.error("CHILDREN ERROR:", err);
    res.status(500).json({ error: "Failed to load children" });
  }
});

// 3️⃣ Family view: person + spouse + children
app.get("/api/family/family", async (req, res) => {
  try {
    const personId = req.query.person_id;

    const personQ = `
      SELECT 
        fm.id,
        fm.full_name,
        fm.photo_url,
        fm.spouse_id,
        sp.full_name AS spouse_name,
        fm.order_id
      FROM family_members fm
      LEFT JOIN family_members sp ON sp.id = fm.spouse_id
      WHERE fm.id = $1
    `;

    const childrenQ = `
      SELECT id, full_name, photo_url, spouse_id, order_id
      FROM family_members
      WHERE father_id = $1 OR mother_id = $1
      ORDER BY order_id
    `;

    const person = await pool.query(personQ, [personId]);
    const children = await pool.query(childrenQ, [personId]);

    res.json({
      person: person.rows[0],
      children: children.rows
    });
  } catch (err) {
    console.error("FAMILY ERROR:", err);
    res.status(500).json({ error: "Failed to load family" });
  }
});

// IMPORTANT for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Family Tree API running on port", PORT);
});
