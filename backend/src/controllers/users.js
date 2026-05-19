const crypto = require('crypto');
const { pool } = require('../db');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

exports.list = async (req, res) => {
  const result = await pool.query(
    'SELECT id, email, full_name, role, created_at FROM users ORDER BY full_name'
  );
  res.json(result.rows);
};

exports.create = async (req, res) => {
  const { email, password, full_name, role } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, password, and full_name required' });
  }
  const hash = hashPassword(password);
  try {
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role, created_at',
      [email, hash, full_name, role || 'manager']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    throw err;
  }
};

exports.update = async (req, res) => {
  const { email, full_name, role, password } = req.body;
  const sets = [];
  const params = [];
  let idx = 1;
  if (email) { sets.push(`email = $${idx++}`); params.push(email); }
  if (full_name) { sets.push(`full_name = $${idx++}`); params.push(full_name); }
  if (role) { sets.push(`role = $${idx++}`); params.push(role); }
  if (password) { sets.push(`password_hash = $${idx++}`); params.push(hashPassword(password)); }
  if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
  sets.push('updated_at = NOW()');
  params.push(req.params.id);
  const result = await pool.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, email, full_name, role, created_at`,
    params
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(result.rows[0]);
};

exports.remove = async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User deleted' });
};
