const Database = require('better-sqlite3');
const db = new Database('smartwaste.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
for (const table of tables) {
    console.log(`Table: ${table.name}`);
    const info = db.prepare(`PRAGMA table_info(${table.name})`).all();
    console.log(info.map(c => `${c.name} (${c.type})`).join(', '));
    console.log('---');
}
