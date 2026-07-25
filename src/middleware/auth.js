function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Tizimga kirish talab qilinadi' });
    }
    return res.redirect('/login.html');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || req.session.role !== 'admin') {
    return res.status(403).json({ error: "Bu amal uchun admin huquqi kerak" });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
