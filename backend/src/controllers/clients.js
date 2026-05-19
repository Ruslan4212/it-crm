const { pool } = require('../db');

exports.list = async (req, res) => {
  const { search, status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let query = 'SELECT * FROM clients WHERE 1=1';
  const params = [];
  let idx = 1;
  if (search) {
    query += ` AND (name ILIKE $${idx} OR inn ILIKE $${idx} OR email ILIKE $${idx})`;
    params.push(`%${search}%`);
    idx++;
  }
  if (status) {
    query += ` AND status = $${idx}`;
    params.push(status);
    idx++;
  }
  const countResult = await pool.query(query.replace('SELECT *', 'SELECT COUNT(*)'), params);
  query += ` ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
  params.push(parseInt(limit), offset);
  const result = await pool.query(query, params);
  res.json({ data: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
};

exports.getById = async (req, res) => {
  const result = await pool.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Client not found' });
  const contacts = await pool.query('SELECT * FROM contacts WHERE client_id = $1 ORDER BY is_primary DESC, full_name', [req.params.id]);
  const tasks = await pool.query('SELECT * FROM tasks WHERE client_id = $1 ORDER BY created_at DESC', [req.params.id]);
  res.json({ ...result.rows[0], contacts: contacts.rows, tasks: tasks.rows });
};

exports.create = async (req, res) => {
  const { name, inn, kpp, ogrn, address, phone, email, website, industry, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const result = await pool.query(
    `INSERT INTO clients (name, inn, kpp, ogrn, address, phone, email, website, industry, status, manager_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [name, inn, kpp, ogrn, address, phone, email, website, industry, status || 'active', req.user.id]
  );
  res.status(201).json(result.rows[0]);
};

exports.update = async (req, res) => {
  const fields = ['name', 'inn', 'kpp', 'ogrn', 'address', 'phone', 'email', 'website', 'industry', 'status'];
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
  sets.push(`updated_at = NOW()`);
  params.push(req.params.id);
  const result = await pool.query(
    `UPDATE clients SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Client not found' });
  res.json(result.rows[0]);
};

exports.remove = async (req, res) => {
  const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Client not found' });
  res.json({ message: 'Client deleted' });
};
