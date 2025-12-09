// Simple ZIP -> lat/lon lookup using the free Zippopotam.us API
// Returns an object: { lat, lon, places, country, postcode }
export async function geocodeZip(zip) {
  const z = String(zip).trim();
  if (!/^\d{5}$/.test(z)) {
    throw new Error('ZIP must be 5 digits');
  }

  const res = await fetch(`https://api.zippopotam.us/us/${z}`);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`ZIP lookup failed ${res.status}: ${txt}`);
  }

  const data = await res.json();
  const places = data.places || [];
  if (places.length === 0) throw new Error('No places found for ZIP');

  const coords = places.map((p) => ({ lat: parseFloat(p.latitude), lon: parseFloat(p.longitude) }));
  const avgLat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
  const avgLon = coords.reduce((s, c) => s + c.lon, 0) / coords.length;

  return {
    lat: avgLat,
    lon: avgLon,
    places,
    country: data.country,
    postcode: data['post code'] || data['post code'] || data.postcode || z,
    // expose the first place's city and state (full name and abbreviation) for convenience
    city: places[0]?.['place name'] ?? null,
    state: places[0]?.['state'] ?? null, // full state name, e.g. "Florida"
    stateAbbr: places[0]?.['state abbreviation'] ?? null,
  };
}

export default geocodeZip;
