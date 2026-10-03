# SmartWaste 🗑️♻️

A full-stack smart waste collection management system for Mumbai, India.

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS + Framer Motion + shadcn/ui
- **Backend**: Node.js + Express + SQLite (better-sqlite3) + JWT + SSE
- **Maps**: React-Leaflet (OpenStreetMap, no API key needed)

## Features

### 👤 Citizen Portal
- Submit pickup requests with map pin / geolocation
- Real-time status tracking (Pending → Assigned → Collected)
- Eco-points & gamification (Seedling → Sprout → Tree → Forest)
- Notifications, saved locations, illegal dumping reports

### 🛡️ Admin Portal
- Live map with collection points, vehicles & request heatmap
- Priority queue (fill level, waste type, zone, age scoring)
- Manual & auto-assign with capacity validation
- Nearest-neighbour route optimization
- Analytics dashboard (by area, waste type, day)

### 🚛 Driver Portal
- Today's optimised route in stop order
- One-tap "Mark Collected" with load tracking
- Live GPS location broadcast
- Skip stop & end-of-route unload flow

## Getting Started

```bash
# Install dependencies
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# Reset and seed the database
npm run reset-db

# Start both servers
npm run dev
```

App runs at **http://localhost:3000**

## Demo Credentials

| Role    | Email                      | Password      |
|---------|----------------------------|---------------|
| Citizen | citizen@smartwaste.in      | Citizen@123   |
| Admin   | admin@smartwaste.in        | Admin@123     |
| Driver  | driver@smartwaste.in       | Driver@123    |

## API

Backend runs at **http://localhost:5000**

Key endpoints:
- `POST /api/auth/login` — login
- `GET  /api/citizen/overview` — user KPIs
- `POST /api/citizen/requests` — submit pickup
- `POST /api/admin/auto-assign` — greedy assignment
- `POST /api/admin/routes/:id/optimize` — route optimization
- `GET  /api/events` — SSE live updates

## Project Structure

```
smartwaste/
├── client/          # React frontend
│   └── src/
│       ├── components/
│       ├── pages/
│       │   ├── Citizen/
│       │   └── ...
│       ├── lib/api.ts
│       └── hooks/useLiveEvents.ts
├── server/          # Express backend
│   ├── index.js     # All routes
│   ├── lib/
│   │   ├── priority.js
│   │   ├── routing.js
│   │   └── geo.js
│   ├── reset-db.js
│   └── seed.js
└── shared/
    ├── region.json  # Mumbai config
    └── constants.ts
```
