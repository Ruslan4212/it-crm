const { pool } = require('../db');

exports.list = async (req, res) => {
  const { client_id, search } = req.query;
  let query = 'SELECT * FROM contacts WHERE 1=1';
  const params = [];
  let idx = 1;
  if (client_id) {
    query += ` AND client_id = $${idx++}`;
    params.push(client_id);
  }
  if (search) {
    query += ` AND (full_name ILIKE $${idx} OR email ILIKE $${idx} OR phone ILIKE $${idx})`;
    params.push(`%${search}%`);
    idx++;
  }
  query += ' ORDER BY is_primary DESC, full_name';
  const result = await pool.query(query, params);
  res.json(result.rows);
};

exports.create = async (req, res) => {
  const { client_id, full_name, position, phone, email, telegram, is_primary, notes } = req.body;
  if (!client_id || !full_name) return res.status(400).json({ error: 'client_id and full_name required' });
  const result = await pool.query(
    `INSERT INTO contacts (client_id, full_name, position, phone, email, telegram, is_primary, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [client_id, full_name, position, phone, email, telegram, is_primary || false, notes]
  );
  res.status(201).json(result.rows[0]);
};

exports.update = async (req, res) => {
  const fields = ['full_name', 'position', 'phone', 'email', 'telegram', 'is_primary', 'notes'];
  const sets = [];
  const params = [];
  let idx = 1;
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = $${idx++}`);
      params.push(req.body[f]);
    }
  }
  if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
  sets.push('updated_at = NOW()');
  params.push(req.params.id);
  const result = await pool.query(
    `UPDATE contacts SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Contact not found' });
  res.json(result.rows[0]);
};

exports.remove = async (req, res) => {
  const result = await pool.query('DELETE FROM contacts WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Contact not found' });
  res.json({ message: 'Contact deleted' });
};
