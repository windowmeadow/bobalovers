import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { getPeopleByLatLng, getEventsByLatLng, getEventsByZip, getEventsByJurisdiction } from "./openstates";
import { geocodeZip } from "./zipLookup";
import flagSvg from "./images/flag-us.svg";

function App() {
  const [lat, setLat] = useState(42.3584);
  const [lon, setLon] = useState(-71.0598);
  const [zip, setZip] = useState("");
  const [zipLoading, setZipLoading] = useState(false);
  const [zipError, setZipError] = useState(null);
  const [city, setCity] = useState(null);
  const [stateName, setStateName] = useState(null);
  const [stateAbbr, setStateAbbr] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Events state
  const [events, setEvents] = useState(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState(null);
  const [eventsLimit, setEventsLimit] = useState(5);

  const search = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await getPeopleByLatLng(lat, lon);
      setResults(res.results ?? res);
    } catch (err) {
      setError(err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  const useZip = async (doSearch = false) => {
    setZipLoading(true);
    setZipError(null);
    try {
      const geo = await geocodeZip(zip);
      setLat(geo.lat);
      setLon(geo.lon);
      setCity(geo.city ?? null);
      setStateName(geo.state ?? null);
      setStateAbbr(geo.stateAbbr ?? null);
      if (doSearch) {
        // run search after setting lat/lon
        const res = await getPeopleByLatLng(geo.lat, geo.lon);
        setResults(res.results ?? res);
      }
    } catch (err) {
      setZipError(err.message ?? String(err));
    } finally {
      setZipLoading(false);
    }
  };

  const searchEventsForZip = async () => {
    // basic client-side validation to avoid sending empty/invalid requests
    if (!/^[0-9]{5}$/.test(String(zip).trim())) {
      setEventsError('Please enter a valid 5-digit US ZIP code.');
      setEvents([]);
      return;
    }

    setEventsLoading(true);
    setEventsError(null);
    setEvents(null);
    try {
      // get city/state/coords for display
      const geo = await geocodeZip(zip);
      setLat(geo.lat);
      setLon(geo.lon);
      setCity(geo.city ?? null);
      setStateName(geo.state ?? null);
      setStateAbbr(geo.stateAbbr ?? null);
      // Use the full state name as the jurisdiction (per your request)
      const stateName = geo.state; // e.g. "Florida"
      if (!stateName) {
        throw new Error('Could not determine state from ZIP');
      }
  const ev = await getEventsByJurisdiction(stateName, Number(eventsLimit) || 5);
      setEvents(ev ?? []);
    } catch (err) {
      const msg = err.message ?? String(err);
      // If backend returned the validation error, show a friendly message
      if (msg.includes('lat and lon/lng') || msg.includes('No places for ZIP') || msg.includes('ZIP lookup failed')) {
        setEventsError('Could not find events for that ZIP. There might be no upcoming events or the ZIP may be invalid.');
      } else {
        setEventsError(msg);
      }
    } finally {
      setEventsLoading(false);
    }
  };

  return (
    <>
      <div className="app-shell">
        <header className="app-header">
          <img src={flagSvg} alt="US flag" style={{ height: 36, width: 72 }} />
          <div className="brand-title">Who's My Candidate?</div>
        </header>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: 'wrap' }}>
          <label>
            ZIP:{" "}
            <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="Enter ZIP here" />
          </label>
          <button onClick={() => useZip(true)} disabled={zipLoading}>
            {zipLoading ? "Looking up..." : "Search Representatives"}
          </button>

          {/* show current coordinates and place as read-only info to avoid confusion */}
          <div style={{ marginLeft: 12 }}>
            <div>
              {city && stateName ? (
                <span>{city}, {stateName}</span>
              ) : (
                <span>&nbsp;</span>
              )}
            </div>
            <div>Lat: {Number(lat).toFixed(6)}</div>
            <div>Lon: {Number(lon).toFixed(6)}</div>
          </div>
        </div>

  {error && <div style={{ color: "crimson" }}>Error: {error}</div>}
  {zipError && <div style={{ color: "crimson" }}>ZIP error: {zipError}</div>}

        {results && (
          <div>
            <h2>Results ({results.length})</h2>
            <ul>
              {results.map((p) => {
                // current_role from OpenStates is an object (title, org_classification, district, ...)
                // don't render the raw object — render a helpful string instead.
                const role = p.current_role ?? (Array.isArray(p.roles) ? p.roles[0] : null);
                let roleText = null;
                if (role) {
                  if (typeof role === "string") roleText = role;
                  else if (role.title) roleText = role.title;
                  else if (role.label) roleText = role.label;
                  else roleText = JSON.stringify(role);
                }

                return (
                  <li key={p.id}>
                    <strong>{p.name}</strong>
                    {p.party ? ` — ${p.party}` : ""}
                    {roleText ? <div>Role: {roleText}</div> : null}
                    <div>
                      <a href={p.sources?.[0]?.url} target="_blank" rel="noreferrer">
                        Source
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

  <hr />

  <section style={{ marginTop: 12 }}>
          <h2>Upcoming events (by ZIP)</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <label>
              ZIP: <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="Enter ZIP here" />
            </label>
            <label>
              Show:
              <input
                type="number"
                min={1}
                max={50}
                value={eventsLimit}
                onChange={(e) => setEventsLimit(Number(e.target.value) || 1)}
                style={{ width: 64, marginLeft: 6 }}
              />
              events
            </label>
            <button onClick={searchEventsForZip} disabled={eventsLoading}>
              {eventsLoading ? 'Looking up events...' : 'Search Events'}
            </button>
            <div>
              {city && stateName ? <div>{city}, {stateName}</div> : null}
              <div>Lat: {Number(lat).toFixed(6)} Lon: {Number(lon).toFixed(6)}</div>
            </div>
          </div>
          {eventsError && <div style={{ color: 'crimson' }}>Events error: {eventsError}</div>}
          {events !== null && (
            <div>
              {Array.isArray(events) && events.length === 0 ? (
                <div>No events found for this ZIP / jurisdiction.</div>
              ) : (
                <ul>
                      {events.slice(0,5).map((ev, idx) => {
                        // Defensive normalization of event fields to avoid React render errors
                        const key = ev?.id ?? ev?.identifier ?? `ev-${idx}`;
                        const title = (ev?.title ?? ev?.name) || 'Untitled';
                        // description may be HTML string or an object; ensure string
                        let description = null;
                        if (ev?.description) {
                          if (typeof ev.description === 'string') description = ev.description;
                          else description = JSON.stringify(ev.description);
                        }
                        const whenText = ev?.when ?? ev?.start_time ?? ev?.datetime ?? ev?.start ?? '';
                        const locationText = typeof ev?.location === 'string' ? ev.location : (ev?.location?.name ?? JSON.stringify(ev?.location ?? ''));
                        const sourceUrl = ev?.sources?.[0]?.url ?? ev?.source;

                        return (
                          <li key={key} style={{ marginBottom: 8 }}>
                            <strong>{title}</strong>
                            {description ? (
                              // render a sanitized/plain-text fallback instead of injecting raw HTML
                              <div>{description.replace(/<[^>]+>/g, '')}</div>
                            ) : null}
                            {whenText ? <div>{whenText}</div> : null}
                            {locationText ? <div>Location: {locationText}</div> : null}
                            {sourceUrl ? (
                              <div>
                                <a href={sourceUrl} target="_blank" rel="noreferrer">Source</a>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                </ul>
              )}
            </div>
          )}
        </section>


        
      </div>
    </>
  );
}

export default App;
