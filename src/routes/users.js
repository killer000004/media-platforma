const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY id').all();
  res.json(rows);
});

router.post('/', requireAdmin, (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password || !['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: "Login, parol va rol (admin/user) kiritilishi shart" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Parol kamida 6 belgidan iborat bo'lishi kerak" });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) return res.status(409).json({ error: 'Bu login band' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
    .run(username.trim(), hash, role);

  res.status(201).json({ id: info.lastInsertRowid, username: username.trim(), role });
});

router.put('/:id/password', requireAdmin, (req, res) => {
  const { password } = req.body || {};
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Parol kamida 6 belgidan iborat bo'lishi kerak" });
  }
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  if (Number(req.params.id) === req.session.userId) {
    return res.status(400).json({ error: "O'zingizni o'chira olmaysiz" });
  }
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
