const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

const getUser = db.prepare('SELECT * FROM users WHERE username = ?');

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Login va parolni kiriting" });
  }

  const user = getUser.get(username.trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;

  res.json({ ok: true, username: user.username, role: user.role });
});

router.post('/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Kirilmagan' });
  }
  res.json({ username: req.session.username, role: req.session.role });
});

module.exports = router;
