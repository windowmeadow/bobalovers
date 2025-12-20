import { useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import { getPeopleByLatLng, getEventsByLatLng, getEventsByJurisdiction, getBillsByJurisdiction } from "./openstates";
import { geocodeZip } from "./zipLookup";
import flagSvg from "./images/flag-us.svg";
import blankImg from "./images/blank.webp";

// Elections Page
function ElectionsPage() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <img src={flagSvg} alt="US flag" style={{ height: 36, width: 72 }} />
        <div className="brand-title">Who's My Candidate?</div>
        <nav style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
          <Link to="/">Home</Link>
          <Link to="/elections">Elections</Link>
          <Link to="/positions">Positions</Link>
        </nav>
      </header>
      <h1>Elections</h1>
      <p>Stay informed about upcoming and ongoing elections in your area.</p>
      <p>This page will display election dates, ballot measures, and voting locations to help you participate in the democratic process.</p>
      <p>Check back soon for detailed election information and important deadlines.</p>
    </div>
  );
}

// Electoral Positions Page
function ElectoralPositionsPage() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <img src={flagSvg} alt="US flag" style={{ height: 36, width: 72 }} />
        <div className="brand-title">Who's My Candidate?</div>
        <nav style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
          <Link to="/">Home</Link>
          <Link to="/elections">Elections</Link>
          <Link to="/positions">Positions</Link>
        </nav>
      </header>
      <h1>Electoral Positions</h1>
      <ul>
        <li><strong>President:</strong> Chief executive of the United States, serves a four-year term.</li>
        <li><strong>Vice President:</strong> Second-highest executive officer, presides over the Senate.</li>
        <li><strong>Treasurer:</strong> Manages public funds and financial operations at various government levels.</li>
        <li><strong>Secretary:</strong> Maintains official records and oversees administrative functions.</li>
      </ul>
    </div>
  );
}

// Home Page Component
function HomePage() {
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
  const [availableEventsCount, setAvailableEventsCount] = useState(null);
  // Bills state
  const [bills, setBills] = useState(null);
  const [billsLoading, setBillsLoading] = useState(false);
  const [billsError, setBillsError] = useState(null);
  const [billsTotal, setBillsTotal] = useState(null);
  const [billsCreatedSince, setBillsCreatedSince] = useState('');
  const [billsSort, setBillsSort] = useState('updated_desc');
  const [billsPerPage, setBillsPerPage] = useState(10);

  // Helper: format an ISO date/time string into a localized, human-readable form.
  const formatDateStr = (s) => {
    if (!s) return null;
    // If it's already a number or Date, normalize
    try {
      const ts = typeof s === 'number' ? s : Date.parse(String(s));
      if (!Number.isFinite(ts) || Number.isNaN(ts)) return null;
      return new Date(ts).toLocaleString();
    } catch (e) {
      return null;
    }
  };

  const searchBillsForZip = async () => {
    // require a valid ZIP and a created_since date
    if (!/^[0-9]{5}$/.test(String(zip).trim())) {
      setBillsError('Please enter a valid 5-digit US ZIP code.');
      setBills([]);
      return;
    }
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(billsCreatedSince).trim())) {
      setBillsError('Please enter a created_since date in yyyy-mm-dd format.');
      setBills([]);
      return;
    }

    setBillsLoading(true);
    setBillsError(null);
    setBills(null);
    try {
      const geo = await geocodeZip(zip);
      const stateNameResolved = geo.state;
      if (!stateNameResolved) throw new Error('Could not determine state from ZIP');
      // call bills helper; backend proxy will include required includes
      const data = await getBillsByJurisdiction(stateNameResolved, billsCreatedSince, billsSort, Number(billsPerPage) || 10);
      let items = [];
      let total = null;
      if (Array.isArray(data)) {
        items = data;
        total = data.length;
      } else if (data && typeof data === 'object') {
        items = data.results ?? data;
        total = data.count ?? data.total ?? data.pagination?.total ?? (Array.isArray(items) ? items.length : null);
      }
      setBills(items ?? []);
      setBillsTotal(total);
    } catch (err) {
      setBillsError(err.message ?? String(err));
    } finally {
      setBillsLoading(false);
    }
  };

  // Helper: extract a best-effort email address from a person object
  const extractEmail = (p) => {
    if (!p) return null;
    if (p.email) return p.email;
    if (p.emails && Array.isArray(p.emails) && p.emails.length) return p.emails[0];
    if (Array.isArray(p.contact_details)) {
      const found = p.contact_details.find((c) => (c.type === 'email' || c.label === 'email' || /email/i.test(c.type || '')) && (c.value || c.email));
      return found ? (found.value || found.email) : null;
    }
    return null;
  };

  // Helper: common image fields used by various APIs
  const personImageUrl = (p) => p?.image ?? p?.image_url ?? p?.photo_url ?? p?.photo ?? p?.thumbnail ?? null;

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
  // Always request up to 5 events from the backend so we can determine the
  // actual number available (the selector should be capped to what's returned).
  const ev = await getEventsByJurisdiction(stateName, 5);
      // Filter out events that have already passed.
      const now = Date.now();
      const parseDate = (s) => {
        if (!s) return null;
        const t = Date.parse(s);
        return Number.isFinite(t) && !Number.isNaN(t) ? t : null;
      };

  const filtered = (ev ?? []).filter((e) => {
        // If an end_date exists and is in the past, exclude
        const endTs = parseDate(e?.end_date);
        if (endTs !== null) {
          if (endTs < now) return false;
          return true; // has end date in future
        }

        // If start_date exists and is in the past, exclude
        const startTs = parseDate(e?.start_date);
        if (startTs !== null) {
          if (startTs < now) return false;
          return true;
        }

        // Try other common fields (when, start_time, datetime, start)
        const whenStr = e?.when ?? e?.start_time ?? e?.datetime ?? e?.start ?? null;
        const whenTs = parseDate(whenStr);
        if (whenTs !== null) {
          if (whenTs < now) return false;
          return true;
        }

        // If there is no parseable date, keep the event (can't determine if passed)
        return true;
      });

      setEvents(filtered);
      // Update available count and cap the selector to the lesser of 5 and the number available
      const avail = Array.isArray(filtered) ? filtered.length : 0;
      setAvailableEventsCount(avail);
      const cap = Math.min(5, avail);
      if (cap >= 0 && eventsLimit > cap) {
        // reduce the eventsLimit to the cap so the selector and displayed count align
        setEventsLimit(cap);
      }
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
          <nav style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
            <Link to="/">Home</Link>
            <Link to="/elections">Elections</Link>
            <Link to="/positions">Positions</Link>
          </nav>
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
                  <li key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                    {/* Image (if available) */}

                    <div style={{ flex: '0 0 auto' }}>
                      <img src={personImageUrl(p) ?? blankImg} alt={`${p.name} photo`} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6 }} />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div>
                        <strong>{p.name}</strong>
                        {p.party ? ` — ${p.party}` : ""}
                      </div>
                      {roleText ? <div>Role: {roleText}</div> : null}

                      {/* Email */}
                      {extractEmail(p) ? (
                        <div>
                          Email: <a href={`mailto:${extractEmail(p)}`}>{extractEmail(p)}</a>
                        </div>
                      ) : null}

                      {/* Sources / links: list all available */}
                      {Array.isArray(p.sources) && p.sources.length > 0 ? (
                        <div style={{ marginTop: 6 }}>
                          Sources:
                          <ul>
                            {p.sources.map((s, i) => (
                              <li key={i}>
                                {s.url ? (
                                  <a href={s.url} target="_blank" rel="noreferrer">{s.url}</a>
                                ) : s.title ? (
                                  <span>{s.title}</span>
                                ) : (
                                  <span>{JSON.stringify(s)}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
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
                min={0}
                max={Math.min(5, availableEventsCount ?? 5)}
                value={eventsLimit}
                onChange={(e) => setEventsLimit(Number(e.target.value) || 0)}
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
                <div>No events found. There may not be any upcoming events for this ZIP / Jurisdiction</div>
              ) : (
                <ul>
                      {events.slice(0, eventsLimit).map((ev, idx) => {
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
                        const whenFormatted = formatDateStr(whenText) ?? whenText;
                        const locationText = typeof ev?.location === 'string' ? ev.location : (ev?.location?.name ?? JSON.stringify(ev?.location ?? ''));
                        const sourceUrl = ev?.sources?.[0]?.url ?? ev?.source;

                        return (
                          <li key={key} style={{ marginBottom: 8 }}>
                            <strong>{title}</strong>
                            {description ? (
                              // render a sanitized/plain-text fallback instead of injecting raw HTML
                              <div>{description.replace(/<[^>]+>/g, '')}</div>
                            ) : null}
                            {whenText ? <div>{whenFormatted}</div> : null}
                            {locationText ? <div>Location: {locationText}</div> : null}
                            {sourceUrl ? (
                              <div>
                                <a href={sourceUrl} target="_blank" rel="noreferrer">Source</a>
                              </div>
                            ) : null}
                            {/* Additional event metadata requested by user */}
                            {ev?.classification ? <div>Classification: {ev.classification}</div> : null}
                            {ev?.start_date ? (
                              <div>Start: {formatDateStr(ev.start_date) ?? ev.start_date}</div>
                            ) : null}
                            {ev?.end_date ? (
                              <div>End: {formatDateStr(ev.end_date) ?? ev.end_date}</div>
                            ) : null}
                            <div>All day: {String(ev?.all_day ?? false)}</div>
                            {ev?.status ? <div>Status: {ev.status}</div> : null}
                            {ev?.upstream_id ? <div>Upstream ID: {ev.upstream_id}</div> : null}
                            <div>Deleted: {String(ev?.deleted ?? false)}</div>

                          </li>
                        );
                      })}
                </ul>
              )}
            </div>
          )}
          {/* Bills UI */}
          <hr />
          <section style={{ marginTop: 12 }}>
            <h2>Search bills (by ZIP → state jurisdiction)</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
              <label>
                ZIP: <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="Enter ZIP here" />
              </label>
              <label>
                Created since:
                <input
                  placeholder="yyyy-mm-dd"
                  value={billsCreatedSince}
                  onChange={(e) => setBillsCreatedSince(e.target.value)}
                  style={{ width: 140, marginLeft: 6 }}
                />
              </label>
              <label>
                Sort:
                <select value={billsSort} onChange={(e) => setBillsSort(e.target.value)} style={{ marginLeft: 6 }}>
                  <option value="updated_desc">updated_desc</option>
                  <option value="updated_asc">updated_asc</option>
                  <option value="first_action_desc">first_action_desc</option>
                  <option value="first_action_asc">first_action_asc</option>
                  <option value="last_action_desc">last_action_desc</option>
                  <option value="last_action_asc">last_action_asc</option>
                </select>
              </label>
              <label>
                Per page:
                <input type="number" min={1} max={50} value={billsPerPage} onChange={(e) => setBillsPerPage(Number(e.target.value) || 1)} style={{ width: 80, marginLeft: 6 }} />
              </label>
              <button onClick={searchBillsForZip} disabled={billsLoading}>
                {billsLoading ? 'Searching bills...' : 'Search Bills'}
              </button>
            </div>
            {billsError && <div style={{ color: 'crimson' }}>Bills error: {billsError}</div>}
            {/* Top summary showing number of results returned */}
            {Array.isArray(bills) ? (
              <div style={{ marginBottom: 6, fontSize: 13 }}>
                {`Showing: ${bills.length} results`}
              </div>
            ) : null}
            {bills !== null && (
              <div>
                {Array.isArray(bills) && bills.length === 0 ? (
                  <div>No bills found for that jurisdiction / date range.</div>
                ) : (
                  <ul>
                    {bills.map((b, i) => (
                      <li key={b.id ?? b.identifier ?? `bill-${i}`} style={{ marginBottom: 8 }}>
                        <strong>{b.title ?? b.other_titles?.[0] ?? b.identifier ?? 'Untitled'}</strong>
                        {b.identifier ? <div>ID: {b.identifier}</div> : null}
                        {b.classification ? <div>Classification: {b.classification}</div> : null}
                        {b.updated_at ? <div>Updated: {formatDateStr(b.updated_at) ?? b.updated_at}</div> : null}
                        {Array.isArray(b.sources) && b.sources.length ? (
                          <div>
                            Sources:
                            <ul>
                              {b.sources.map((s, j) => (
                                <li key={j}>{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.url}</a> : (s.title ?? JSON.stringify(s))}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {Array.isArray(b.votes) && b.votes.length ? (
                          <div>Votes: {b.votes.length} recorded</div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {/* Bottom summary: showing X of Y results */}
            {Array.isArray(bills) ? (
              <div style={{ marginTop: 8, fontSize: 13, color: '#333' }}>
                {`Showing ${Math.min(billsPerPage, bills.length)} of ${billsTotal ?? bills.length} results`}
              </div>
            ) : null}
          </section>
          {/* Summary showing how many are displayed vs total available */}
          {Array.isArray(events) ? (
            <div style={{ marginTop: 8, fontSize: 13, color: '#333' }}>
              {`Showing ${Math.min(eventsLimit, (availableEventsCount ?? events.length))} of ${availableEventsCount ?? events.length} events`}
            </div>
          ) : null}
        </section>



      </div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/elections" element={<ElectionsPage />} />
        <Route path="/positions" element={<ElectoralPositionsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
