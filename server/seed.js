// seed.js — idempotent seeding of demo data
'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const db = new Database(path.join(__dirname, 'smartwaste.db'));
db.pragma('foreign_keys = ON');

const { calculatePriority } = require('./lib/priority');

// --- Users ---
const users = [
  { email: 'citizen@smartwaste.in', password: 'Citizen@123', role: 'citizen', name: 'Priya Sharma' },
  { email: 'admin@smartwaste.in',   password: 'Admin@123',   role: 'admin',   name: 'Raj Mehta' },
  { email: 'driver@smartwaste.in',  password: 'Driver@123',  role: 'driver',  name: 'Arun Patel' },
];

const upsertUser = db.prepare(`
  INSERT INTO users (email, password_hash, role, name, is_active)
  VALUES (?, ?, ?, ?, 1)
  ON CONFLICT(email) DO NOTHING
`);

const ids = {};
for (const u of users) {
  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(u.email);
  if (!existing) {
    const hash = bcrypt.hashSync(u.password, 10);
    const info = upsertUser.run(u.email, hash, u.role, u.name);
    ids[u.role] = info.lastInsertRowid;
  } else {
    ids[u.role] = existing.id;
  }
}

// --- Vehicle ---
let vehicleId;
const existingVehicle = db.prepare("SELECT id FROM vehicles WHERE plate_number='MH-01-AB-1234'").get();
if (!existingVehicle) {
  const info = db.prepare(`
    INSERT INTO vehicles (name, plate_number, type, capacity_kg, loaded_kg, driver_id, depot_lat, depot_lng, status)
    VALUES ('Worli Truck 1', 'MH-01-AB-1234', 'truck', 1000, 0, ?, 19.0176, 72.8157, 'Active')
  `).run(ids.driver);
  vehicleId = info.lastInsertRowid;
} else {
  vehicleId = existingVehicle.id;
}

// --- Collection Points ---
const points = [
  { name: 'Andheri Market',          area: 'Andheri', zone_type: 'market',      lat: 19.1136, lng: 72.8697, fill_level: 85 },
  { name: 'Bandra Residential Block', area: 'Bandra',  zone_type: 'residential', lat: 19.0596, lng: 72.8295, fill_level: 40 },
  { name: 'Sion Hospital Gate',       area: 'Sion',    zone_type: 'hospital',    lat: 19.0390, lng: 72.8619, fill_level: 95 },
];

const upsertPoint = db.prepare(`
  INSERT INTO collection_points (name, area, zone_type, lat, lng, fill_level, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT DO NOTHING
`);

const pointIds = [];
for (const p of points) {
  const existing = db.prepare('SELECT id FROM collection_points WHERE name=?').get(p.name);
  if (!existing) {
    const info = upsertPoint.run(p.name, p.area, p.zone_type, p.lat, p.lng, p.fill_level, ids.admin);
    pointIds.push(info.lastInsertRowid);
  } else {
    pointIds.push(existing.id);
  }
}

// --- Pickup Requests ---
if (db.prepare('SELECT COUNT(*) as c FROM pickup_requests').get().c === 0) {
  const requests = [
    { zone_type: 'market',      waste_type: 'organic',         quantity_kg: 200, fill_level: 85, overflowing: 0, status: 'Pending',   vehicle_id: null,      point_id: pointIds[0], lat: 19.1136, lng: 72.8697 },
    { zone_type: 'residential', waste_type: 'dry_recyclable',  quantity_kg: 50,  fill_level: 40, overflowing: 0, status: 'Assigned',   vehicle_id: vehicleId, point_id: pointIds[1], lat: 19.0596, lng: 72.8295 },
    { zone_type: 'hospital',    waste_type: 'medical',         quantity_kg: 30,  fill_level: 95, overflowing: 1, status: 'Collected',  vehicle_id: vehicleId, point_id: pointIds[2], lat: 19.0390, lng: 72.8619 },
  ];

  const insertReq = db.prepare(`
    INSERT INTO pickup_requests (user_id, point_id, vehicle_id, lat, lng, zone_type, waste_type, quantity_kg, fill_level, overflowing, priority_score, priority_level, priority_breakdown, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const r of requests) {
    const { score, level, breakdown } = calculatePriority({ ...r, created_at: new Date() });
    insertReq.run(ids.citizen, r.point_id, r.vehicle_id, r.lat, r.lng, r.zone_type, r.waste_type, r.quantity_kg, r.fill_level, r.overflowing, score, level, JSON.stringify(breakdown), r.status);
  }
}

// --- Default settings ---
const settingUpsert = db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO NOTHING");
settingUpsert.run('speed_kmh',       '20');
settingUpsert.run('stop_minutes',    '5');
settingUpsert.run('depot_lat',       '19.0176');
settingUpsert.run('depot_lng',       '72.8157');
settingUpsert.run('depot_name',      '"Worli Depot"');

console.log('✅  Database seeded successfully');
console.log('   Citizen:', ids.citizen, '| Admin:', ids.admin, '| Driver:', ids.driver);
console.log('   Vehicle ID:', vehicleId, '| Collection Points:', pointIds.join(', '));
