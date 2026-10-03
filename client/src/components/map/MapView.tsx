import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import region from '../../../../shared/region.json';
import { FILL_COLORS } from '../../../../shared/constants';

function MapBoundsGuard() {
  const map = useMap();
  useEffect(() => {
    map.setMaxBounds(region.maxBounds);
    map.on('drag', () => {
      map.panInsideBounds(region.maxBounds, { animate: false });
    });
  }, [map]);
  return null;
}

function DataFitter({ points, requests, vehicles }) {
  const map = useMap();
  useEffect(() => {
    const latlngs = [];
    if (points) points.forEach(p => latlngs.push([p.lat, p.lng]));
    if (requests) requests.forEach(r => latlngs.push([r.lat, r.lng]));
    if (vehicles) vehicles.forEach(v => latlngs.push([v.lat, v.lng]));
    
    if (latlngs.length > 0) {
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else {
      map.setView([region.center.lat, region.center.lng], region.zoom);
    }
  }, [map, points, requests, vehicles]);
  return null;
}

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick(e.latlng);
    }
  });
  return null;
}

const getFillColor = (fill) => {
  if (fill > 80) return FILL_COLORS.high;
  if (fill > 50) return FILL_COLORS.medium;
  return FILL_COLORS.low;
};

export default function MapView({ points = [], requests = [], vehicles = [], routes = [], onMapClick, selectedId, height = '100%', showHeat = false, showClusters = false, children }) {
  return (
    <MapContainer 
      center={[region.center.lat, region.center.lng]} 
      zoom={region.zoom} 
      style={{ height, width: '100%', zIndex: 1 }}
      attributionControl={false}
    >
      <TileLayer 
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
        attribution="&copy; OpenStreetMap" 
      />
      <MapBoundsGuard />
      <DataFitter points={points} requests={requests} vehicles={vehicles} />
      <ClickHandler onMapClick={onMapClick} />
      
      {points.map(p => (
        <CircleMarker 
          key={`pt-${p.id}`} 
          center={[p.lat, p.lng]} 
          radius={p.fill_level > 80 ? 12 : 8}
          pathOptions={{
            color: getFillColor(p.fill_level),
            fillColor: getFillColor(p.fill_level),
            fillOpacity: 0.8,
            weight: selectedId === p.id ? 4 : 2,
            color: selectedId === p.id ? '#000' : getFillColor(p.fill_level)
          }}
        >
          <Popup>
            <strong>{p.name}</strong><br/>
            Fill: {p.fill_level}%
          </Popup>
        </CircleMarker>
      ))}

      {requests.map(r => (
        <CircleMarker 
          key={`rq-${r.id}`} 
          center={[r.lat, r.lng]} 
          radius={6}
          pathOptions={{
            color: '#3B82F6',
            fillColor: '#60A5FA',
            fillOpacity: 0.9,
            weight: 2
          }}
        >
          <Popup>Request: {r.status}</Popup>
        </CircleMarker>
      ))}

      {vehicles.map(v => (
        <Marker key={`vh-${v.id}`} position={[v.lat || region.depot.lat, v.lng || region.depot.lng]}>
          <Popup>Vehicle: {v.plate_number}</Popup>
        </Marker>
      ))}

      {routes && routes.map((rt, i) => (
        <Polyline key={`rt-${i}`} positions={rt.positions} pathOptions={{ color: '#0F3D2E', weight: 4, dashArray: '10, 10' }} />
      ))}

      {children}
    </MapContainer>
  );
}
