const crypto = require('crypto');
const { pool } = require('../db');
const { sign } = require('../middleware/auth');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const derived = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === derived;
}

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const groups = await pool.query(
    'SELECT g.id, g.name FROM group_members gm JOIN groups_table g ON g.id = gm.group_id WHERE gm.user_id = $1',
    [user.id]
  );
  const token = sign({ id: user.id, email: user.email, role: user.role, exp: Math.floor(Date.now() / 1000) + 86400 * 7 });
  res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, groups: groups.rows } });
};

exports.register = async (req, res) => {
  const { email, password, full_name, role, group_ids } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, password, and full_name required' });
  }
  const hash = hashPassword(password);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role',
      [email, hash, full_name, role || 'manager']
    );
    const user = result.rows[0];
    if (group_ids && Array.isArray(group_ids) && group_ids.length > 0) {
      for (const gid of group_ids) {
        await client.query(
          'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [gid, user.id]
        );
      }
    }
    await client.query('COMMIT');
    const token = sign({ id: user.id, email: user.email, role: user.role, exp: Math.floor(Date.now() / 1000) + 86400 * 7 });
    res.status(201).json({ token, user });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    throw err;
  } finally {
    client.release();
  }
};

exports.me = async (req, res) => {
  const result = await pool.query('SELECT id, email, full_name, role, created_at FROM users WHERE id = $1', [req.user.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(result.rows[0]);
};

exports.changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password required' });
  }
  if (new_password.length < 3) {
    return res.status(400).json({ error: 'Password must be at least 3 characters' });
  }
  const user = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (!verifyPassword(current_password, user.rows[0].password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  const hash = hashPassword(new_password);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
  res.json({ message: 'Password changed successfully' });
};
