require('dotenv').config();
const express = require('express');
const cookieSession = require('cookie-session');
const path = require('node:path');
const bcrypt = require('bcryptjs');

const db = require('./db');
const { runMigration } = require('../scripts/migrate');
const { requireAuth, requireAdmin } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';

function ensureSeedUsers() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0) return;

  const seedUsers = [
    { username: process.env.ADMIN_USERNAME || 'admin', password: process.env.ADMIN_PASSWORD || 'admin123', role: 'admin' },
    { username: process.env.USER_USERNAME || 'user', password: process.env.USER_PASSWORD || 'user123', role: 'user' },
  ];
  const insert = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
  for (const u of seedUsers) {
    insert.run(u.username, bcrypt.hashSync(u.password, 10), u.role);
  }
  console.log('Boshlang\'ich foydalanuvchilar yaratildi (admin/user). Ishga tushgach parollarni o\'zgartiring.');
}

async function bootstrap() {
  ensureSeedUsers();

  const studentCount = db.prepare('SELECT COUNT(*) AS c FROM students').get().c;
  if (studentCount === 0) {
    try {
      await runMigration();
    } catch (err) {
      console.error('Boshlang\'ich import muvaffaqiyatsiz tugadi:', err);
    }
  }
}

app.disable('x-powered-by');
app.use(express.json());
app.use(
  cookieSession({
    name: 'tafu_session',
    secret: SESSION_SECRET,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  })
);

// Public auth endpoints
app.use('/api/auth', authRoutes);

// Everything else under /api requires login
app.use('/api/students', requireAuth, studentRoutes);
app.use('/api/users', requireAuth, requireAdmin, userRoutes);

// Static assets (css/js/uploads) are always servable; index.html itself is gated below
app.use(express.static(path.join(__dirname, '..', 'public'), { index: false }));

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/index.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server xatoligi' });
});

bootstrap().then(() => {
  app.listen(PORT, () => {
    console.log(`Server ishga tushdi: http://localhost:${PORT}`);
  });
});
