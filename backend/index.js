require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initDatabase, pool } = require('./src/db');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/clients', require('./src/routes/clients'));
app.use('/api/contacts', require('./src/routes/contacts'));
app.use('/api/tasks', require('./src/routes/tasks'));
app.use('/api/groups', require('./src/routes/groups'));
app.use('/api/users', require('./src/routes/users'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function seedAdmin() {
  const exists = await pool.query("SELECT id FROM users WHERE email = 'admin@crm.local'");
  if (exists.rows.length) return;
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync('admin123', salt, 1000, 64, 'sha512').toString('hex');
  await pool.query(
    "INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4)",
    ['admin@crm.local', `${salt}:${hash}`, 'Administrator', 'admin']
  );
  console.log('Admin user seeded: admin@crm.local / admin123');
}

async function start() {
  try {
    await initDatabase();
    await seedAdmin();
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
