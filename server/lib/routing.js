const { haversine } = require('./geo');

const REGION = require('../../shared/region.json');
const DEPOT = REGION.depot;
const SPEED_KMH = 20;
const STOP_MIN = 5;

/**
 * Nearest-neighbour route from depot through all stops.
 * Cost = distance_km / (1 + priority_score / 100)   (priority-weighted)
 */
function getOptimalRoute(depotLat, depotLng, requests) {
  if (!requests || requests.length === 0) return { stops: [], total_km: 0, eta_minutes: 0 };

  const remaining = [...requests];
  const stops = [];
  let curLat = depotLat || DEPOT.lat;
  let curLng = depotLng || DEPOT.lng;
  let total_km = 0;

  while (remaining.length > 0) {
    let best = null, bestCost = Infinity, bestIdx = -1;

    remaining.forEach((r, i) => {
      const dist = haversine(curLat, curLng, r.lat, r.lng);
      const priority = r.priority_score || 0;
      const cost = dist / (1 + priority / 100);
      if (cost < bestCost) { bestCost = cost; best = r; bestIdx = i; }
    });

    const dist = haversine(curLat, curLng, best.lat, best.lng);
    total_km += dist;
    stops.push({ ...best, leg_km: Math.round(dist * 10) / 10 });
    curLat = best.lat;
    curLng = best.lng;
    remaining.splice(bestIdx, 1);
  }

  // Return trip to depot
  total_km += haversine(curLat, curLng, DEPOT.lat, DEPOT.lng);
  const eta_minutes = Math.round((total_km / SPEED_KMH) * 60 + stops.length * STOP_MIN);

  return { stops, total_km: Math.round(total_km * 10) / 10, eta_minutes };
}

module.exports = { getOptimalRoute };
