// Helper for calling OpenStates /people.geo and related endpoints.
// This module supports using a server-side proxy (configured via `frontend/.env` and VITE_USE_SERVER_PROXY)
// or calling the OpenStates v3 API directly from the browser if you set VITE_OPENSTATES_API_KEY.
import { API_BASE_URL } from './config';

const useBase = Boolean(API_BASE_URL);

async function doFetch(url, options = {}, errorLabel = 'OpenStates API error') {
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

export async function getBillsByJurisdiction(jurisdiction, created_since, sort = 'updated_desc', per_page = 10) {
  // Decide whether to call a server-side proxy (preferred for deployed apps)
  // If API_BASE_URL is set at build time we should use it. In dev the Vite proxy
  // can be enabled via VITE_USE_SERVER_PROXY=true which makes `/api/...` work.
  const useProxy = Boolean(useBase) || import.meta.env.VITE_USE_SERVER_PROXY === 'true';
  if (useProxy) {
    // If useBase (API_BASE_URL) is provided it includes the /api prefix (see config),
    // otherwise call the relative `/api` path which Vite will proxy in dev.
    const base = useBase ? API_BASE_URL : '';
    const url = `${base}/bills?jurisdiction=${encodeURIComponent(jurisdiction)}&created_since=${encodeURIComponent(created_since)}&sort=${encodeURIComponent(sort)}&per_page=${encodeURIComponent(per_page)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Proxy error ${res.status}: ${txt}`);
    }
    const data = await res.json();
    // Return the full response (object or array). The frontend will handle results vs totals.
    return data;
  }

  const key = import.meta.env.VITE_OPENSTATES_API_KEY;
  if (!key) throw new Error('Missing OpenStates API key for direct call');
  const includeParams = ['other_titles', 'other_identifiers', 'sources', 'votes']
    .map((i) => `include=${encodeURIComponent(i)}`)
    .join('&');
  const url = `https://v3.openstates.org/bills?jurisdiction=${encodeURIComponent(jurisdiction)}&created_since=${encodeURIComponent(created_since)}&sort=${encodeURIComponent(sort)}&${includeParams}&page=1&per_page=${encodeURIComponent(per_page)}`;
  const resp = await fetch(url, { headers: { 'X-API-KEY': key } });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`OpenStates API error ${resp.status}: ${txt}`);
  }
  const d = await resp.json();
  const items = d.results ?? d ?? [];
  return Array.isArray(items) ? items.slice(0, per_page) : items;
}

