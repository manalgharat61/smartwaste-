const Database = require('better-sqlite3');
const db = new Database('smartwaste.db');

console.log("Applying migrations...");

try {
  // Alter users
  db.exec(`ALTER TABLE users ADD COLUMN phone TEXT;`);
  db.exec(`ALTER TABLE users ADD COLUMN address TEXT;`);
  db.exec(`ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en';`);
  db.exec(`ALTER TABLE users ADD COLUMN eco_points INTEGER DEFAULT 0;`);
  db.exec(`ALTER TABLE users ADD COLUMN level TEXT DEFAULT 'Seedling';`);
} catch(e) { console.log("User columns already exist or error:", e.message) }

try {
  // Alter pickup_requests
  db.exec(`ALTER TABLE pickup_requests ADD COLUMN cancelled_at TEXT;`);
  db.exec(`ALTER TABLE pickup_requests ADD COLUMN cancel_reason TEXT;`);
} catch(e) { console.log("Pickup requests columns already exist or error:", e.message) }

// Create new tables
db.exec(`
  CREATE TABLE IF NOT EXISTS saved_locations (id INTEGER PRIMARY KEY, user_id INTEGER, label TEXT, address TEXT, lat REAL, lng REAL);
  CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY, user_id INTEGER, type TEXT, title TEXT, message TEXT, request_id INTEGER, is_read INTEGER DEFAULT 0, created_at TEXT);
  CREATE TABLE IF NOT EXISTS eco_points_ledger (id INTEGER PRIMARY KEY, user_id INTEGER, points INTEGER, reason TEXT, request_id INTEGER, created_at TEXT);
  CREATE TABLE IF NOT EXISTS ratings (id INTEGER PRIMARY KEY, request_id INTEGER UNIQUE, user_id INTEGER, stars INTEGER, comment TEXT, created_at TEXT);
  CREATE TABLE IF NOT EXISTS dumping_reports (id INTEGER PRIMARY KEY, user_id INTEGER, lat REAL, lng REAL, description TEXT, photo TEXT, status TEXT DEFAULT 'Open', created_at TEXT);
  CREATE TABLE IF NOT EXISTS recurring_schedules (id INTEGER PRIMARY KEY, user_id INTEGER, location_id INTEGER, waste_type TEXT, quantity_kg REAL, frequency TEXT, day_of_week TEXT, next_run TEXT, active INTEGER DEFAULT 1);
  CREATE TABLE IF NOT EXISTS sorting_guide (id INTEGER PRIMARY KEY, keyword TEXT, category TEXT, bin_type TEXT, bin_color TEXT, tip TEXT);
`);

// Seed sorting guide
const guideCount = db.prepare('SELECT COUNT(*) as c FROM sorting_guide').get().c;
if (guideCount === 0) {
  const insertGuide = db.prepare('INSERT INTO sorting_guide (keyword, category, bin_type, bin_color, tip) VALUES (?, ?, ?, ?, ?)');
  insertGuide.run('pizza box', 'General', 'General Waste', 'black', 'Greasy boxes cannot be recycled.');
  insertGuide.run('battery', 'Hazardous', 'Hazardous', 'red', 'Never put batteries in general waste (fire risk!).');
  insertGuide.run('glass bottle', 'Recyclable', 'Recycling', 'blue', 'Rinse before recycling.');
  insertGuide.run('syringe', 'Medical', 'Medical', 'yellow', 'Must go in a sharps container.');
  insertGuide.run('old phone', 'E-waste', 'E-Waste', 'purple', 'Drop at a certified e-waste center.');
  insertGuide.run('banana peel', 'Organic', 'Compost', 'green', 'Great for compost.');
  console.log("Seeded sorting guide.");
}

console.log("Migrations complete.");
