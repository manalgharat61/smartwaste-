const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'smartwaste.db');
const isNew = !fs.existsSync(dbPath);

if (isNew) {
  console.log('Database not found, running reset-db and seed scripts...');
  // Force reset-db and seed to use the new path
  process.env.DB_PATH = dbPath;
  
  // Actually, reset-db hardcodes __dirname. We can just copy its CREATE TABLE statements here, 
  // or dynamically replace the path, but instead let's just let it run in __dirname 
  // and then move the file to DB_PATH if it's different.
  const tempDbPath = path.join(__dirname, 'smartwaste.db');
  
  try {
    require('./reset-db.js');
    require('./seed.js');
    
    if (tempDbPath !== dbPath && fs.existsSync(tempDbPath)) {
      fs.copyFileSync(tempDbPath, dbPath);
      fs.unlinkSync(tempDbPath);
      console.log(`Database initialized and moved to ${dbPath}`);
    }
  } catch (err) {
    console.error('Error during init:', err);
  }
} else {
  console.log(`Database already exists at ${dbPath}`);
}
