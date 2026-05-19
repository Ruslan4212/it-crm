const crypto = require('crypto');
const { pool } = require('./index');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function seed() {
  const hash = hashPassword('admin123');
  await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    ['admin@crm.local', hash, 'Administrator', 'admin']
  );
  console.log('Seed user created: admin@crm.local / admin123');
  await pool.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
