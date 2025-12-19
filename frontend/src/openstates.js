// Helper for calling OpenStates /people.geo
// Uses Vite env var VITE_OPENSTATES_API_KEY in frontend/.env
import { API_BASE_URL } from './config';

const useBase = Boolean(API_BASE_URL);

async function doFetch(url, options, errorLabel) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${errorLabel} ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function getPeopleByLatLng(lat, lon) {
  const url = useBase
    ? `${API_BASE_URL}/people.geo?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
    : `https://v3.openstates.org/people.geo?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;

  const options = useBase
    ? {}
    : {
        headers: {
          'X-API-KEY': import.meta.env.VITE_OPENSTATES_API_KEY,
        },
      };

  if (!useBase && !options.headers['X-API-KEY']) {
    throw new Error(
      'Missing OpenStates API key. Create `frontend/.env` from `.env.example` with VITE_OPENSTATES_API_KEY or enable server proxy.'
    );
  }

  return doFetch(url, options, useBase ? 'Proxy error' : 'OpenStates API error');
}

export default getPeopleByLatLng;

export async function getEventsByLatLng(lat, lon, limit = 10) {
  const url = useBase
    ? `${API_BASE_URL}/events?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
    : `https://v3.openstates.org/events.geo?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;

  const options = useBase
    ? {}
    : {
        headers: {
          'X-API-KEY': import.meta.env.VITE_OPENSTATES_API_KEY,
        },
      };

  if (!useBase && !options.headers['X-API-KEY']) {
    throw new Error('Missing OpenStates API key. Create `frontend/.env` with VITE_OPENSTATES_API_KEY or enable server proxy.');
  }

  const data = await doFetch(url, options, useBase ? 'Proxy error' : 'OpenStates API error');
  const items = data.results ?? data ?? [];
  return Array.isArray(items) ? items.slice(0, limit) : items;
}

export async function getEventsByZip(zip, limit = 5) {
  // If a base URL is provided, let the backend handle the lookup in a single call.
  if (useBase) {
    const data = await doFetch(
      `${API_BASE_URL}/events?jurisdiction=${encodeURIComponent(zip)}`,
      {},
      'Proxy error'
    );
    return Array.isArray(data) ? data.slice(0, limit) : data;
  }

  // If not using base/proxy, resolve zip to lat/lon client-side then call OpenStates directly.
  const geo = await doFetch(
    `https://api.zippopotam.us/us/${encodeURIComponent(zip)}`,
    {},
    'ZIP lookup failed'
  );
  const places = geo.places || [];
  if (places.length === 0) return [];
  const coords = places.map((p) => ({ lat: parseFloat(p.latitude), lon: parseFloat(p.longitude) }));
  const avgLat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
  const avgLon = coords.reduce((s, c) => s + c.lon, 0) / coords.length;

  if (!import.meta.env.VITE_OPENSTATES_API_KEY) {
    throw new Error('Missing OpenStates API key for direct call');
  }

  const data2 = await doFetch(
    `https://v3.openstates.org/events.geo?lat=${encodeURIComponent(avgLat)}&lon=${encodeURIComponent(avgLon)}`,
    { headers: { 'X-API-KEY': import.meta.env.VITE_OPENSTATES_API_KEY } },
    'OpenStates API error'
  );
  const items = data2.results ?? data2 ?? [];
  return Array.isArray(items) ? items.slice(0, limit) : items;
}

export async function getEventsByJurisdiction(jurisdiction, limit = 5) {
  const url = useBase
    ? `${API_BASE_URL}/events?jurisdiction=${encodeURIComponent(jurisdiction)}`
    : `https://v3.openstates.org/events?jurisdiction=${encodeURIComponent(jurisdiction)}&deleted=false&require_bills=false&page=1&per_page=${limit}`;

  const options = useBase
    ? {}
    : {
        headers: {
          'X-API-KEY': import.meta.env.VITE_OPENSTATES_API_KEY,
        },
      };

  if (!useBase && !options.headers['X-API-KEY']) {
    throw new Error('Missing OpenStates API key for direct call');
  }

  const data = await doFetch(url, options, useBase ? 'Proxy error' : 'OpenStates API error');
  const items = data.results ?? data ?? [];
  return Array.isArray(items) ? items.slice(0, limit) : items;
}

