import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { FieldVisit, FieldVisitPin, PinCategory } from '../../types';
import { fieldOpsConfig } from '../../lib/fieldOpsConfig';
import { createDirectionalIcon } from './DirectionalMarker';
import { createVisitPinIcon } from './VisitPinIcon';
import { useLiveTracking } from '../../contexts/LiveTrackingContext';
import { fetchRoute, OsrmRoute } from '../../lib/osrm';
import { DropPinModal } from './DropPinModal';
import {
  ArrowLeft,
  Navigation2,
  Clock,
  Gauge,
  MapPin,
  CheckCircle2,
  Compass,
  Radio,
  Milestone
} from 'lucide-react';

const destinationIcon = L.divIcon({
  className: 'destination-nav-icon',
  html: `
    <div style="
      background-color: #0f172a;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid #ffffff;
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 10px;
      font-weight: 900;
    ">🏁</div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Map Controller Subcomponent to handle smooth camera auto-centering on moving agent
function AutoFollowMap({ center, autoFollow }: { center: [number, number]; autoFollow: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (autoFollow && center && center[0] && center[1]) {
      map.panTo(center, { animate: true, duration: 0.8 });
    }
  }, [center, autoFollow, map]);
  return null;
}

interface AgentNavigationViewProps {
  visit: FieldVisit;
  onClose: () => void;
  onArrived: () => Promise<void>;
  onSavePin: (category: PinCategory | string, label?: string, note?: string) => Promise<boolean>;
  pins?: FieldVisitPin[];
}

export const AgentNavigationView: React.FC<AgentNavigationViewProps> = ({
  visit,
  onClose,
  onArrived,
  onSavePin,
  pins = []
}) => {
  const { lastPosition, heading, speedKmh, currentTrail, isPublishing } = useLiveTracking();

  const [route, setRoute] = useState<OsrmRoute | null>(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const [showDropPinModal, setShowDropPinModal] = useState(false);
  const [arriving, setArriving] = useState(false);

  const agentLat = lastPosition?.lat ?? visit.actualLatitude ?? visit.assignedLatitude ?? fieldOpsConfig.defaultCenter[0];
  const agentLng = lastPosition?.lng ?? visit.actualLongitude ?? visit.assignedLongitude ?? fieldOpsConfig.defaultCenter[1];

  const destLat = visit.assignedLatitude;
  const destLng = visit.assignedLongitude;

  // Fetch / update OSRM road route from current position to destination
  useEffect(() => {
    const getNavRoute = async () => {
      if (agentLat && agentLng && destLat && destLng) {
        const fetched = await fetchRoute(agentLat, agentLng, destLat, destLng);
        if (fetched) {
          setRoute(fetched);
        }
      }
    };

    getNavRoute();
    const interval = setInterval(getNavRoute, 15000);
    return () => clearInterval(interval);
  }, [agentLat, agentLng, destLat, destLng]);

  // Compute total traveled distance from breadcrumb trail points
  const calculateTotalTraveledKm = (trail: [number, number][]): number => {
    if (trail.length < 2) return 0;
    let totalMeters = 0;
    const R = 6371e3;
    for (let i = 1; i < trail.length; i++) {
      const p1 = trail[i - 1];
      const p2 = trail[i];
      const φ1 = (p1[0] * Math.PI) / 180;
      const φ2 = (p2[0] * Math.PI) / 180;
      const Δφ = ((p2[0] - p1[0]) * Math.PI) / 180;
      const Δλ = ((p2[1] - p1[1]) * Math.PI) / 180;
      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalMeters += R * c;
    }
    return Math.round((totalMeters / 1000) * 10) / 10;
  };

  const totalTraveledKm = calculateTotalTraveledKm(currentTrail);

  const formatDistance = (meters?: number) => {
    if (meters === undefined || isNaN(meters)) return '–';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (seconds?: number) => {
    if (seconds === undefined || isNaN(seconds)) return '–';
    const minutes = Math.round(seconds / 60);
    if (minutes < 1) return '< 1 min';
    if (minutes >= 60) {
      const hrs = Math.floor(minutes / 60);
      const remainingMins = minutes % 60;
      return `${hrs}h ${remainingMins}m`;
    }
    return `${minutes} mins`;
  };

  const handleArriveClick = async () => {
    setArriving(true);
    await onArrived();
    setArriving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col font-sans select-none animate-fade-in text-white">
      {/* 1. Navigation Top Header HUD */}
      <div className="bg-slate-900/90 backdrop-blur-md px-4 py-3.5 border-b border-slate-800 flex items-center justify-between z-20 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-800/90 hover:bg-slate-700 flex items-center justify-center text-slate-200 transition-colors cursor-pointer border border-slate-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                LIVE NAVIGATION
              </span>
            </div>
            <h2 className="text-sm font-bold text-slate-100 truncate max-w-[200px] sm:max-w-md">
              {visit.title}
            </h2>
          </div>
        </div>

        {/* Re-center / Auto Follow Toggle */}
        <button
          onClick={() => setAutoFollow(prev => !prev)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            autoFollow
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
        >
          <Compass className={`w-3.5 h-3.5 ${autoFollow ? 'animate-spin' : ''}`} />
          <span>{autoFollow ? 'Auto-Following' : 'Re-center'}</span>
        </button>
      </div>

      {/* 2. Main Full-Screen Map */}
      <div className="flex-1 relative w-full h-full overflow-hidden">
        <MapContainer
          center={[agentLat, agentLng]}
          zoom={16}
          zoomControl={false}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution={fieldOpsConfig.tileAttribution}
            url={fieldOpsConfig.tileUrl}
            subdomains={fieldOpsConfig.tileSubdomains}
          />

          <AutoFollowMap center={[agentLat, agentLng]} autoFollow={autoFollow} />

          {/* Planned Road Route (Blue) */}
          {route?.polylineCoords && route.polylineCoords.length > 0 && (
            <>
              <Polyline
                positions={route.polylineCoords}
                pathOptions={{
                  color: '#0f172a',
                  weight: 7,
                  opacity: 0.35,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
              <Polyline
                positions={route.polylineCoords}
                pathOptions={{
                  color: '#0284c7', // Sky-600 Blue
                  weight: 5,
                  opacity: 0.95,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
            </>
          )}

          {/* Traveled Breadcrumb Trail (Teal Dashed) */}
          {currentTrail.length > 1 && (
            <Polyline
              positions={currentTrail}
              pathOptions={{
                color: '#14b8a6', // Teal
                weight: 4,
                opacity: 0.9,
                dashArray: '6 6',
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
          )}

          {/* Destination Pin */}
          {destLat && destLng && (
            <Marker position={[destLat, destLng]} icon={destinationIcon}>
              <Popup>
                <div className="text-xs text-slate-900 font-bold p-1">
                  Destination: {visit.assignedAddress || visit.title}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Custom Dropped Pins */}
          {pins.map(pin => (
            <Marker
              key={pin.id}
              position={[pin.latitude, pin.longitude]}
              icon={createVisitPinIcon(pin.category, pin.label)}
            >
              <Popup>
                <div className="text-xs text-slate-900 p-1">
                  <strong className="block text-purple-700">{pin.category}</strong>
                  <span className="block font-medium">{pin.label}</span>
                  {pin.note && <p className="text-[10px] text-slate-500 mt-1">{pin.note}</p>}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Current Agent Position Puck */}
          <Marker
            position={[agentLat, agentLng]}
            icon={createDirectionalIcon(visit.status, heading, visit.locationException)}
          />
        </MapContainer>

        {/* Speedometer Floating Badge */}
        <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-2 z-[1000]">
          <Gauge className="w-4 h-4 text-amber-400" />
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-white">{speedKmh}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase">km/h</span>
          </div>
        </div>
      </div>

      {/* 3. Bottom Glassmorphic Navigation HUD */}
      <div className="bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/80 p-4 sm:p-6 space-y-4 z-20 shadow-2xl">
        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
          {/* Distance Remaining */}
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              <Navigation2 className="w-3 h-3 text-sky-400" /> Distance
            </div>
            <div className="text-base sm:text-lg font-black text-white">
              {route ? formatDistance(route.distanceMeters) : '–'}
            </div>
          </div>

          {/* Estimated Travel Time */}
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              <Clock className="w-3 h-3 text-teal-400" /> Est. Time
            </div>
            <div className="text-base sm:text-lg font-black text-teal-300">
              {route ? formatDuration(route.durationSeconds) : '–'}
            </div>
          </div>

          {/* Traveled Distance */}
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              <Milestone className="w-3 h-3 text-purple-400" /> Traveled
            </div>
            <div className="text-base sm:text-lg font-black text-purple-300">
              {totalTraveledKm} km
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex gap-3">
          {/* Drop Pin Button */}
          <button
            onClick={() => setShowDropPinModal(true)}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600/30 text-purple-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-900/20"
          >
            <MapPin className="w-4 h-4 text-purple-400" /> Drop Location Pin
          </button>

          {/* Mark Arrived Button */}
          <button
            onClick={handleArriveClick}
            disabled={arriving}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/30 cursor-pointer disabled:opacity-50"
          >
            {arriving ? (
              'Updating...'
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> I Have Arrived
              </>
            )}
          </button>
        </div>
      </div>

      {/* Drop Pin Dialog Modal */}
      {showDropPinModal && (
        <DropPinModal
          currentLat={agentLat}
          currentLng={agentLng}
          visitTitle={visit.title}
          onClose={() => setShowDropPinModal(false)}
          onSavePin={async (category, label, note) => {
            const success = await onSavePin(category, label, note);
            return success;
          }}
        />
      )}
    </div>
  );
};
