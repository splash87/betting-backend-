// server.js
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend from /public folder
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // important for Railway
});

// Create bets table if not exists
async function createTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS bets (
      id SERIAL PRIMARY KEY,
      ref_id VARCHAR(20) UNIQUE NOT NULL,
      bet_option VARCHAR(20) NOT NULL,
      stake INTEGER NOT NULL,
      odds NUMERIC NOT NULL,
      timestamp TIMESTAMP NOT NULL
    );
  `;
  await pool.query(query);
}
createTable().catch(console.error);

// API endpoint to record a bet
app.post('/api/bets', async (req, res) => {
  const { ref_id, bet_option, stake, odds, timestamp } = req.body;

  if (!ref_id || !bet_option || !stake || !odds || !timestamp) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  try {
    const query = `
      INSERT INTO bets (ref_id, bet_option, stake, odds, timestamp)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [ref_id, bet_option, stake, odds, timestamp];
    const result = await pool.query(query, values);

    res.json({ success: true, bet: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});
// API endpoint to fetch all bets
app.get('/api/yardparty', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bets ORDER BY timestamp DESC');
    res.json({ success: true, bets: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch bets' });
  }
});


// Optional: fallback to index.html for client-side routing (if needed)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
