const { pool } = require('../db');

exports.list = async (req, res) => {
  const { status, priority, assignee_id, group_id, search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  let idx = 1;

  let where = 'WHERE 1=1';
  if (status) { where += ` AND t.status = $${idx++}`; params.push(status); }
  if (priority) { where += ` AND t.priority = $${idx++}`; params.push(priority); }
  if (assignee_id) { where += ` AND t.assignee_id = $${idx++}`; params.push(assignee_id); }
  if (group_id) { where += ` AND EXISTS (SELECT 1 FROM task_groups tg WHERE tg.task_id = t.id AND tg.group_id = $${idx++})`; params.push(group_id); }
  if (search) {
    where += ` AND (t.title ILIKE $${idx} OR t.description ILIKE $${idx})`;
    params.push(`%${search}%`);
    idx++;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM tasks t ${where}`, params
  );

  const result = await pool.query(
    `SELECT t.*, u.full_name as assignee_name,
      COALESCE(
        (SELECT json_agg(json_build_object('id', g.id, 'name', g.name))
         FROM task_groups tg JOIN groups_table g ON g.id = tg.group_id
         WHERE tg.task_id = t.id),
        '[]'::json
      ) as task_groups
     FROM tasks t
     LEFT JOIN users u ON t.assignee_id = u.id
     ${where}
     ORDER BY t.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, parseInt(limit), offset]
  );

  res.json({
    data: result.rows,
    total: parseInt(countResult.rows[0].count),
    page: parseInt(page),
    limit: parseInt(limit),
  });
};

exports.getById = async (req, res) => {
  const result = await pool.query(
    `SELECT t.*, u.full_name as assignee_name,
      COALESCE(
        (SELECT json_agg(json_build_object('id', g.id, 'name', g.name))
         FROM task_groups tg JOIN groups_table g ON g.id = tg.group_id
         WHERE tg.task_id = t.id),
        '[]'::json
      ) as task_groups
     FROM tasks t
     LEFT JOIN users u ON t.assignee_id = u.id
     WHERE t.id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Task not found' });
  res.json(result.rows[0]);
};

exports.create = async (req, res) => {
  const { title, description, status, priority, type, assignee_id, group_ids, deadline } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const result = await pool.query(
    `INSERT INTO tasks (title, description, status, priority, type, assignee_id, creator_id, deadline)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [title, description, status || 'new', priority || 'medium', type || 'task', assignee_id, req.user.id, deadline]
  );
  const task = result.rows[0];
  if (group_ids && Array.isArray(group_ids) && group_ids.length > 0) {
    const values = group_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
    await pool.query(
      `INSERT INTO task_groups (task_id, group_id) VALUES ${values} ON CONFLICT DO NOTHING`,
      [task.id, ...group_ids]
    );
  }
  res.status(201).json(task);
};

exports.update = async (req, res) => {
  const fields = ['title', 'description', 'status', 'priority', 'type', 'assignee_id', 'deadline'];
  const sets = [];
  const params = [];
  let idx = 1;
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = $${idx++}`);
      params.push(req.body[f]);
    }
  }
  if (req.body.status === 'done' || req.body.status === 'completed') {
    sets.push('completed_at = NOW()');
  } else if (req.body.status === 'new') {
    sets.push('completed_at = NULL');
  }
  if (sets.length) {
    sets.push('updated_at = NOW()');
    params.push(req.params.id);
    const result = await pool.query(
      `UPDATE tasks SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Task not found' });
  }
  if (req.body.group_ids !== undefined) {
    const gids = req.body.group_ids || [];
    await pool.query('DELETE FROM task_groups WHERE task_id = $1', [req.params.id]);
    if (gids.length > 0) {
      const vals = gids.map((_, i) => `($1, $${i + 2})`).join(', ');
      await pool.query(
        `INSERT INTO task_groups (task_id, group_id) VALUES ${vals} ON CONFLICT DO NOTHING`,
        [req.params.id, ...gids]
      );
    }
  }
  const updated = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  res.json(updated.rows[0]);
};

exports.remove = async (req, res) => {
  const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Task not found' });
  res.json({ message: 'Task deleted' });
};

exports.stats = async (req, res) => {
  const statuses = await pool.query("SELECT status, COUNT(*)::int FROM tasks GROUP BY status");
  const priorities = await pool.query("SELECT priority, COUNT(*)::int FROM tasks GROUP BY priority");
  const total = await pool.query("SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE status = 'done')::int as completed FROM tasks");
  const groupsCount = await pool.query("SELECT COUNT(*)::int as total FROM groups_table");
  const usersCount = await pool.query("SELECT COUNT(*)::int as total FROM users");
  res.json({
    tasks: { total: total.rows[0].total, completed: total.rows[0].completed, by_status: statuses.rows, by_priority: priorities.rows },
    groups: { total: groupsCount.rows[0].total },
    users: { total: usersCount.rows[0].total },
  });
};
