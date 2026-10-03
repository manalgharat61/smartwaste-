// reset-db.js — drops and recreates the SmartWaste database
'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'smartwaste.db');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const db = new Database(dbPath);
db.pragma('foreign_keys = OFF');
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT    NOT NULL DEFAULT '',
  email          TEXT    UNIQUE NOT NULL,
  phone          TEXT    DEFAULT '',
  password_hash  TEXT    NOT NULL,
  role           TEXT    NOT NULL CHECK(role IN ('citizen','admin','driver')),
  address        TEXT    DEFAULT '',
  language       TEXT    DEFAULT 'en',
  eco_points     INTEGER DEFAULT 0,
  level          TEXT    DEFAULT 'Seedling',
  is_active      INTEGER DEFAULT 1,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vehicles (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT DEFAULT '',
  plate_number TEXT UNIQUE NOT NULL,
  type         TEXT DEFAULT 'truck',
  capacity_kg  INTEGER DEFAULT 1000,
  loaded_kg    INTEGER DEFAULT 0,
  driver_id    INTEGER REFERENCES users(id),
  depot_lat    REAL DEFAULT 19.0176,
  depot_lng    REAL DEFAULT 72.8157,
  lat          REAL,
  lng          REAL,
  last_seen    DATETIME,
  status       TEXT DEFAULT 'Active'
);

CREATE TABLE collection_points (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT    NOT NULL DEFAULT 'Collection Point',
  address        TEXT    DEFAULT '',
  area           TEXT    DEFAULT '',
  zone_type      TEXT    DEFAULT 'public',
  lat            REAL    NOT NULL,
  lng            REAL    NOT NULL,
  fill_level     INTEGER DEFAULT 0,
  last_collected DATETIME,
  created_by     INTEGER REFERENCES users(id),
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pickup_requests (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id               INTEGER REFERENCES users(id),
  point_id              INTEGER REFERENCES collection_points(id),
  vehicle_id            INTEGER REFERENCES vehicles(id),
  lat                   REAL,
  lng                   REAL,
  zone_type             TEXT    DEFAULT 'public',
  waste_type            TEXT    NOT NULL,
  quantity_kg           INTEGER DEFAULT 0,
  fill_level            INTEGER DEFAULT 0,
  overflowing           INTEGER DEFAULT 0,
  notes                 TEXT    DEFAULT '',
  photo                 TEXT    DEFAULT '',
  priority_score        INTEGER DEFAULT 0,
  priority_level        TEXT    DEFAULT 'Low',
  priority_breakdown    TEXT    DEFAULT '{}',
  status                TEXT    DEFAULT 'Pending',
  route_order           INTEGER DEFAULT 0,
  eta_minutes           INTEGER DEFAULT 0,
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  assigned_at           DATETIME,
  collected_at          DATETIME,
  cancelled_at          DATETIME,
  cancel_reason         TEXT    DEFAULT ''
);

CREATE TABLE notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users(id),
  type       TEXT DEFAULT 'info',
  title      TEXT DEFAULT '',
  message    TEXT NOT NULL,
  request_id INTEGER REFERENCES pickup_requests(id),
  is_read    INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE eco_points_ledger (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users(id),
  points     INTEGER NOT NULL,
  reason     TEXT    DEFAULT '',
  request_id INTEGER REFERENCES pickup_requests(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ratings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER UNIQUE REFERENCES pickup_requests(id),
  user_id    INTEGER REFERENCES users(id),
  stars      INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
  comment    TEXT    DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE saved_locations (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  label   TEXT DEFAULT '',
  address TEXT DEFAULT '',
  lat     REAL NOT NULL,
  lng     REAL NOT NULL
);

CREATE TABLE dumping_reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id),
  lat         REAL    NOT NULL,
  lng         REAL    NOT NULL,
  description TEXT    DEFAULT '',
  photo       TEXT    DEFAULT '',
  status      TEXT    DEFAULT 'Open',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activity_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id),
  action      TEXT    NOT NULL,
  target_type TEXT    DEFAULT '',
  target_id   INTEGER,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX idx_pr_user      ON pickup_requests(user_id);
CREATE INDEX idx_pr_vehicle   ON pickup_requests(vehicle_id);
CREATE INDEX idx_pr_status    ON pickup_requests(status);
CREATE INDEX idx_pr_priority  ON pickup_requests(priority_score DESC);
CREATE INDEX idx_notif_user   ON notifications(user_id, is_read);
`);

db.pragma('foreign_keys = ON');
console.log('✅  Database reset and schema created at', dbPath);
