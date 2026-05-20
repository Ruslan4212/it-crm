const { pool } = require('../db');

exports.list = async (req, res) => {
  const { year, month } = req.query;
  let query = 'SELECT * FROM events WHERE user_id = $1';
  const params = [req.user.id];
  if (year && month) {
    query += ' AND EXTRACT(YEAR FROM event_date) = $2 AND EXTRACT(MONTH FROM event_date) = $3';
    params.push(parseInt(year), parseInt(month));
  }
  query += ' ORDER BY event_date, event_time';
  const result = await pool.query(query, params);
  res.json(result.rows);
};

exports.today = async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM events WHERE user_id = $1 AND event_date = CURRENT_DATE ORDER BY event_time",
    [req.user.id]
  );
  res.json(result.rows);
};

exports.create = async (req, res) => {
  const { title, description, event_date, event_time } = req.body;
  if (!title || !event_date) return res.status(400).json({ error: 'Title and date are required' });
  const result = await pool.query(
    'INSERT INTO events (title, description, event_date, event_time, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [title, description, event_date, event_time || null, req.user.id]
  );
  res.status(201).json(result.rows[0]);
};

exports.update = async (req, res) => {
  const { title, description, event_date, event_time } = req.body;
  if (!title || !event_date) return res.status(400).json({ error: 'Title and date are required' });
  const result = await pool.query(
    'UPDATE events SET title = $1, description = $2, event_date = $3, event_time = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
    [title, description, event_date, event_time || null, req.params.id, req.user.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Event not found' });
  res.json(result.rows[0]);
};

exports.remove = async (req, res) => {
  const result = await pool.query('DELETE FROM events WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Event not found' });
  res.json({ message: 'Event deleted' });
};
