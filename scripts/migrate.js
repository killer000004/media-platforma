const ExcelJS = require('exceljs');
const path = require('node:path');
const fs = require('node:fs');
const db = require('../src/db');

const EXCEL_PATH = path.join(__dirname, '..', 'Iqtisodiyot Fakulteti.xlsx');
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads', 'students');

function cellText(cell) {
  const v = cell && cell.value;
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && 'result' in v) {
    return v.result === null || v.result === undefined ? null : String(v.result).trim();
  }
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

function normalizeGender(raw) {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === 'erkak') return 'Erkak';
  if (v === 'ayol') return 'Ayol';
  return raw.trim();
}

function normalizeDate(raw) {
  if (!raw) return null;
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})T/.exec(raw);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const dmy = /^(\d{1,3})\.(\d{1,2})\.(\d{4})$/.exec(raw.trim());
  if (dmy) {
    let day = dmy[1];
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    if (day.length > 2) day = day.slice(-2);
    day = day.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return raw.trim();
}

function parseGroupLabel(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  const m = /^(.*?)(\d)\s*-?\s*kurs\s+(\S+.*)$/i.exec(cleaned);
  if (!m) return { yonalish: cleaned, bosqich: null, guruh_kod: null, raw_label: cleaned };
  return {
    yonalish: m[1].trim(),
    bosqich: m[2].trim(),
    guruh_kod: m[3].trim(),
    raw_label: cleaned,
  };
}

function normalizePhone(raw) {
  if (!raw) return [];
  const parts = String(raw).split(/\n/).map((p) => p.trim()).filter(Boolean);
  const phones = [];
  for (const part of parts) {
    const digits = part.replace(/[^\d]/g, '');
    let normalized = digits;
    if (normalized.length === 9) normalized = '998' + normalized;
    if (normalized.length === 12 && normalized.startsWith('998')) {
      phones.push('+' + normalized);
    } else if (normalized.length >= 7) {
      phones.push(part.trim());
    }
  }
  return phones;
}

function parseGuardian(raw) {
  if (!raw) return { name: null, phone_raw: null };
  const text = raw.trim();
  const phoneMatch = /((?:\+?998[\s-]?)?\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}|\+?7\d{10})\s*$/.exec(text);
  if (phoneMatch) {
    const name = text.slice(0, phoneMatch.index).trim();
    return { name: name || null, phone_raw: phoneMatch[1].trim() };
  }
  return { name: text, phone_raw: null };
}

async function runMigration() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.log('Excel fayl topilmadi, import o\'tkazib yuborildi:', EXCEL_PATH);
    return;
  }

  console.log('Excel faylini o\'qish...');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  const ws = wb.worksheets[0];

  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const images = ws.getImages();
  const rowToImage = new Map();
  for (const img of images) {
    const nativeRow = img.range.tl.nativeRow;
    const media = wb.model.media[img.imageId];
    if (!rowToImage.has(nativeRow)) rowToImage.set(nativeRow, media);
  }

  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM guardians');
    db.exec('DELETE FROM student_phones');
    db.exec('DELETE FROM students');
    db.exec('DELETE FROM groups');
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('students','groups','student_phones','guardians')");

    const insertGroup = db.prepare(
      'INSERT INTO groups (yonalish, bosqich, guruh_kod, raw_label) VALUES (?, ?, ?, ?)'
    );
    const findGroup = db.prepare('SELECT id FROM groups WHERE raw_label = ?');
    const insertStudent = db.prepare(`
      INSERT INTO students (full_name, birth_date, gender, birth_place, residence_address,
        family_status, social_category, orphan_category, group_id, photo_path, source_row_num)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertPhone = db.prepare(
      'INSERT INTO student_phones (student_id, phone_number, is_primary) VALUES (?, ?, ?)'
    );
    const insertGuardian = db.prepare(
      'INSERT INTO guardians (student_id, relation, name, phone_raw) VALUES (?, ?, ?, ?)'
    );

    let count = 0;
    const lastRow = ws.rowCount;
    for (let rowNum = 2; rowNum <= lastRow; rowNum++) {
      const row = ws.getRow(rowNum);
      const fullName = cellText(row.getCell(3));
      if (!fullName) continue;

      const seq = cellText(row.getCell(1));
      const birthDate = normalizeDate(cellText(row.getCell(4)));
      const gender = normalizeGender(cellText(row.getCell(5)));
      const groupRaw = cellText(row.getCell(6));
      const phoneRaw = row.getCell(7).value;
      const birthPlace = cellText(row.getCell(8));
      const residence = cellText(row.getCell(9));
      const fatherRaw = cellText(row.getCell(10));
      const motherRaw = cellText(row.getCell(11));
      const familyStatus = cellText(row.getCell(12));
      const socialCategory = cellText(row.getCell(13));
      const orphanCategory = cellText(row.getCell(14));

      let groupId = null;
      if (groupRaw) {
        const g = parseGroupLabel(groupRaw);
        const existing = findGroup.get(g.raw_label);
        if (existing) {
          groupId = existing.id;
        } else {
          const info = insertGroup.run(g.yonalish, g.bosqich, g.guruh_kod, g.raw_label);
          groupId = info.lastInsertRowid;
        }
      }

      const media = rowToImage.get(rowNum - 1);
      let photoPath = null;
      if (media && media.buffer) {
        const ext = media.extension || 'jpg';
        const fname = `student_row${seq || rowNum}.${ext}`;
        const fpath = path.join(UPLOADS_DIR, fname);
        if (!fs.existsSync(fpath)) fs.writeFileSync(fpath, media.buffer);
        photoPath = `/uploads/students/${fname}`;
      }

      const info = insertStudent.run(
        fullName,
        birthDate,
        gender,
        birthPlace,
        residence,
        familyStatus,
        socialCategory,
        orphanCategory,
        groupId,
        photoPath,
        seq ? Number(seq) : rowNum - 1
      );
      const studentId = info.lastInsertRowid;

      const phoneRawStr = phoneRaw === null || phoneRaw === undefined ? null : String(phoneRaw);
      const phones = normalizePhone(phoneRawStr);
      phones.forEach((p, idx) => {
        insertPhone.run(studentId, p, idx === 0 ? 1 : 0);
      });

      if (fatherRaw) {
        const f = parseGuardian(fatherRaw);
        insertGuardian.run(studentId, 'father', f.name, f.phone_raw);
      }
      if (motherRaw) {
        const m = parseGuardian(motherRaw);
        insertGuardian.run(studentId, 'mother', m.name, m.phone_raw);
      }

      count++;
    }

    db.exec('COMMIT');
    console.log(`Muvaffaqiyatli: ${count} ta talaba import qilindi.`);
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Import xatoligi:', err);
      process.exit(1);
    });
}

module.exports = { runMigration };
