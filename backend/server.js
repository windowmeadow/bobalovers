// server.js
const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;

/**
 * 1. API routes FIRST
 *    These should respond and then stop; they must come before static/catch-all.
 */
// Enable CORS for all origins (adjust options for stricter policies)
app.use(cors());
app.use(express.json());

// Proxy endpoint to call OpenStates securely from the server (avoids exposing API key to the browser)
app.get('/api/people.geo', async (req, res) => {
  try {
    // Accept either `lon` or `lng` (or `long`) from callers, but OpenStates expects `lng`.
    const { lat } = req.query;
    const lng = req.query.lon ?? req.query.lng ?? req.query.long;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lon/lng query params required' });

    const key = process.env.OPENSTATES_API_KEY;
    if (!key) return res.status(500).json({ error: 'Server missing OPENSTATES_API_KEY' });

    // OpenStates expects the parameter name `lng` for longitude
    const url = `https://v3.openstates.org/people.geo?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;

    // Node 18+ has fetch built-in. This will forward the OpenStates response as JSON.
    const resp = await fetch(url, {
      headers: {
        'X-API-KEY': key,
      },
    });

    const data = await resp.text();
    // Try to parse JSON, otherwise return text
    try {
      const json = JSON.parse(data);
      res.status(resp.status).json(json);
    } catch (e) {
      res.status(resp.status).send(data);
    }
  } catch (err) {
    console.error('OpenStates proxy error', err);
    res.status(500).json({ error: String(err) });
  }
});

// Proxy endpoint to fetch events near a lat/lng (returns OpenStates events)
app.get('/api/events.geo', async (req, res) => {
  try {
    const { lat } = req.query;
    const lng = req.query.lon ?? req.query.lng ?? req.query.long;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lon/lng query params required' });

    const key = process.env.OPENSTATES_API_KEY;
    if (!key) return res.status(500).json({ error: 'Server missing OPENSTATES_API_KEY' });

    // Forward to OpenStates events.geo endpoint
    const url = `https://v3.openstates.org/events.geo?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;
    const resp = await fetch(url, {
      headers: {
        'X-API-KEY': key,
      },
    });

    const data = await resp.text();
    try {
      const json = JSON.parse(data);
      res.status(resp.status).json(json);
    } catch (e) {
      res.status(resp.status).send(data);
    }
  } catch (err) {
    console.error('OpenStates events proxy error', err);
    res.status(500).json({ error: String(err) });
  }
});

// More flexible events endpoint: accepts `zip` OR `lat`+`lon`/`lng`.
// Tries events.geo by location first; if that doesn't return useful results,
// falls back to looking up a jurisdiction and calling /events?jurisdiction=...
app.get('/api/events', async (req, res) => {
  try {
    let { lat, zip, jurisdiction } = req.query;
    const lng = req.query.lon ?? req.query.lng ?? req.query.long;

    // If a jurisdiction param is provided, call the events endpoint directly with it
    if (jurisdiction) {
      const key = process.env.OPENSTATES_API_KEY;
      if (!key) return res.status(500).json({ error: 'Server missing OPENSTATES_API_KEY' });
      const eventsUrl = `https://v3.openstates.org/events?jurisdiction=${encodeURIComponent(jurisdiction)}&deleted=false&require_bills=false&page=1&per_page=5`;
      const resp = await fetch(eventsUrl, { headers: { 'X-API-KEY': key } });
      const eventsTxt = await resp.text();
      try {
        const eventsJson = JSON.parse(eventsTxt);
        const items = eventsJson.results ?? eventsJson ?? [];
        return res.status(resp.status).json(items.slice(0, 5));
      } catch (e) {
        return res.status(resp.status).send(eventsTxt);
      }
    }

    // If ZIP provided, resolve to lat/lng using Zippopotam.us
    if (!lat && zip) {
      const zp = await fetch(`https://api.zippopotam.us/us/${encodeURIComponent(zip)}`);
      if (!zp.ok) return res.status(400).json({ error: `ZIP lookup failed ${zp.status}` });
      const zd = await zp.json();
      const places = zd.places || [];
      if (places.length === 0) return res.status(400).json({ error: 'No places for ZIP' });
      const coords = places.map((p) => ({ lat: parseFloat(p.latitude), lon: parseFloat(p.longitude) }));
      lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
      // pick average lon
      var _lng = coords.reduce((s, c) => s + c.lon, 0) / coords.length;
      // store into variable used below
      req.query._resolved_lng = _lng;
    }

    const lngFinal = req.query._resolved_lng ?? (req.query.lon ?? req.query.lng ?? req.query.long);
    if (!lat || !lngFinal) return res.status(400).json({ error: 'lat and lon/lng query params required (or provide zip)' });

    const key = process.env.OPENSTATES_API_KEY;
    if (!key) return res.status(500).json({ error: 'Server missing OPENSTATES_API_KEY' });

    // First try events.geo by point (some OpenStates installs may support it)
    const eventsGeoUrl = `https://v3.openstates.org/events.geo?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lngFinal)}`;
    let resp = await fetch(eventsGeoUrl, { headers: { 'X-API-KEY': key } });
    if (resp.ok) {
      const txt = await resp.text();
      try {
        const json = JSON.parse(txt);
        // if non-empty array or results, return it
        const items = json.results ?? json ?? [];
        if (Array.isArray(items) && items.length > 0) return res.status(200).json(items.slice(0, 5));
      } catch (e) {
        // fall through to jurisdiction path
      }
    }

    // Fallback: find jurisdiction for the point and call /events?jurisdiction=...
    // Try a jurisdictions lookup by point
    const jurisUrl = `https://v3.openstates.org/jurisdictions?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lngFinal)}`;
    resp = await fetch(jurisUrl, { headers: { 'X-API-KEY': key } });
    if (!resp.ok) return res.status(502).json({ error: `Jurisdiction lookup failed ${resp.status}` });
    const jurisData = await resp.json();
    const jurisList = jurisData.results ?? jurisData ?? [];
    if (!Array.isArray(jurisList) || jurisList.length === 0) return res.status(404).json({ error: 'No jurisdiction found for location' });

    // Try to find an id or jurisdiction identifier
    const first = jurisList[0];
    const jurisdictionId = first.id ?? first.jurisdiction ?? first.data?.jurisdiction ?? null;
    if (!jurisdictionId) return res.status(500).json({ error: 'Could not determine jurisdiction id from lookup' });

    // Now fetch events for that jurisdiction
    const eventsUrl = `https://v3.openstates.org/events?jurisdiction=${encodeURIComponent(jurisdictionId)}&deleted=false&require_bills=false&page=1&per_page=5`;
    resp = await fetch(eventsUrl, { headers: { 'X-API-KEY': key } });
    const eventsTxt = await resp.text();
    try {
      const eventsJson = JSON.parse(eventsTxt);
      const items = eventsJson.results ?? eventsJson ?? [];
      return res.status(resp.status).json(items.slice(0, 5));
    } catch (e) {
      return res.status(resp.status).send(eventsTxt);
    }
  } catch (err) {
    console.error('OpenStates events (flex) proxy error', err);
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from API' });
});

// Add your other /api/... routes here

/**
 * 2. Serve static React build
 *    This serves JS/CSS/assets from the build folder.
 */
const buildPath = 'dist';
app.use(express.static(buildPath));

/**
 * 3. Catch-all for SPA routes
 *    Anything not handled above gets index.html for client-side routing.
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

/**
 * 4. Start server
 */
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;