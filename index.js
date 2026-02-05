const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// Change these to your DB credentials
const pool = new Pool({
  connectionString: "postgresql://postgres.ccxyjsawkjmpoxzhcssd:6kyeeUN@.vDz29G@aws-1-ap-south-1.pooler.supabase.com:5432/postgres",
  ssl: { rejectUnauthorized: false }
});

// API 1: Get oldest members
app.get("/api/family/roots", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, full_name, photo_url
      FROM family_members
      WHERE father_id IS NULL AND mother_id IS NULL
      ORDER BY full_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load roots" });
  }
});

// API 2: Get children of a person
app.get("/api/family/children", async (req, res) => {
  try {
    const parentId = req.query.parent_id;

    const result = await pool.query(`
      SELECT id, full_name, photo_url
      FROM family_members
      WHERE father_id = $1 OR mother_id = $1
      ORDER BY full_name
    `, [parentId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load children" });
  }
});

app.listen(3000, () => {
  console.log("Family Tree API running on http://localhost:3000");
});
