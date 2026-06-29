require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('./index');

async function migrate() {
  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      console.log(`-> ${file}`);
      await query(sql);
    }
    console.log('Migration başarıyla tamamlandı.');
    process.exit(0);
  } catch (err) {
    console.error('Migration hatası:', err.message);
    process.exit(1);
  }
}

migrate();
