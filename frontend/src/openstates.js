// Helper for calling OpenStates /people.geo
// Uses Vite env var VITE_OPENSTATES_API_KEY in frontend/.env

export async function getPeopleByLatLng(lat, lon) {
  // If you want to call the OpenStates API from the browser directly, set your
  // Vite env var VITE_OPENSTATES_API_KEY in frontend/.env (not committed).
  // Alternatively, prefer using a server-side proxy to keep the key secret.
  const useProxy = import.meta.env.VITE_USE_SERVER_PROXY === 'true';

  if (useProxy) {
    const url = `/api/people.geo?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Proxy error ${res.status}: ${txt}`);
    }
    return res.json();
  }

  const key = import.meta.env.VITE_OPENSTATES_API_KEY;
  if (!key) {
    throw new Error(
      'Missing OpenStates API key. Create `frontend/.env` from `.env.example` with VITE_OPENSTATES_API_KEY or enable server proxy.'
    );
  }

  const url = `https://v3.openstates.org/people.geo?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;

  const res = await fetch(url, {
    headers: {
      // OpenStates expects the API key in the X-API-KEY header for v3
      'X-API-KEY': key,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenStates API error ${res.status}: ${text}`);
  }

  return res.json();
}

export default getPeopleByLatLng;

export async function getEventsByLatLng(lat, lon, limit = 20) {
  const useProxy = import.meta.env.VITE_USE_SERVER_PROXY === 'true';

  if (useProxy) {
    const url = `/api/events?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Proxy error ${res.status}: ${txt}`);
    }
    const data = await res.json();
    // Try to return up to `limit` events if the endpoint returned an array or results array
    const items = data.results ?? data ?? [];
    return Array.isArray(items) ? items.slice(0, limit) : items;
  }

  const key = import.meta.env.VITE_OPENSTATES_API_KEY;
  if (!key) {
    throw new Error('Missing OpenStates API key. Create `frontend/.env` from `.env.example` with VITE_OPENSTATES_API_KEY or enable server proxy.');
  }

  const url = `https://v3.openstates.org/events.geo?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
  const res = await fetch(url, {
    headers: {
      'X-API-KEY': key,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenStates API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const items = data.results ?? data ?? [];
  return Array.isArray(items) ? items.slice(0, limit) : items;
}

export async function getEventsByZip(zip, limit = 5) {
  const useProxy = import.meta.env.VITE_USE_SERVER_PROXY === 'true';
  if (useProxy) {
    // call backend using the provided value as `jurisdiction` as requested
    const url = `/api/events?jurisdiction=${encodeURIComponent(zip)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Proxy error ${res.status}: ${txt}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data.slice(0, limit) : data;
  }

  // If not using proxy, resolve zip to lat/lon client-side and call events endpoint directly
  const geoRes = await fetch(`https://api.zippopotam.us/us/${encodeURIComponent(zip)}`);
  if (!geoRes.ok) throw new Error(`ZIP lookup failed ${geoRes.status}`);
  const geo = await geoRes.json();
  const places = geo.places || [];
  if (places.length === 0) return [];
  const coords = places.map((p) => ({ lat: parseFloat(p.latitude), lon: parseFloat(p.longitude) }));
  const avgLat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
  const avgLon = coords.reduce((s, c) => s + c.lon, 0) / coords.length;

  const key = import.meta.env.VITE_OPENSTATES_API_KEY;
  if (!key) throw new Error('Missing OpenStates API key for direct call');
  const url = `https://v3.openstates.org/events.geo?lat=${encodeURIComponent(avgLat)}&lon=${encodeURIComponent(avgLon)}`;
  const res2 = await fetch(url, { headers: { 'X-API-KEY': key } });
  if (!res2.ok) {
    const txt = await res2.text();
    throw new Error(`OpenStates API error ${res2.status}: ${txt}`);
  }
  const data2 = await res2.json();
  const items = data2.results ?? data2 ?? [];
  return Array.isArray(items) ? items.slice(0, limit) : items;
}

export async function getEventsByJurisdiction(jurisdiction, limit = 5) {
  const useProxy = import.meta.env.VITE_USE_SERVER_PROXY === 'true';
  if (useProxy) {
    const url = `/api/events?jurisdiction=${encodeURIComponent(jurisdiction)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Proxy error ${res.status}: ${txt}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data.slice(0, limit) : data;
  }

  // Direct call to OpenStates /events with jurisdiction
  const key = import.meta.env.VITE_OPENSTATES_API_KEY;
  if (!key) throw new Error('Missing OpenStates API key for direct call');
  const url = `https://v3.openstates.org/events?jurisdiction=${encodeURIComponent(jurisdiction)}&deleted=false&require_bills=false&page=1&per_page=${limit}`;
  const res = await fetch(url, { headers: { 'X-API-KEY': key } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenStates API error ${res.status}: ${txt}`);
  }
  const data = await res.json();
  const items = data.results ?? data ?? [];
  return Array.isArray(items) ? items.slice(0, limit) : items;
}

export async function getBillsByJurisdiction(jurisdiction, created_since, sort = 'updated_desc', per_page = 10) {
  const useProxy = import.meta.env.VITE_USE_SERVER_PROXY === 'true';
  if (useProxy) {
    const url = `/api/bills?jurisdiction=${encodeURIComponent(jurisdiction)}&created_since=${encodeURIComponent(created_since)}&sort=${encodeURIComponent(sort)}&per_page=${encodeURIComponent(per_page)}`;
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

