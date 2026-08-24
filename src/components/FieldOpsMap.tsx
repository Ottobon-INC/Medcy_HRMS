import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { FieldVisit, Employee } from '../types';

// Default Marker Icon Fix
// @ts-ignore
import icon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
// @ts-ignore
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconRetinaUrl: iconRetina,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom colored icons for different statuses
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const assignedIcon = createCustomIcon('#3b82f6'); // Blue
const enRouteIcon = createCustomIcon('#f59e0b'); // Amber
const arrivedIcon = createCustomIcon('#10b981'); // Emerald
const exceptionIcon = createCustomIcon('#ef4444'); // Red

interface FieldOpsMapProps {
  visits: FieldVisit[];
  employees: Employee[];
}

export default function FieldOpsMap({ visits, employees }: FieldOpsMapProps) {
  // Find a valid center for the map based on the first visit with coordinates, or default to a fixed location (e.g., Visakhapatnam)
  const defaultCenter: [number, number] = [17.6868, 83.2185];
  
  const visitWithCoords = visits.find(v => (v.actualLatitude && v.actualLongitude) || (v.assignedLatitude && v.assignedLongitude));
  const mapCenter: [number, number] = visitWithCoords 
    ? [(visitWithCoords.actualLatitude || visitWithCoords.assignedLatitude)!, (visitWithCoords.actualLongitude || visitWithCoords.assignedLongitude)!] 
    : defaultCenter;

  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || id;

  const getIconForStatus = (visit: FieldVisit) => {
    if (visit.locationException) return exceptionIcon;
    if (visit.status === 'ARRIVED' || visit.status === 'COMPLETED' || visit.status === 'IN_PROGRESS') return arrivedIcon;
    if (visit.status === 'EN_ROUTE') return enRouteIcon;
    return assignedIcon;
  };

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-200 z-0 relative shadow-inner">
      <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {visits.map(visit => {
          // Prefer actual coordinates if arrived, otherwise fallback to assigned if available
          const lat = visit.actualLatitude || visit.assignedLatitude;
          const lng = visit.actualLongitude || visit.assignedLongitude;
          
          if (!lat || !lng) return null;

          return (
            <Marker 
              key={visit.id} 
              position={[lat, lng]} 
              icon={getIconForStatus(visit)}
            >
              <Popup>
                <div className="text-xs p-1">
                  <strong className="block text-sm text-slate-800 mb-1">{getEmployeeName(visit.employeeId)}</strong>
                  <span className="block text-slate-600 mb-2">{visit.title}</span>
                  
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-[10px] uppercase text-slate-400">Status</span>
                    <span className="font-bold text-teal-600">{visit.status}</span>
                  </div>
                  
                  {visit.locationException && (
                    <div className="mt-2 text-rose-600 font-bold bg-rose-50 p-1 rounded">
                      Exception Flagged
                    </div>
                  )}
                  
                  {visit.actualAddress && (
                    <div className="mt-2 text-[10px] text-slate-500 line-clamp-2">
                      {visit.actualAddress}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur p-3 rounded-xl shadow-lg border border-slate-200 z-[1000] text-[10px] font-bold uppercase tracking-wider space-y-2">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Assigned</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div> En Route</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Arrived / Completed</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> Exception</div>
      </div>
    </div>
  );
}
