const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'PUT') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON payload', details: err.message })
    };
  }

  const { id, guestLink, directorLink, viewLink } = payload;

  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing seat id' })
    };
  }

  try {
    const { rowCount } = await pool.query(
      `
        UPDATE csv_items
        SET
          guest_link   = $2,
          director_link= $3,
          view_link    = $4
        WHERE id = $1
      `,
      [id, guestLink || null, directorLink || null, viewLink || null]
    );

    if (!rowCount) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Seat not found' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ updated: rowCount })
    };
  } catch (err) {
    console.error('DB error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database error', details: err.message })
    };
  }
};
