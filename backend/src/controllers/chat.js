const { pool } = require('../db');

const AI_ENDPOINT = process.env.AI_ENDPOINT || 'http://host.docker.internal:8081';
const AI_MODEL = process.env.AI_MODEL || 'deepseek-v2-lite';

async function askAI(messages) {
  const res = await fetch(`${AI_ENDPOINT}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: AI_MODEL, messages, temperature: 0.2, max_tokens: 2048 }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function extractJSON(text) {
  const m = text.match(/```json\s*([\s\S]*?)```/);
  if (m) return JSON.parse(m[1]);
  const m2 = text.match(/\{[\s\S]*"title"[\s\S]*\}/);
  if (m2) return JSON.parse(m2[0]);
  return null;
}

exports.chat = async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'Message is required' });

  const groups = await pool.query("SELECT id, TRIM(name) as name FROM groups_table ORDER BY name");
  const users = await pool.query("SELECT id, full_name, email FROM users ORDER BY full_name");

  const systemPrompt = `You are an AI assistant for a task management system called IT-CRM. 
You help users manage their tasks. When a user asks to create a task, you MUST:
1. Extract task details from their message
2. Auto-detect the group from keywords:
   - HW/hardware/virtualization/виртуализация/железо/server/сервер → group "${groups.rows.find(g => g.name === 'HW')?.id || '1'}" (HW)
   - Windows/windows/виндовс → group "${groups.rows.find(g => g.name === 'Windows')?.id || '1'}" (Windows)
   - Linux/linux → group "${groups.rows.find(g => g.name === 'Linux')?.id || '1'}" (Linux)
   - Database/db/базы/бд/SQL → group "${groups.rows.find(g => g.name === 'Database')?.id || '1'}" (Database)
   - Backup/backup/бекап/бекапы/резервное → group "${groups.rows.find(g => g.name === 'Backup')?.id || '1'}" (Backup)
3. Assign priority based on urgency keywords
4. Set default status to "new"
5. Return a JSON response with format:
{
  "reply": "your friendly response in the user's language",
  "task": { "title": "...", "description": "...", "priority": "low|medium|high", "group_id": number, "group_name": "..." } | null
}
If no task is needed, just return {"reply": "..."}.

Available groups: ${groups.rows.map(g => `${g.id}: ${g.name}`).join(', ')}
Available users: ${users.rows.map(u => `${u.full_name} (${u.email})`).join(', ')}

Respond in the same language the user wrote in. Keep responses concise and friendly.`;

  try {
    const reply = await askAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ]);

    const json = extractJSON(reply);

    if (json && json.task && json.task.title) {
      const t = json.task;
      const validPriority = ['low', 'medium', 'high'].includes(t.priority) ? t.priority : 'medium';

      const result = await pool.query(
        `INSERT INTO tasks (title, description, status, priority, creator_id)
         VALUES ($1, $2, 'new', $3, $4) RETURNING id`,
        [t.title, t.description || '', validPriority, req.user.id]
      );

      let gid = null;
      if (t.group_id && groups.rows.some(g => g.id === parseInt(t.group_id))) {
        gid = parseInt(t.group_id);
      } else if (t.group_name) {
        const found = groups.rows.find(g => g.name.toLowerCase() === t.group_name.toLowerCase());
        if (found) gid = found.id;
      }
      if (gid) {
        await pool.query(
          'INSERT INTO task_groups (task_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [result.rows[0].id, gid]
        );
      }

      return res.json({
        reply: json.reply || `✅ Task "${t.title}" created${t.group_name ? ' in ' + t.group_name : ''}!`,
        task: { id: result.rows[0].id, title: t.title, group_name: t.group_name },
      });
    }

    res.json({ reply: json?.reply || reply });

  } catch (e) {
    res.status(500).json({ reply: 'Sorry, I had trouble processing that.', error: e.message });
  }
};
