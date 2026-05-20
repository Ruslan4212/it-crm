const { pool } = require('../db');
const XLSX = require('xlsx');

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

exports.exportTasks = async (req, res) => {
  const { format = 'xlsx', status, priority, group_id, search } = req.query;
  const params = [];
  let idx = 1;

  let where = 'WHERE 1=1';
  if (status) { where += ` AND t.status = $${idx++}`; params.push(status); }
  if (priority) { where += ` AND t.priority = $${idx++}`; params.push(priority); }
  if (group_id) {
    where += ` AND EXISTS (SELECT 1 FROM task_groups tg WHERE tg.task_id = t.id AND tg.group_id = $${idx++})`;
    params.push(group_id);
  }
  if (search) {
    where += ` AND (t.title ILIKE $${idx} OR t.description ILIKE $${idx})`;
    params.push(`%${search}%`);
    idx++;
  }

  const result = await pool.query(
    `SELECT t.id, t.title, t.description, t.status, t.priority,
            t.deadline, t.created_at, t.updated_at, t.completed_at,
            u.full_name as assignee_name,
            COALESCE(
              (SELECT string_agg(g.name, ', ') FROM task_groups tg
               JOIN groups_table g ON g.id = tg.group_id WHERE tg.task_id = t.id),
              ''
            ) as groups
     FROM tasks t
     LEFT JOIN users u ON t.assignee_id = u.id
     ${where}
     ORDER BY t.created_at DESC`,
    params
  );

  const rows = result.rows.map(r => ({
    ID: r.id,
    Title: r.title,
    Description: r.description || '',
    Status: r.status,
    Priority: r.priority,
    Assignee: r.assignee_name || '',
    Groups: r.groups || '',
    Deadline: r.deadline ? new Date(r.deadline).toISOString().slice(0, 10) : '',
    Created: new Date(r.created_at).toISOString().slice(0, 10),
    Completed: r.completed_at ? new Date(r.completed_at).toISOString().slice(0, 10) : '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Tasks');

  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(ws);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=tasks.csv');
    return res.send(csv);
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=tasks.xlsx');
  res.send(buf);
};

const AI_ENDPOINT = process.env.AI_ENDPOINT || 'http://host.docker.internal:8081';
const AI_MODEL = process.env.AI_MODEL || 'deepseek-v2-lite';

async function aiParseTasks(rows) {
  const sample = rows.slice(0, Math.min(rows.length, 50));
  const prompt = `You are a data parser. Given spreadsheet rows with unknown columns, identify task data and return a JSON array.
Each object must have: "title" (required), "description" (string, optional), "status" (one of: new, in_progress, done, default: new), "priority" (one of: low, medium, high, default: medium).
Analyze headers and data to infer which columns map to these fields. Return ONLY valid JSON array, no markdown, no explanation.

Input rows:
${JSON.stringify(sample, null, 2)}`;

  const body = {
    model: AI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 4096,
  };

  const res = await fetch(`${AI_ENDPOINT}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('AI response did not contain valid JSON');
  return JSON.parse(jsonMatch[0]);
}

exports.importTasks = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File is required' });

  const ai_parse = req.body.ai_parse === 'true' || req.body.ai_parse === true;

  let workbook;
  try {
    workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  } catch (e) {
    return res.status(400).json({ error: 'Invalid file format' });
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rows.length === 0) return res.json({ imported: 0 });

  let tasksToCreate;

  if (ai_parse) {
    try {
      tasksToCreate = await aiParseTasks(rows);
    } catch (e) {
      return res.status(422).json({ error: `AI parsing failed: ${e.message}` });
    }
  } else {
    tasksToCreate = rows.map(row => ({
      title: row.Title || row.title || row.Название || row.Заголовок || row.Наименование || '',
      description: row.Description || row.description || row.Описание || '',
      status: (row.Status || row.status || 'new').toLowerCase(),
      priority: (row.Priority || row.priority || 'medium').toLowerCase(),
    }));
  }

  let imported = 0;
  let errors = [];

  for (let i = 0; i < tasksToCreate.length; i++) {
    const task = tasksToCreate[i];
    const title = (task.title || '').trim();
    if (!title) {
      errors.push({ row: i + 1, error: 'Missing title' });
      continue;
    }

    const status = (task.status || 'new').toLowerCase();
    const priority = (task.priority || 'medium').toLowerCase();
    const validStatus = ['new', 'in_progress', 'done'].includes(status) ? status : 'new';
    const validPriority = ['low', 'medium', 'high'].includes(priority) ? priority : 'medium';

    try {
      await pool.query(
        `INSERT INTO tasks (title, description, status, priority, creator_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [title, task.description || '', validStatus, validPriority, req.user.id]
      );
      imported++;
    } catch (e) {
      errors.push({ row: i + 1, error: e.message });
    }
  }

  res.json({ imported, errors: errors.length > 0 ? errors : undefined });
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
