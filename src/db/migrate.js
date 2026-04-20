require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('./index');

async function migrate() {
  const migrationFile = path.join(__dirname, 'migrations', '001_initial.sql');
  const sql = fs.readFileSync(migrationFile, 'utf8');

  try {
    await query(sql);
    console.log('Migration başarıyla tamamlandı.');
    process.exit(0);
  } catch (err) {
    console.error('Migration hatası:', err.message);
    process.exit(1);
  }
}

migrate();
