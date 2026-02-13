const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { rows } = await pool.query(`
      SELECT
        id,
        group_name      AS "group",
        seat_num        AS "seatNum",
        streamer_label  AS "streamerLabel",
        director_label  AS "directorLabel",
        url_label       AS "urlLabel",
        view_link       AS "viewLink",
        guest_link      AS "guestLink",
        director_link   AS "directorLink"
      FROM csv_items
      ORDER BY group_name, seat_num;
    `);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows)
    };
  } catch (err) {
    console.error('DB error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database error', details: err.message })
    };
  }
};
