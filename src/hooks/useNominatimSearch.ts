import { useState, useEffect, useRef } from 'react';
import { fieldOpsConfig } from '../lib/fieldOpsConfig';

export interface NominatimPlace {
  placeId: number;
  displayName: string;
  name: string;
  suburbOrDistrict?: string;
  cityOrState?: string;
  lat: number;
  lng: number;
}

export async function searchNominatimDirect(query: string): Promise<NominatimPlace | null> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return null;

  try {
    const countryCodes = fieldOpsConfig.nominatimCountryCodes;
    const endpoint = fieldOpsConfig.nominatimEndpoint.replace(/\/+$/, '');
    const url = `${endpoint}/search?q=${encodeURIComponent(
      trimmed
    )}&format=json&addressdetails=1&limit=1${
      countryCodes ? `&countrycodes=${encodeURIComponent(countryCodes)}` : ''
    }`;

    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en'
      }
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.length === 0) return null;

    const item = data[0];
    const addr = item.address || {};
    const suburbOrDistrict =
      addr.suburb ||
      addr.neighbourhood ||
      addr.residential ||
      addr.commercial ||
      addr.county ||
      addr.district;
    const cityOrState =
      addr.city || addr.town || addr.village || addr.state || addr.country;

    return {
      placeId: item.place_id,
      displayName: item.display_name,
      name: item.name || item.display_name.split(',')[0],
      suburbOrDistrict,
      cityOrState,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon)
    };
  } catch (err) {
    console.error('Direct Nominatim search error:', err);
    return null;
  }
}

export function useNominatimSearch(query: string) {
  const [suggestions, setSuggestions] = useState<NominatimPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const countryCodes = fieldOpsConfig.nominatimCountryCodes;
        const endpoint = fieldOpsConfig.nominatimEndpoint.replace(/\/+$/, '');
        const url = `${endpoint}/search?q=${encodeURIComponent(
          trimmed
        )}&format=json&addressdetails=1&limit=5${
          countryCodes ? `&countrycodes=${encodeURIComponent(countryCodes)}` : ''
        }`;

        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept-Language': 'en'
          }
        });

        if (!res.ok) {
          throw new Error(`Nominatim request failed: ${res.status}`);
        }

        const data = await res.json();

        const formatted: NominatimPlace[] = (data || []).map((item: any) => {
          const addr = item.address || {};
          const suburbOrDistrict =
            addr.suburb ||
            addr.neighbourhood ||
            addr.residential ||
            addr.commercial ||
            addr.county ||
            addr.district;
          const cityOrState =
            addr.city || addr.town || addr.village || addr.state || addr.country;

          return {
            placeId: item.place_id,
            displayName: item.display_name,
            name: item.name || item.display_name.split(',')[0],
            suburbOrDistrict,
            cityOrState,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          };
        });

        setSuggestions(formatted);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Nominatim search error:', err);
          setError(err.message || 'Failed to search address');
        }
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { suggestions, loading, error, clearSuggestions: () => setSuggestions([]) };
}
