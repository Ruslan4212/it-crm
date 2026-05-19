const { pool } = require('../db');

exports.list = async (req, res) => {
  const { search } = req.query;
  let query = `
    SELECT g.*, 
      (SELECT json_agg(json_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email, 'role', gm.role))
       FROM group_members gm JOIN users u ON u.id = gm.user_id WHERE gm.group_id = g.id) as members,
      (SELECT COUNT(*) FROM task_groups WHERE group_id = g.id)::int as task_count
    FROM groups_table g WHERE 1=1`;
  const params = [];
  let idx = 1;
  if (search) {
    query += ` AND g.name ILIKE $${idx}`;
    params.push(`%${search}%`);
    idx++;
  }
  query += ' ORDER BY g.created_at DESC';
  const result = await pool.query(query, params);
  res.json(result.rows);
};

exports.getById = async (req, res) => {
  const group = await pool.query(
    `SELECT g.*,
      (SELECT json_agg(json_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email, 'role', gm.role))
       FROM group_members gm JOIN users u ON u.id = gm.user_id WHERE gm.group_id = g.id) as members
    FROM groups_table g WHERE g.id = $1`,
    [req.params.id]
  );
  if (!group.rows[0]) return res.status(404).json({ error: 'Group not found' });
  const tasks = await pool.query(
    `SELECT t.*, u.full_name as assignee_name
     FROM tasks t
     JOIN task_groups tg ON tg.task_id = t.id
     LEFT JOIN users u ON t.assignee_id = u.id
     WHERE tg.group_id = $1 ORDER BY t.created_at DESC`,
    [req.params.id]
  );
  const availableUsers = await pool.query(
    `SELECT id, full_name, email FROM users WHERE id != ALL(
      COALESCE((SELECT array_agg(user_id) FROM group_members WHERE group_id = $1), ARRAY[]::int[])
    ) ORDER BY full_name`,
    [req.params.id]
  );
  res.json({ ...group.rows[0], tasks: tasks.rows, available_users: availableUsers.rows });
};

exports.create = async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const result = await pool.query(
    'INSERT INTO groups_table (name, description, created_by) VALUES ($1, $2, $3) RETURNING *',
    [name, description, req.user.id]
  );
  res.status(201).json(result.rows[0]);
};

exports.update = async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const result = await pool.query(
    'UPDATE groups_table SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    [name, description, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Group not found' });
  res.json(result.rows[0]);
};

exports.remove = async (req, res) => {
  const result = await pool.query('DELETE FROM groups_table WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Group not found' });
  res.json({ message: 'Group deleted' });
};

exports.addMember = async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  try {
    await pool.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, user_id]
    );
    res.json({ message: 'Member added' });
  } catch (err) {
    res.status(400).json({ error: 'Failed to add member' });
  }
};

exports.removeMember = async (req, res) => {
  const result = await pool.query(
    'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.params.userId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Member not found' });
  res.json({ message: 'Member removed' });
};
