const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false } // required for Neon
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let items;
  try {
    const body = JSON.parse(event.body || '{}');
    items = body.items;
    if (!Array.isArray(items)) throw new Error('items must be array');
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON payload', details: err.message })
    };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS csv_items (
        id             serial PRIMARY KEY,
        group_name     text      NOT NULL,
        seat_num       integer   NOT NULL,
        streamer_label text,
        director_label text,
        url_label      text,
        view_link      text,
        guest_link     text,
        director_link  text,
        created_at     timestamptz DEFAULT now()
      )
    `);

    // Clear previous data; keep only latest upload
    await client.query('DELETE FROM csv_items');

    const insertText = `
      INSERT INTO csv_items
      (group_name, seat_num, streamer_label, director_label, url_label, view_link, guest_link, director_link)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    for (const item of items) {
      await client.query(insertText, [
        item.group,
        item.seatNum,
        item.streamerLabel || null,
        item.directorLabel || null,
        item.urlLabel || null,
        item.viewLink || null,
        item.guestLink || null,
        item.directorLink || null
      ]);
    }

    await client.query('COMMIT');

    return {
      statusCode: 200,
      body: JSON.stringify({ inserted: items.length })
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('DB error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database error', details: err.message })
    };
  } finally {
    client.release();
  }
};
