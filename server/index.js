// SmartWaste — Complete Backend (Node + Express + better-sqlite3)
'use strict';

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const Database    = require('better-sqlite3');
const path        = require('path');
const jwt         = require('jsonwebtoken');
const bcrypt      = require('bcryptjs');
const https       = require('https');

const { calculatePriority }  = require('./lib/priority');
const { getOptimalRoute }    = require('./lib/routing');
const { haversine, nearestArea } = require('./lib/geo');
const REGION = require('../shared/region.json');

const app = express();
const DB_PATH = path.join(__dirname, 'smartwaste.db');
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

const JWT_SECRET = process.env.JWT_SECRET || 'smartwaste-secret-2024';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5173'], credentials: true }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false }));

// ─── SSE ──────────────────────────────────────────────────────────────────────
const sseClients = new Map(); // clientId → { res, userId, role }
let sseCounter = 0;

function sendSSE(clientId, event, data) {
  const client = sseClients.get(clientId);
  if (client) client.res.write(`data: ${JSON.stringify({ event, data, ts: Date.now() })}\n\n`);
}

function broadcastToRole(role, event, data) {
  sseClients.forEach((c, id) => { if (c.role === role || role === 'all') sendSSE(id, event, data); });
}

function broadcastToUser(userId, event, data) {
  sseClients.forEach((c, id) => { if (c.userId === userId) sendSSE(id, event, data); });
}

function broadcastAll(event, data) { broadcastToRole('all', event, data); }

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function auth(...roles) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
      req.user = decoded;
      if (roles.length && !roles.includes(decoded.role))
        return res.status(403).json({ error: 'Forbidden' });
      next();
    } catch {
      res.status(401).json({ error: 'Token invalid or expired' });
    }
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function computeLevel(pts) {
  if (pts >= 700) return 'Forest';
  if (pts >= 300) return 'Tree';
  if (pts >= 100) return 'Sprout';
  return 'Seedling';
}

function logActivity(userId, action, targetType, targetId) {
  try {
    db.prepare('INSERT INTO activity_log (user_id, action, target_type, target_id) VALUES (?,?,?,?)').run(userId, action, targetType, targetId);
  } catch {}
}

function createNotification(userId, type, title, message, requestId = null) {
  try {
    const info = db.prepare('INSERT INTO notifications (user_id, type, title, message, request_id) VALUES (?,?,?,?,?)').run(userId, type, title, message, requestId);
    broadcastToUser(userId, 'notification.new', { id: info.lastInsertRowid, type, title, message });
    return info.lastInsertRowid;
  } catch { return null; }
}

function refreshPriorities() {
  const pending = db.prepare("SELECT * FROM pickup_requests WHERE status IN ('Pending','Assigned')").all();
  const updateStmt = db.prepare('UPDATE pickup_requests SET priority_score=?, priority_level=?, priority_breakdown=? WHERE id=?');
  for (const r of pending) {
    const { score, level, breakdown } = calculatePriority(r);
    updateStmt.run(score, level, JSON.stringify(breakdown), r.id);
  }
}

// Refresh priorities every 5 minutes
setInterval(refreshPriorities, 5 * 60 * 1000);

// Nominatim geocoding cache
const geoCache = new Map();
let lastGeoCall = 0;

function nominatimFetch(url) {
  return new Promise((resolve, reject) => {
    const now = Date.now();
    const wait = Math.max(0, 1000 - (now - lastGeoCall));
    setTimeout(() => {
      lastGeoCall = Date.now();
      if (geoCache.has(url)) return resolve(geoCache.get(url));
      https.get(url, { headers: { 'User-Agent': 'SmartWaste/1.0 (smartwaste.in)' } }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            geoCache.set(url, parsed);
            resolve(parsed);
          } catch { reject(new Error('Parse failed')); }
        });
      }).on('error', reject);
    }, wait);
  });
}

// ─── PUBLIC ENDPOINTS ─────────────────────────────────────────────────────────
app.get('/api/public/stats', (req, res) => {
  const stats = {
    total_requests: db.prepare('SELECT COUNT(*) as c FROM pickup_requests').get().c,
    collected:      db.prepare("SELECT COUNT(*) as c FROM pickup_requests WHERE status='Collected'").get().c,
    pending:        db.prepare("SELECT COUNT(*) as c FROM pickup_requests WHERE status='Pending'").get().c,
    active_vehicles:db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE status='Active'").get().c,
    total_users:    db.prepare("SELECT COUNT(*) as c FROM users WHERE role='citizen'").get().c,
    total_kg:       db.prepare("SELECT COALESCE(SUM(quantity_kg),0) as t FROM pickup_requests WHERE status='Collected'").get().t,
  };
  res.json(stats);
});

app.get('/api/public/leaderboard', (req, res) => {
  res.json(db.prepare("SELECT name, eco_points, level FROM users WHERE role='citizen' AND is_active=1 ORDER BY eco_points DESC LIMIT 10").all());
});

// ─── GEO PROXY ────────────────────────────────────────────────────────────────
app.get('/api/geo/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Missing q' });
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&countrycodes=in&viewbox=72.70,18.85,73.15,19.45&bounded=1&limit=5`;
    const data = await nominatimFetch(url);
    res.json(data.map(r => ({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), display_name: r.display_name })));
  } catch { res.json([]); }
});

app.get('/api/geo/reverse', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'Missing lat/lng' });
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const data = await nominatimFetch(url);
    res.json({ display_name: data.display_name, suburb: data.address?.suburb || data.address?.neighbourhood || '' });
  } catch { res.json({ display_name: '', suburb: '' }); }
});

// ─── AUTH ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/register', (req, res) => {
  let { email, password, name, phone } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  email = email.trim().toLowerCase();
  try {
    const hash = bcrypt.hashSync(password, 10);
    const info = db.prepare('INSERT INTO users (email, password_hash, role, name, phone, is_active) VALUES (?,?,?,?,?,1)').run(email, hash, 'citizen', name || '', phone || '');
    const token = jwt.sign({ id: info.lastInsertRowid, role: 'citizen' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, role: 'citizen', id: info.lastInsertRowid });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', (req, res) => {
  let { email, username, password, role } = req.body;
  const target = (email || username || '').trim().toLowerCase();
  if (!target || !password) return res.status(401).json({ error: 'Invalid email or password' });

  const user = db.prepare('SELECT * FROM users WHERE email=?').get(target);
  if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid email or password' });
  if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid email or password' });
  if (role && user.role !== role) return res.status(403).json({ error: `This account is not a ${role} account` });

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, role: user.role });
});

app.get('/api/auth/me', auth(), (req, res) => {
  const u = db.prepare('SELECT id,email,role,name,phone,address,language,eco_points,level,is_active FROM users WHERE id=?').get(req.user.id);
  if (!u) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ ...u, token: req.headers.authorization.split(' ')[1] });
});

// ─── SHARED ───────────────────────────────────────────────────────────────────
app.get('/api/points', auth(), (req, res) => {
  res.json(db.prepare('SELECT * FROM collection_points ORDER BY fill_level DESC').all());
});

app.patch('/api/auth/me', auth(), (req, res) => {
  const { name, phone, address, language } = req.body;
  db.prepare('UPDATE users SET name=COALESCE(?,name), phone=COALESCE(?,phone), address=COALESCE(?,address), language=COALESCE(?,language) WHERE id=?').run(name, phone, address, language, req.user.id);
  res.json({ success: true });
});

// ─── CITIZEN ──────────────────────────────────────────────────────────────────
app.get('/api/citizen/overview', auth('citizen'), (req, res) => {
  const uid = req.user.id;
  const user = db.prepare('SELECT eco_points, level, name FROM users WHERE id=?').get(uid);
  const active  = db.prepare("SELECT COUNT(*) as c FROM pickup_requests WHERE user_id=? AND status IN ('Pending','Assigned')").get(uid).c;
  const completed = db.prepare("SELECT COUNT(*) as c FROM pickup_requests WHERE user_id=? AND status='Collected'").get(uid).c;
  const total_kg  = db.prepare("SELECT COALESCE(SUM(quantity_kg),0) as t FROM pickup_requests WHERE user_id=? AND status='Collected'").get(uid).t;
  const unread_notifications = db.prepare("SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND is_read=0").get(uid).c;
  const latest = db.prepare("SELECT * FROM pickup_requests WHERE user_id=? ORDER BY created_at DESC LIMIT 1").get(uid);
  const co2_saved = Math.round(total_kg * 0.21);

  res.json({ active_requests: active, completed, total_kg, eco_points: user.eco_points, level: user.level, co2_saved, unread_notifications, latest_request: latest, name: user.name });
});

app.get('/api/citizen/requests', auth('citizen'), (req, res) => {
  res.json(db.prepare('SELECT * FROM pickup_requests WHERE user_id=? ORDER BY created_at DESC').all(req.user.id));
});

app.post('/api/citizen/requests', auth('citizen'), (req, res) => {
  const { lat, lng, zone_type, waste_type, quantity_kg, fill_level, overflowing, notes } = req.body;
  if (!lat || !lng || !waste_type) return res.status(400).json({ error: 'lat, lng and waste_type are required' });

  // Duplicate check: same user, same location (~30m), Pending or Assigned
  const existing = db.prepare("SELECT id FROM pickup_requests WHERE user_id=? AND status IN ('Pending','Assigned') AND ABS(lat-?)<0.0003 AND ABS(lng-?)<0.0003").get(req.user.id, lat, lng);
  if (existing) return res.status(409).json({ error: 'Duplicate request', existing_id: existing.id });

  const { score, level, breakdown } = calculatePriority({ fill_level: fill_level || 0, overflowing: overflowing ? 1 : 0, zone_type, waste_type, created_at: new Date() });

  const info = db.prepare(`INSERT INTO pickup_requests (user_id, lat, lng, zone_type, waste_type, quantity_kg, fill_level, overflowing, notes, priority_score, priority_level, priority_breakdown, status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'Pending')`).run(req.user.id, lat, lng, zone_type || 'public', waste_type, quantity_kg || 0, fill_level || 0, overflowing ? 1 : 0, notes || '', score, level, JSON.stringify(breakdown));

  const reqId = info.lastInsertRowid;
  logActivity(req.user.id, 'created_request', 'pickup_request', reqId);
  broadcastToRole('admin', 'request.created', { id: reqId, priority_score: score, priority_level: level });
  res.status(201).json({ id: reqId, status: 'Pending', priority_score: score, priority_level: level });
});

app.patch('/api/citizen/requests/:id/cancel', auth('citizen'), (req, res) => {
  const r = db.prepare('SELECT * FROM pickup_requests WHERE id=?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (r.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (!['Pending', 'Assigned'].includes(r.status)) return res.status(400).json({ error: 'Cannot cancel a completed request' });

  db.prepare("UPDATE pickup_requests SET status='Cancelled', cancelled_at=datetime('now'), cancel_reason=? WHERE id=?").run(req.body.reason || '', r.id);
  broadcastToRole('admin', 'request.cancelled', { id: r.id });
  broadcastToRole('driver', 'request.cancelled', { id: r.id });
  res.json({ success: true });
});

app.post('/api/citizen/requests/:id/rating', auth('citizen'), (req, res) => {
  const r = db.prepare("SELECT * FROM pickup_requests WHERE id=? AND user_id=? AND status='Collected'").get(req.params.id, req.user.id);
  if (!r) return res.status(404).json({ error: 'Request not found or not collected' });
  const { stars, comment } = req.body;
  if (!stars || stars < 1 || stars > 5) return res.status(400).json({ error: 'Stars must be 1–5' });
  try {
    db.prepare('INSERT INTO ratings (request_id, user_id, stars, comment) VALUES (?,?,?,?)').run(r.id, req.user.id, stars, comment || '');
    res.json({ success: true });
  } catch { res.status(409).json({ error: 'Already rated' }); }
});

app.get('/api/citizen/notifications', auth('citizen'), (req, res) => {
  res.json(db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(req.user.id));
});

app.patch('/api/citizen/notifications/:id/read', auth('citizen'), (req, res) => {
  db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

app.patch('/api/citizen/notifications/read-all', auth('citizen'), (req, res) => {
  db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(req.user.id);
  res.json({ success: true });
});

app.get('/api/citizen/impact', auth('citizen'), (req, res) => {
  const uid = req.user.id;
  const total_kg   = db.prepare("SELECT COALESCE(SUM(quantity_kg),0) as t FROM pickup_requests WHERE user_id=? AND status='Collected'").get(uid).t;
  const by_waste   = db.prepare("SELECT waste_type, COALESCE(SUM(quantity_kg),0) as kg FROM pickup_requests WHERE user_id=? AND status='Collected' GROUP BY waste_type").all(uid);
  const co2_saved  = Math.round(total_kg * 0.21);
  const trees_saved= Math.round(total_kg * 0.017);
  res.json({ total_kg, co2_saved, trees_saved, by_waste });
});

// Saved locations
app.get('/api/citizen/locations', auth('citizen'), (req, res) => {
  res.json(db.prepare('SELECT * FROM saved_locations WHERE user_id=?').all(req.user.id));
});
app.post('/api/citizen/locations', auth('citizen'), (req, res) => {
  const { label, address, lat, lng } = req.body;
  const info = db.prepare('INSERT INTO saved_locations (user_id, label, address, lat, lng) VALUES (?,?,?,?,?)').run(req.user.id, label, address, lat, lng);
  res.json({ id: info.lastInsertRowid });
});
app.delete('/api/citizen/locations/:id', auth('citizen'), (req, res) => {
  db.prepare('DELETE FROM saved_locations WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

// Dumping reports
app.post('/api/citizen/reports', auth('citizen'), (req, res) => {
  const { lat, lng, description, photo } = req.body;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
  const info = db.prepare("INSERT INTO dumping_reports (user_id, lat, lng, description, photo) VALUES (?,?,?,?,?)").run(req.user.id, lat, lng, description || '', photo || '');
  broadcastToRole('admin', 'dumping_report.new', { id: info.lastInsertRowid });
  res.json({ id: info.lastInsertRowid });
});

// ─── ADMIN ────────────────────────────────────────────────────────────────────
app.get('/api/admin/overview', auth('admin'), (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  res.json({
    total_requests:  db.prepare('SELECT COUNT(*) as c FROM pickup_requests').get().c,
    pending:         db.prepare("SELECT COUNT(*) as c FROM pickup_requests WHERE status='Pending'").get().c,
    assigned:        db.prepare("SELECT COUNT(*) as c FROM pickup_requests WHERE status='Assigned'").get().c,
    collected_today: db.prepare("SELECT COUNT(*) as c FROM pickup_requests WHERE status='Collected' AND DATE(collected_at)=?").get(today).c,
    active_vehicles: db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE status='Active'").get().c,
    total_users:     db.prepare("SELECT COUNT(*) as c FROM users WHERE role='citizen'").get().c,
    total_kg_today:  db.prepare("SELECT COALESCE(SUM(quantity_kg),0) as t FROM pickup_requests WHERE status='Collected' AND DATE(collected_at)=?").get(today).t,
    urgent_requests: db.prepare("SELECT COUNT(*) as c FROM pickup_requests WHERE priority_level='Urgent' AND status='Pending'").get().c,
    heatmap_points:  db.prepare("SELECT lat, lng, fill_level as weight FROM collection_points").all(),
  });
});

app.get('/api/admin/requests', auth('admin'), (req, res) => {
  const { status, waste_type, area, search, page = 1, limit = 50 } = req.query;
  let where = '1=1';
  const params = [];
  if (status)     { where += ' AND pr.status=?';     params.push(status); }
  if (waste_type) { where += ' AND pr.waste_type=?'; params.push(waste_type); }
  if (search)     { where += ' AND (u.name LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const rows = db.prepare(`SELECT pr.*, u.name as user_name, u.email as user_email, v.plate_number FROM pickup_requests pr LEFT JOIN users u ON u.id=pr.user_id LEFT JOIN vehicles v ON v.id=pr.vehicle_id WHERE ${where} ORDER BY pr.priority_score DESC, pr.created_at DESC LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);
  const total = db.prepare(`SELECT COUNT(*) as c FROM pickup_requests pr LEFT JOIN users u ON u.id=pr.user_id WHERE ${where}`).get(...params).c;
  res.json({ rows, total, page: parseInt(page), limit: parseInt(limit) });
});

app.patch('/api/admin/requests/:id', auth('admin'), (req, res) => {
  const { status, notes } = req.body;
  db.prepare('UPDATE pickup_requests SET status=COALESCE(?,status), notes=COALESCE(?,notes) WHERE id=?').run(status, notes, req.params.id);
  res.json({ success: true });
});

// Collection Points CRUD
app.get('/api/admin/points', auth('admin'), (req, res) => {
  res.json(db.prepare('SELECT * FROM collection_points ORDER BY fill_level DESC').all());
});

app.post('/api/admin/points', auth('admin'), (req, res) => {
  const { name, address, area, zone_type, lat, lng } = req.body;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
  const info = db.prepare('INSERT INTO collection_points (name, address, area, zone_type, lat, lng, fill_level, created_by) VALUES (?,?,?,?,?,?,0,?)').run(name || 'New Point', address || '', area || '', zone_type || 'public', lat, lng, req.user.id);
  broadcastAll('point.updated', { id: info.lastInsertRowid });
  res.json({ id: info.lastInsertRowid });
});

app.patch('/api/admin/points/:id', auth('admin'), (req, res) => {
  const { name, address, area, zone_type, fill_level } = req.body;
  db.prepare('UPDATE collection_points SET name=COALESCE(?,name), address=COALESCE(?,address), area=COALESCE(?,area), zone_type=COALESCE(?,zone_type), fill_level=COALESCE(?,fill_level) WHERE id=?').run(name, address, area, zone_type, fill_level, req.params.id);
  broadcastAll('point.updated', { id: req.params.id });
  res.json({ success: true });
});

app.delete('/api/admin/points/:id', auth('admin'), (req, res) => {
  db.prepare('DELETE FROM collection_points WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Demo tool — bump fill of a point
app.post('/api/admin/points/:id/bump-fill', auth('admin'), (req, res) => {
  const { fill_level } = req.body;
  db.prepare('UPDATE collection_points SET fill_level=? WHERE id=?').run(fill_level, req.params.id);
  broadcastAll('point.updated', { id: req.params.id, fill_level });
  res.json({ success: true });
});

// Vehicles CRUD
app.get('/api/admin/vehicles', auth('admin'), (req, res) => {
  res.json(db.prepare('SELECT v.*, u.name as driver_name, u.email as driver_email FROM vehicles v LEFT JOIN users u ON u.id=v.driver_id').all());
});

app.post('/api/admin/vehicles', auth('admin'), (req, res) => {
  const { name, plate_number, type, capacity_kg, driver_id, depot_lat, depot_lng } = req.body;
  if (!plate_number) return res.status(400).json({ error: 'plate_number required' });
  try {
    const info = db.prepare('INSERT INTO vehicles (name, plate_number, type, capacity_kg, driver_id, depot_lat, depot_lng, status) VALUES (?,?,?,?,?,?,?,?)').run(name || plate_number, plate_number, type || 'truck', capacity_kg || 1000, driver_id || null, depot_lat || 19.0176, depot_lng || 72.8157, 'Active');
    res.json({ id: info.lastInsertRowid });
  } catch { res.status(409).json({ error: 'Plate already exists' }); }
});

app.patch('/api/admin/vehicles/:id', auth('admin'), (req, res) => {
  const { name, capacity_kg, driver_id, status } = req.body;
  db.prepare('UPDATE vehicles SET name=COALESCE(?,name), capacity_kg=COALESCE(?,capacity_kg), driver_id=COALESCE(?,driver_id), status=COALESCE(?,status) WHERE id=?').run(name, capacity_kg, driver_id, status, req.params.id);
  broadcastAll('vehicle.updated', { id: req.params.id });
  res.json({ success: true });
});

app.delete('/api/admin/vehicles/:id', auth('admin'), (req, res) => {
  db.prepare('DELETE FROM vehicles WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Assign endpoint (manual)
app.post('/api/admin/assign', auth('admin'), (req, res) => {
  const { request_id, vehicle_id } = req.body;
  if (!request_id || !vehicle_id) return res.status(400).json({ error: 'request_id and vehicle_id required' });

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id=?').get(vehicle_id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const request = db.prepare('SELECT * FROM pickup_requests WHERE id=?').get(request_id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  // Capacity check
  const currentLoad = db.prepare("SELECT COALESCE(SUM(quantity_kg),0) as t FROM pickup_requests WHERE vehicle_id=? AND status='Assigned'").get(vehicle_id).t;
  if (currentLoad + (request.quantity_kg || 0) > vehicle.capacity_kg) {
    const remaining_kg = vehicle.capacity_kg - currentLoad;
    const suggestions = db.prepare(`
      SELECT v.id, v.plate_number, v.capacity_kg,
        (v.capacity_kg - COALESCE((SELECT SUM(pr.quantity_kg) FROM pickup_requests pr WHERE pr.vehicle_id=v.id AND pr.status='Assigned'),0)) as remaining_kg
      FROM vehicles v
      WHERE v.status='Active' AND v.id!=?
        AND (v.capacity_kg - COALESCE((SELECT SUM(pr.quantity_kg) FROM pickup_requests pr WHERE pr.vehicle_id=v.id AND pr.status='Assigned'),0)) >= ?
    `).all(vehicle_id, request.quantity_kg || 0);
    return res.status(409).json({ error: 'CAPACITY_EXCEEDED', remaining_kg, suggested_vehicles: suggestions });
  }

  const assign = db.transaction(() => {
    db.prepare("UPDATE pickup_requests SET status='Assigned', vehicle_id=?, assigned_at=datetime('now') WHERE id=?").run(vehicle_id, request_id);
    logActivity(req.user.id, 'assigned', 'pickup_request', request_id);
    createNotification(request.user_id, 'assignment', 'Pickup Assigned', `Your request #${request_id} has been assigned. A vehicle is on its way.`, request_id);
  });
  assign();

  broadcastToRole('driver', 'request.assigned', { request_id, vehicle_id });
  broadcastToUser(request.user_id, 'request.assigned', { id: request_id, vehicle_id });
  res.json({ success: true });
});

// Auto-assign: greedy by priority, best-fit capacity
app.post('/api/admin/auto-assign', auth('admin'), (req, res) => {
  const pending = db.prepare("SELECT * FROM pickup_requests WHERE status='Pending' ORDER BY priority_score DESC").all();
  const vehicles = db.prepare("SELECT * FROM vehicles WHERE status='Active'").all();

  const loads = {};
  vehicles.forEach(v => {
    loads[v.id] = db.prepare("SELECT COALESCE(SUM(quantity_kg),0) as t FROM pickup_requests WHERE vehicle_id=? AND status='Assigned'").get(v.id).t;
  });

  const assigned = [], failed = [];

  const doAssign = db.transaction(() => {
    for (const req of pending) {
      const qty = req.quantity_kg || 0;
      // Find best fit vehicle (smallest remaining capacity that still fits)
      let bestVehicle = null, bestRemaining = Infinity;
      for (const v of vehicles) {
        const remaining = v.capacity_kg - loads[v.id];
        if (remaining >= qty && remaining < bestRemaining) { bestVehicle = v; bestRemaining = remaining; }
      }
      if (bestVehicle) {
        db.prepare("UPDATE pickup_requests SET status='Assigned', vehicle_id=?, assigned_at=datetime('now') WHERE id=?").run(bestVehicle.id, req.id);
        loads[bestVehicle.id] += qty;
        assigned.push({ request_id: req.id, vehicle_id: bestVehicle.id });
        createNotification(req.user_id, 'assignment', 'Pickup Assigned', `Your request #${req.id} has been assigned.`, req.id);
      } else {
        failed.push({ request_id: req.id, reason: 'No vehicle with sufficient capacity' });
      }
    }
  });
  doAssign();

  broadcastToRole('driver', 'route.updated', {});
  res.json({ assigned, failed });
});

// Route optimization
app.post('/api/admin/routes/:vehicleId/optimize', auth('admin'), (req, res) => {
  const { vehicleId } = req.params;
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id=?').get(vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const stops = db.prepare("SELECT * FROM pickup_requests WHERE vehicle_id=? AND status='Assigned' ORDER BY priority_score DESC").all(vehicleId);
  if (stops.length === 0) return res.json({ stops: [], total_km: 0, eta_minutes: 0 });

  const result = getOptimalRoute(vehicle.depot_lat || 19.0176, vehicle.depot_lng || 72.8157, stops);

  // Write route_order back
  const update = db.prepare('UPDATE pickup_requests SET route_order=? WHERE id=?');
  result.stops.forEach((s, i) => update.run(i + 1, s.id));

  broadcastToRole('driver', 'route.updated', { vehicle_id: vehicleId });
  res.json(result);
});

// Analytics
app.get('/api/admin/analytics', auth('admin'), (req, res) => {
  const byArea   = db.prepare("SELECT area, COUNT(*) as count, SUM(quantity_kg) as kg FROM pickup_requests pr LEFT JOIN collection_points cp ON cp.id=pr.point_id GROUP BY area").all();
  const byStatus = db.prepare("SELECT status, COUNT(*) as count FROM pickup_requests GROUP BY status").all();
  const byWaste  = db.prepare("SELECT waste_type, COUNT(*) as count, SUM(quantity_kg) as kg FROM pickup_requests GROUP BY waste_type").all();
  const byDay    = db.prepare("SELECT DATE(created_at) as day, COUNT(*) as count FROM pickup_requests GROUP BY DATE(created_at) ORDER BY day DESC LIMIT 30").all();
  const heatmap  = db.prepare("SELECT lat, lng, fill_level as weight FROM collection_points WHERE fill_level > 0").all();
  res.json({ byArea, byStatus, byWaste, byDay, heatmap });
});

// Activity log
app.get('/api/admin/activity', auth('admin'), (req, res) => {
  res.json(db.prepare('SELECT al.*, u.name as user_name FROM activity_log al LEFT JOIN users u ON u.id=al.user_id ORDER BY al.created_at DESC LIMIT 100').all());
});

// Dumping reports
app.get('/api/admin/reports', auth('admin'), (req, res) => {
  res.json(db.prepare('SELECT dr.*, u.name as user_name FROM dumping_reports dr LEFT JOIN users u ON u.id=dr.user_id ORDER BY dr.created_at DESC').all());
});

app.patch('/api/admin/reports/:id', auth('admin'), (req, res) => {
  db.prepare('UPDATE dumping_reports SET status=? WHERE id=?').run(req.body.status, req.params.id);
  res.json({ success: true });
});

// Settings
app.get('/api/admin/settings', auth('admin'), (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = {};
  rows.forEach(r => { try { s[r.key] = JSON.parse(r.value); } catch { s[r.key] = r.value; } });
  res.json(s);
});

app.patch('/api/admin/settings', auth('admin'), (req, res) => {
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  const tx = db.transaction(() => {
    for (const [k, v] of Object.entries(req.body)) upsert.run(k, JSON.stringify(v));
  });
  tx();
  res.json({ success: true });
});

// ─── DRIVER ───────────────────────────────────────────────────────────────────
app.get('/api/driver/today', auth('driver'), (req, res) => {
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE driver_id=?').get(req.user.id);
  if (!vehicle) return res.status(404).json({ error: 'No vehicle assigned' });

  const stops = db.prepare("SELECT * FROM pickup_requests WHERE vehicle_id=? AND status IN ('Assigned','Pending') ORDER BY route_order ASC, priority_score DESC").all(vehicle.id);
  const collected_today = db.prepare("SELECT COUNT(*) as c FROM pickup_requests WHERE vehicle_id=? AND status='Collected' AND DATE(collected_at)=DATE('now')").get(vehicle.id).c;

  res.json({ vehicle, stops, collected_today, total_stops: stops.length });
});

app.post('/api/driver/route/start', auth('driver'), (req, res) => {
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE driver_id=?').get(req.user.id);
  if (!vehicle) return res.status(404).json({ error: 'No vehicle assigned' });
  db.prepare("UPDATE vehicles SET status='on_route' WHERE id=?").run(vehicle.id);
  broadcastToRole('admin', 'vehicle.updated', { id: vehicle.id, status: 'on_route' });
  res.json({ success: true });
});

app.post('/api/driver/route/end', auth('driver'), (req, res) => {
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE driver_id=?').get(req.user.id);
  if (!vehicle) return res.status(404).json({ error: 'No vehicle assigned' });
  db.prepare("UPDATE vehicles SET status='Active', loaded_kg=0 WHERE id=?").run(vehicle.id);
  broadcastToRole('admin', 'vehicle.updated', { id: vehicle.id, status: 'Active' });
  res.json({ success: true });
});

app.post('/api/driver/requests/:id/collect', auth('driver'), (req, res) => {
  const reqId = parseInt(req.params.id);
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE driver_id=?').get(req.user.id);
  if (!vehicle) return res.status(404).json({ error: 'No vehicle assigned' });

  const request = db.prepare('SELECT * FROM pickup_requests WHERE id=?').get(reqId);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.vehicle_id !== vehicle.id) return res.status(403).json({ error: 'This request is not on your route' });

  const newLoad = (vehicle.loaded_kg || 0) + (request.quantity_kg || 0);
  if (newLoad > vehicle.capacity_kg) {
    return res.status(409).json({ error: 'CAPACITY_EXCEEDED', remaining_kg: vehicle.capacity_kg - (vehicle.loaded_kg || 0) });
  }

  // Eco points: 10 + floor(kg/5) + 5 bonus for recyclable/ewaste
  const qty = request.quantity_kg || 0;
  const bonus = ['dry_recyclable', 'ewaste'].includes(request.waste_type) ? 5 : 0;
  const pts = 10 + Math.floor(qty / 5) + bonus;

  const collectTx = db.transaction(() => {
    db.prepare("UPDATE pickup_requests SET status='Collected', collected_at=datetime('now') WHERE id=?").run(reqId);
    db.prepare('UPDATE vehicles SET loaded_kg=? WHERE id=?').run(newLoad, vehicle.id);

    // Reset fill on the associated collection point
    if (request.point_id) {
      db.prepare('UPDATE collection_points SET fill_level=0, last_collected=datetime(\'now\') WHERE id=?').run(request.point_id);
      broadcastAll('point.updated', { id: request.point_id, fill_level: 0 });
    }

    // Award eco points
    db.prepare('UPDATE users SET eco_points=eco_points+? WHERE id=?').run(pts, request.user_id);
    db.prepare('INSERT INTO eco_points_ledger (user_id, points, reason, request_id) VALUES (?,?,?,?)').run(request.user_id, pts, 'Waste collected', reqId);

    // Update level
    const newPts = db.prepare('SELECT eco_points FROM users WHERE id=?').get(request.user_id).eco_points;
    db.prepare('UPDATE users SET level=? WHERE id=?').run(computeLevel(newPts), request.user_id);

    logActivity(req.user.id, 'collected', 'pickup_request', reqId);
    createNotification(request.user_id, 'collection', 'Waste Collected!', `Your waste was collected. You earned ${pts} eco points!`, reqId);
  });
  collectTx();

  broadcastAll('request.collected', { id: reqId, vehicle_id: vehicle.id });
  res.json({ success: true, points_awarded: pts });
});

app.post('/api/driver/requests/:id/skip', auth('driver'), (req, res) => {
  const reqId = req.params.id;
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE driver_id=?').get(req.user.id);
  if (!vehicle) return res.status(404).json({ error: 'No vehicle assigned' });

  // Move to end of route by increasing route_order
  const maxOrder = db.prepare('SELECT MAX(route_order) as m FROM pickup_requests WHERE vehicle_id=?').get(vehicle.id).m || 0;
  db.prepare('UPDATE pickup_requests SET route_order=? WHERE id=?').run(maxOrder + 1, reqId);
  logActivity(req.user.id, 'skipped', 'pickup_request', reqId);
  res.json({ success: true });
});

app.post('/api/driver/location', auth('driver'), (req, res) => {
  const { lat, lng } = req.body;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE driver_id=?').get(req.user.id);
  if (!vehicle) return res.status(404).json({ error: 'No vehicle assigned' });
  db.prepare('UPDATE vehicles SET lat=?, lng=?, last_seen=datetime(\'now\') WHERE id=?').run(lat, lng, vehicle.id);
  broadcastToRole('admin', 'vehicle.location', { vehicle_id: vehicle.id, lat, lng });
  res.json({ success: true });
});

// ─── SSE ──────────────────────────────────────────────────────────────────────
app.get('/api/events', auth(), (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const clientId = ++sseCounter;
  sseClients.set(clientId, { res, userId: req.user.id, role: req.user.role });
  res.write(`data: ${JSON.stringify({ event: 'connected', data: { clientId } })}\n\n`);

  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { clearInterval(heartbeat); }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(clientId);
  });
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`SmartWaste server running on port ${PORT}`));
}
module.exports = app;
