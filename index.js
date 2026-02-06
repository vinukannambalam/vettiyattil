console.log("=== DEPLOYED BUILD v5 - TREE FLOW + ORDER_ID + CORS + SEARCH ===");

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

// 1️⃣ Roots: Oldest known ancestors
app.get("/api/family/roots", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, full_name, photo_url, spouse_id, order_id
      FROM family_members
      WHERE is_root = TRUE
      ORDER BY order_id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("ROOTS ERROR:", err);
    res.status(500).json({ error: "Failed to load roots" });
  }
});

// 2️⃣ Children of a selected person (exclude spouse just in case)
app.get("/api/family/children", async (req, res) => {
  try {
    const parentId = req.query.parent_id;

    const result = await pool.query(`
      SELECT id, full_name, photo_url, spouse_id, order_id
      FROM family_members
      WHERE (father_id = $1 OR mother_id = $1)
        AND id <> (SELECT spouse_id FROM family_members WHERE id = $1)
      ORDER BY order_id
    `, [parentId]);

    res.json(result.rows);
  } catch (err) {
    console.error("CHILDREN ERROR:", err);
    res.status(500).json({ error: "Failed to load children" });
  }
});

// 3️⃣ Family view: person + spouse + children (exclude spouse from children)
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
		sp.photo_url AS spouse_photo_url,
        fm.order_id
      FROM family_members fm
      LEFT JOIN family_members sp ON sp.id = fm.spouse_id
      WHERE fm.id = $1
    `;

    const childrenQ = `
      SELECT id, full_name, photo_url, spouse_id, order_id
      FROM family_members
      WHERE (father_id = $1 OR mother_id = $1)
        AND id <> (SELECT spouse_id FROM family_members WHERE id = $1)
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

// 🔍 4️⃣ Search by name (case-insensitive, partial)
app.get("/api/family/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();

    if (!q) {
      return res.json([]);
    }

    const result = await pool.query(`
      SELECT id, full_name, photo_url, spouse_id, order_id
      FROM family_members
      WHERE full_name ILIKE '%' || $1 || '%'
      ORDER BY order_id, full_name
      LIMIT 50
    `, [q]);

    res.json(result.rows);
  } catch (err) {
    console.error("SEARCH ERROR:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

// IMPORTANT for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Family Tree API running on port", PORT);
});
