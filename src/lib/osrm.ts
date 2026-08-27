import { fieldOpsConfig } from './fieldOpsConfig';

export interface OsrmRoute {
  distanceMeters: number;
  durationSeconds: number;
  polylineCoords: [number, number][]; // [[lat, lng], ...] formatted for Leaflet
}

/**
 * Fetches a road-following driving route and ETA between two coordinates using OSRM.
 * Note: OSRM public demo endpoint is strictly for PoC use. Self-host before production.
 */
export async function fetchRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<OsrmRoute | null> {
  try {
    const endpoint = fieldOpsConfig.osrmEndpoint.replace(/\/+$/, '');
    const url = `${endpoint}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`OSRM routing request failed with status ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      return null;
    }

    const primaryRoute = data.routes[0];
    const coordinates: [number, number][] = (primaryRoute.geometry?.coordinates || []).map(
      (coord: [number, number]) => [coord[1], coord[0]] as [number, number] // [lng, lat] -> [lat, lng]
    );

    return {
      distanceMeters: primaryRoute.distance || 0,
      durationSeconds: primaryRoute.duration || 0,
      polylineCoords: coordinates
    };
  } catch (err) {
    console.warn('Could not fetch OSRM route:', err);
    return null;
  }
}
