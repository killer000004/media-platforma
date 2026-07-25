const express = require('express');
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'public', 'uploads', 'students');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `student_${req.params.id}_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      return cb(new Error('Faqat JPEG/PNG/WEBP rasm fayllari qabul qilinadi'));
    }
    cb(null, true);
  },
});

function serializeStudent(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    birthDate: row.birth_date,
    gender: row.gender,
    birthPlace: row.birth_place,
    residenceAddress: row.residence_address,
    familyStatus: row.family_status,
    socialCategory: row.social_category,
    orphanCategory: row.orphan_category,
    photoPath: row.photo_path,
    groupId: row.group_id,
    groupLabel: row.raw_label || null,
    yonalish: row.yonalish || null,
    bosqich: row.bosqich || null,
    guruhKod: row.guruh_kod || null,
  };
}

const listStudentsStmt = db.prepare(`
  SELECT s.*, g.raw_label, g.yonalish, g.bosqich, g.guruh_kod
  FROM students s
  LEFT JOIN groups g ON g.id = s.group_id
  ORDER BY s.full_name COLLATE NOCASE
`);

const getStudentStmt = db.prepare(`
  SELECT s.*, g.raw_label, g.yonalish, g.bosqich, g.guruh_kod
  FROM students s
  LEFT JOIN groups g ON g.id = s.group_id
  WHERE s.id = ?
`);

const getPhonesStmt = db.prepare('SELECT phone_number, is_primary FROM student_phones WHERE student_id = ? ORDER BY is_primary DESC, id');
const getGuardiansStmt = db.prepare('SELECT relation, name, phone_raw FROM guardians WHERE student_id = ?');

router.get('/groups', (req, res) => {
  const groups = db.prepare('SELECT * FROM groups ORDER BY yonalish, bosqich, guruh_kod').all();
  res.json(groups);
});

router.get('/', (req, res) => {
  const { q, groupId } = req.query;
  let rows = listStudentsStmt.all();

  if (groupId) {
    rows = rows.filter((r) => String(r.group_id) === String(groupId));
  }
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter((r) => r.full_name.toLowerCase().includes(needle));
  }

  res.json(rows.map(serializeStudent));
});

router.get('/:id', (req, res) => {
  const row = getStudentStmt.get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Talaba topilmadi' });
  const student = serializeStudent(row);
  student.phones = getPhonesStmt.all(req.params.id);
  student.guardians = getGuardiansStmt.all(req.params.id);
  res.json(student);
});

const EDITABLE_FIELDS = {
  fullName: 'full_name',
  birthDate: 'birth_date',
  gender: 'gender',
  birthPlace: 'birth_place',
  residenceAddress: 'residence_address',
  familyStatus: 'family_status',
  socialCategory: 'social_category',
  orphanCategory: 'orphan_category',
  groupId: 'group_id',
};

router.post('/', requireAdmin, (req, res) => {
  const body = req.body || {};
  if (!body.fullName || !body.fullName.trim()) {
    return res.status(400).json({ error: 'F.I.O majburiy' });
  }

  const cols = ['full_name'];
  const vals = [body.fullName.trim()];
  for (const [key, col] of Object.entries(EDITABLE_FIELDS)) {
    if (key === 'fullName') continue;
    if (body[key] !== undefined) {
      cols.push(col);
      vals.push(body[key] === '' ? null : body[key]);
    }
  }

  const placeholders = cols.map(() => '?').join(', ');
  const info = db.prepare(`INSERT INTO students (${cols.join(', ')}) VALUES (${placeholders})`).run(...vals);
  const row = getStudentStmt.get(info.lastInsertRowid);
  res.status(201).json(serializeStudent(row));
});

router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT id FROM students WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Talaba topilmadi' });

  const body = req.body || {};
  const sets = [];
  const vals = [];
  for (const [key, col] of Object.entries(EDITABLE_FIELDS)) {
    if (body[key] !== undefined) {
      sets.push(`${col} = ?`);
      vals.push(body[key] === '' ? null : body[key]);
    }
  }
  if (sets.length === 0) return res.status(400).json({ error: "O'zgartirish uchun maydon yo'q" });

  sets.push("updated_at = datetime('now')");
  vals.push(req.params.id);
  db.prepare(`UPDATE students SET ${sets.join(', ')} WHERE id = ?`).run(...vals);

  const row = getStudentStmt.get(req.params.id);
  res.json(serializeStudent(row));
});

router.delete('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT id, photo_path FROM students WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Talaba topilmadi' });

  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);

  if (existing.photo_path) {
    const filePath = path.join(__dirname, '..', '..', 'public', existing.photo_path.replace(/^\//, ''));
    fs.promises.unlink(filePath).catch(() => {});
  }

  res.json({ ok: true });
});

router.post('/:id/photo', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT id, photo_path FROM students WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Talaba topilmadi' });

  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Rasm fayli yuborilmadi' });

    const oldPath = existing.photo_path;
    const newPhotoPath = `/uploads/students/${req.file.filename}`;
    db.prepare("UPDATE students SET photo_path = ?, updated_at = datetime('now') WHERE id = ?").run(
      newPhotoPath,
      req.params.id
    );

    if (oldPath) {
      const oldFilePath = path.join(__dirname, '..', '..', 'public', oldPath.replace(/^\//, ''));
      fs.promises.unlink(oldFilePath).catch(() => {});
    }

    res.json({ ok: true, photoPath: newPhotoPath });
  });
});

// Phones
router.put('/:id/phones', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT id FROM students WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Talaba topilmadi' });

  const phones = Array.isArray(req.body?.phones) ? req.body.phones : [];
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM student_phones WHERE student_id = ?').run(req.params.id);
    const insert = db.prepare('INSERT INTO student_phones (student_id, phone_number, is_primary) VALUES (?, ?, ?)');
    phones.forEach((p, idx) => {
      const num = typeof p === 'string' ? p.trim() : '';
      if (num) insert.run(req.params.id, num, idx === 0 ? 1 : 0);
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  res.json(getPhonesStmt.all(req.params.id));
});

// Guardians
router.put('/:id/guardians', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT id FROM students WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Talaba topilmadi' });

  const guardians = Array.isArray(req.body?.guardians) ? req.body.guardians : [];
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM guardians WHERE student_id = ?').run(req.params.id);
    const insert = db.prepare('INSERT INTO guardians (student_id, relation, name, phone_raw) VALUES (?, ?, ?, ?)');
    for (const g of guardians) {
      if (!g || (g.relation !== 'father' && g.relation !== 'mother')) continue;
      insert.run(req.params.id, g.relation, g.name || null, g.phoneRaw || null);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  res.json(getGuardiansStmt.all(req.params.id));
});

module.exports = router;
