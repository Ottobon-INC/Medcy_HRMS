import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { FieldVisit, Employee, FieldVisitPin } from '../types';
import { fieldOpsConfig } from '../lib/fieldOpsConfig';
import { createDirectionalIcon, getStatusColor } from './fieldops/DirectionalMarker';
import { createVisitPinIcon } from './fieldops/VisitPinIcon';
import { createCheckInMarkerIcon } from './fieldops/CheckInMarkerIcon';
import { LivePositionPayload } from '../hooks/useLiveLocationPublisher';
import { OsrmRoute } from '../lib/osrm';
import { useMarkerInterpolation } from '../hooks/useMarkerInterpolation';
import { EmployeeCheckInLocation } from '../lib/services/attendance-service';

// Default Marker Icon Fix for standard Leaflet pins
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

// Legacy colored icons for non-live mode or static pins
const createLegacyIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const destinationIcon = L.divIcon({
  className: 'destination-flag-icon',
  html: `<div style="background-color: #0f172a; width: 14px; height: 14px; border-radius: 3px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.4);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

interface VisitMarkerProps {
  visit: FieldVisit;
  livePosition?: LivePositionPayload;
  employeeName: string;
  isLiveTrackingEnabled: boolean;
  intervalMs: number;
}

const VisitMarker: React.FC<VisitMarkerProps> = ({
  visit,
  livePosition,
  employeeName,
  isLiveTrackingEnabled,
  intervalMs
}) => {
  const targetPos = (isLiveTrackingEnabled && livePosition)
    ? { lat: livePosition.lat, lng: livePosition.lng }
    : null;

  const interpolatedPos = useMarkerInterpolation(targetPos, intervalMs);

  const lat = interpolatedPos?.lat ?? livePosition?.lat ?? visit.actualLatitude ?? visit.assignedLatitude;
  const lng = interpolatedPos?.lng ?? livePosition?.lng ?? visit.actualLongitude ?? visit.assignedLongitude;
  const heading = livePosition?.heading ?? 0;

  if (!lat || !lng) return null;

  const markerIcon = isLiveTrackingEnabled
    ? createDirectionalIcon(visit.status, heading, visit.locationException)
    : createLegacyIcon(getStatusColor(visit.status, visit.locationException));

  return (
    <Marker position={[lat, lng]} icon={markerIcon}>
      <Popup>
        <div className="text-xs p-1 min-w-[170px]">
          <strong className="block text-sm text-slate-800 mb-1">{employeeName}</strong>
          <span className="block text-slate-600 mb-2 font-medium">{visit.title}</span>

          <div className="flex flex-col gap-1 bg-slate-50 p-2 rounded-lg border border-slate-100 mb-2">
            <span className="font-bold text-[9px] uppercase tracking-wider text-slate-400">Status</span>
            <span className="font-bold text-teal-600 flex items-center gap-1.5">
              {isLiveTrackingEnabled && visit.status === 'EN_ROUTE' && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
              )}
              {visit.status}
            </span>
          </div>

          {isLiveTrackingEnabled && livePosition && (
            <div className="text-[10px] text-slate-500 mb-1 font-mono">
              Live: {lat.toFixed(5)}, {lng.toFixed(5)} ({Math.round(heading)}°)
              {livePosition.speedKmh !== undefined && (
                <span className="block text-slate-700 font-bold mt-0.5">Speed: {livePosition.speedKmh} km/h</span>
              )}
            </div>
          )}

          {visit.locationException && (
            <div className="mt-1 text-rose-600 font-bold bg-rose-50 p-1.5 rounded text-[10px]">
              Exception Flagged
            </div>
          )}

          {(visit.actualAddress || visit.assignedAddress) && (
            <div className="mt-1.5 text-[10px] text-slate-500 line-clamp-2">
              {visit.actualAddress || visit.assignedAddress}
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
};

interface FieldOpsMapProps {
  visits: FieldVisit[];
  employees: Employee[];
  livePositions?: Record<string, LivePositionPayload>;
  routes?: Record<string, OsrmRoute>;
  trails?: Record<string, [number, number][]>;
  pins?: FieldVisitPin[];
  checkIns?: EmployeeCheckInLocation[];
}

export default function FieldOpsMap({
  visits,
  employees,
  livePositions = {},
  routes = {},
  trails = {},
  pins = [],
  checkIns = []
}: FieldOpsMapProps) {
  const isLiveEnabled = fieldOpsConfig.liveTrackingEnabled;

  const getEmployee = (id: string) => employees.find(e => e.id === id);
  const getEmployeeName = (id: string) => getEmployee(id)?.name || id;

  // Find a valid center for the map based on visits, check-ins, or fallback to config defaultCenter
  const visitWithCoords = visits.find(
    v => (livePositions[v.id]?.lat && livePositions[v.id]?.lng) ||
         (v.actualLatitude && v.actualLongitude) ||
         (v.assignedLatitude && v.assignedLongitude)
  );

  const firstCheckIn = checkIns.find(c => c.latitude && c.longitude);

  const mapCenter: [number, number] = visitWithCoords
    ? [
        (livePositions[visitWithCoords.id]?.lat || visitWithCoords.actualLatitude || visitWithCoords.assignedLatitude)!,
        (livePositions[visitWithCoords.id]?.lng || visitWithCoords.actualLongitude || visitWithCoords.assignedLongitude)!
      ]
    : firstCheckIn
    ? [firstCheckIn.latitude, firstCheckIn.longitude]
    : fieldOpsConfig.defaultCenter;

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-200 z-0 relative shadow-inner">
      <MapContainer
        center={mapCenter}
        zoom={fieldOpsConfig.defaultZoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution={fieldOpsConfig.tileAttribution}
          url={fieldOpsConfig.tileUrl}
          subdomains={fieldOpsConfig.tileSubdomains}
        />

        {/* 1. Render Traveled Breadcrumb Trails (Teal Dashed Polyline) */}
        {isLiveEnabled &&
          Object.entries(trails).map(([visitId, trailCoords]) => {
            if (!trailCoords || trailCoords.length < 2) return null;
            return (
              <Polyline
                key={`trail-${visitId}`}
                positions={trailCoords}
                pathOptions={{
                  color: '#14b8a6', // Teal trail line
                  weight: 3.5,
                  opacity: 0.85,
                  dashArray: '6 6',
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
            );
          })}

        {/* 2. Render OSRM Planned Route Polylines for En-Route visits */}
        {isLiveEnabled &&
          visits.map(visit => {
            const route = routes[visit.id];
            if (visit.status !== 'EN_ROUTE' || !route || !route.polylineCoords || route.polylineCoords.length === 0) {
              return null;
            }

            return (
              <React.Fragment key={`route-${visit.id}`}>
                {/* Route casing/shadow for contrast */}
                <Polyline
                  positions={route.polylineCoords}
                  pathOptions={{
                    color: '#0f172a',
                    weight: 6,
                    opacity: 0.25,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                />
                {/* Primary Route Line */}
                <Polyline
                  positions={route.polylineCoords}
                  pathOptions={{
                    color: '#0284c7', // Sky-600 / Bright route blue
                    weight: 4,
                    opacity: 0.9,
                    dashArray: undefined,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                />
                {/* Destination Pin Flag */}
                {visit.assignedLatitude && visit.assignedLongitude && (
                  <Marker
                    position={[visit.assignedLatitude, visit.assignedLongitude]}
                    icon={destinationIcon}
                  >
                    <Popup>
                      <div className="text-xs p-1">
                        <strong className="block text-slate-800">Destination</strong>
                        <span className="text-[10px] text-slate-500">{visit.assignedAddress || visit.title}</span>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </React.Fragment>
            );
          })}

        {/* 3. Render Custom Dropped Pins */}
        {isLiveEnabled &&
          pins.map(pin => (
            <Marker
              key={`pin-${pin.id}`}
              position={[pin.latitude, pin.longitude]}
              icon={createVisitPinIcon(pin.category, pin.label)}
            >
              <Popup>
                <div className="text-xs p-1 min-w-[160px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-bold text-xs text-purple-700">{pin.category}</span>
                  </div>
                  {pin.label && <p className="font-bold text-slate-800 text-sm">{pin.label}</p>}
                  {pin.note && <p className="text-[10px] text-slate-600 mt-1 italic">"{pin.note}"</p>}
                  <div className="mt-2 pt-1 border-t border-slate-100 flex justify-between text-[9px] text-slate-400">
                    <span>By: {getEmployeeName(pin.employeeId)}</span>
                    <span>{new Date(pin.pinnedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* 4. Render Staff Attendance Check-In Locations */}
        {checkIns.map(checkIn => {
          const emp = getEmployee(checkIn.employeeId);
          const isCurrentlyActive = checkIn.checkOutTime === null;

          return (
            <Marker
              key={`checkin-${checkIn.id}`}
              position={[checkIn.latitude, checkIn.longitude]}
              icon={createCheckInMarkerIcon(isCurrentlyActive, emp?.name)}
            >
              <Popup>
                <div className="text-xs p-1 min-w-[180px]">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <strong className="text-sm text-slate-800">{emp?.name || checkIn.employeeId}</strong>
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md ${
                      isCurrentlyActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isCurrentlyActive ? 'On Shift' : 'Clocked Out'}
                    </span>
                  </div>

                  {emp?.designation && (
                    <span className="block text-[10px] text-slate-500 font-medium mb-2">
                      {emp.designation}
                    </span>
                  )}

                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 space-y-1 mb-2">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 font-bold uppercase">Punch In</span>
                      <span className="font-bold text-slate-700">{checkIn.checkInTime}</span>
                    </div>
                    {checkIn.checkOutTime && (
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400 font-bold uppercase">Punch Out</span>
                        <span className="font-bold text-slate-700">{checkIn.checkOutTime}</span>
                      </div>
                    )}
                    {checkIn.punchType && (
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400 font-bold uppercase">Type</span>
                        <span className="font-bold text-slate-600 capitalize">
                          {checkIn.punchType.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {checkIn.locationName && (
                    <p className="text-[10px] text-slate-500 mb-1 line-clamp-2">
                      📍 {checkIn.locationName}
                    </p>
                  )}

                  {checkIn.photoUrl && (
                    <div className="mt-2 pt-1 border-t border-slate-100">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Check-in Photo</span>
                      <img
                        src={checkIn.photoUrl}
                        alt="Check-in proof"
                        className="w-full h-20 object-cover rounded-lg border border-slate-200 shadow-sm"
                      />
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 5. Render Agent Visit Markers */}
        {visits.map(visit => (
          <VisitMarker
            key={visit.id}
            visit={visit}
            livePosition={livePositions[visit.id]}
            employeeName={getEmployeeName(visit.employeeId)}
            isLiveTrackingEnabled={isLiveEnabled}
            intervalMs={fieldOpsConfig.broadcastIntervalMs}
          />
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur p-3 rounded-xl shadow-lg border border-slate-200 z-[1000] text-[10px] font-bold uppercase tracking-wider space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></div> Assigned
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></div> En Route
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></div> Arrived / Completed
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></div> Exception / Failed
        </div>
        {checkIns.length > 0 && (
          <div className="flex items-center gap-2 text-emerald-700">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-300"></div> Staff Check-In
          </div>
        )}
        {isLiveEnabled && (
          <>
            <div className="flex items-center gap-2 pt-1 border-t border-slate-200 text-teal-600">
              <span className="w-3 border-t-2 border-dashed border-teal-500"></span> Traveled Trail
            </div>
            <div className="flex items-center gap-2 text-purple-600">
              <div className="w-2 h-2 rounded-full bg-purple-600"></div> Dropped Pin
            </div>
          </>
        )}
      </div>
    </div>
  );
}
