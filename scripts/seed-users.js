const bcrypt = require('bcryptjs');
const db = require('../src/db');

// Vaqtinchalik boshlang'ich login/parollar. Ishga tushgandan keyin
// admin panel orqali (yoki shu skriptni qayta ishga tushirib) o'zgartiring.
const SEED_USERS = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'user', password: 'user123', role: 'user' },
];

const upsert = db.prepare(`
  INSERT INTO users (username, password_hash, role)
  VALUES (?, ?, ?)
  ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role
`);

for (const u of SEED_USERS) {
  const hash = bcrypt.hashSync(u.password, 10);
  upsert.run(u.username, hash, u.role);
  console.log(`Foydalanuvchi tayyor: ${u.username} / rol: ${u.role}`);
}

console.log('\nVAQTINCHALIK PAROLLAR (ishga tushgach albatta o\'zgartiring):');
for (const u of SEED_USERS) {
  console.log(`  ${u.username} : ${u.password}`);
}
