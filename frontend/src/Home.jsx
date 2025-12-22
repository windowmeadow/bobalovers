import { useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";
import "./Home.css";
import { getPeopleByLatLng, getEventsByLatLng, getEventsByJurisdiction, getBillsByJurisdiction } from "./openstates";
import { geocodeZip } from "./zipLookup";
import flagSvg from "./images/flag-us.svg";
import blankImg from "./images/blank.webp";

export default function HomePage() {
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

  const formatDateStr = (s) => {
    if (!s) return null;
    try {
      const ts = typeof s === 'number' ? s : Date.parse(String(s));
      if (!Number.isFinite(ts) || Number.isNaN(ts)) return null;
      return new Date(ts).toLocaleString();
    } catch (e) {
      return null;
    }
  };

  const searchBillsForZip = async () => {
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
    if (!/^[0-9]{5}$/.test(String(zip).trim())) {
      setEventsError('Please enter a valid 5-digit US ZIP code.');
      setEvents([]);
      return;
    }

    setEventsLoading(true);
    setEventsError(null);
    setEvents(null);
    try {
      const geo = await geocodeZip(zip);
      setLat(geo.lat);
      setLon(geo.lon);
      setCity(geo.city ?? null);
      setStateName(geo.state ?? null);
      setStateAbbr(geo.stateAbbr ?? null);
      const stateName = geo.state;
      if (!stateName) {
        throw new Error('Could not determine state from ZIP');
      }
      const ev = await getEventsByJurisdiction(stateName, 5);
      const now = Date.now();
      const parseDate = (s) => {
        if (!s) return null;
        const t = Date.parse(s);
        return Number.isFinite(t) && !Number.isNaN(t) ? t : null;
      };

      const filtered = (ev ?? []).filter((e) => {
        const endTs = parseDate(e?.end_date);
        if (endTs !== null) {
          if (endTs < now) return false;
          return true;
        }
        const startTs = parseDate(e?.start_date);
        if (startTs !== null) {
          if (startTs < now) return false;
          return true;
        }
        const whenStr = e?.when ?? e?.start_time ?? e?.datetime ?? e?.start ?? null;
        const whenTs = parseDate(whenStr);
        if (whenTs !== null) {
          if (whenTs < now) return false;
          return true;
        }
        return true;
      });

      setEvents(filtered);
      const avail = Array.isArray(filtered) ? filtered.length : 0;
      setAvailableEventsCount(avail);
      const cap = Math.min(5, avail);
      if (cap >= 0 && eventsLimit > cap) {
        setEventsLimit(cap);
      }
    } catch (err) {
      const msg = err.message ?? String(err);
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
        {/* Header with Ballot Snapshot and Navigation */}
        <header className="home-header">
          <div className="ballot-snapshot">Ballot Snapshot</div>
          <nav className="home-nav">
            <Link to="/guide" className="nav-button">Voter's Guide to Government</Link>
            <Link to="/elections" className="nav-button">Elections</Link>
            <Link to="/about" className="nav-button">About Us</Link>
          </nav>
        </header>

        {/* Main Content */}
        <main className="home-main">
          {/* Motto Text */}
          <div className="motto-container">
            <div className="motto-text">
              We the People of the United States,<br />
              Deserve The Leaders We Need,<br />
              For a Better America!
            </div>
          </div>

          {/* ZIP Input Section */}
          <div className="zip-input-container">
            <div className="zip-input-box">
              <input 
                value={zip} 
                onChange={(e) => setZip(e.target.value)} 
                placeholder="Type your ZIP Code" 
                className="zip-input"
              />
            </div>
          </div>

          {/* Search Buttons Section */}
          <div className="search-buttons-container">
            <Link to={{ pathname: '/events' }} state={{ zip }} style={{ textDecoration: 'none' }}>
              <button className="search-button" disabled={zipLoading}>
                SEARCH EVENTS
              </button>
            </Link>
            <Link to={{ pathname: '/representatives' }} state={{ zip }} style={{ textDecoration: 'none' }}>
              <button className="search-button" disabled={zipLoading}>
                SEARCH REPRESENTATIVES
              </button>
            </Link>
            <Link to={{ pathname: '/bills' }} state={{ zip }} style={{ textDecoration: 'none' }}>
              <button className="search-button" disabled={zipLoading}>
                SEARCH BILLS
              </button>
            </Link>
          </div>
        </main>

        {/* Error messages */}
        {error && <div style={{ color: "crimson", textAlign: "center", margin: "20px 0" }}>Error: {error}</div>}
        {zipError && <div style={{ color: "crimson", textAlign: "center", margin: "20px 0" }}>ZIP error: {zipError}</div>}

        {/* Optional: Show city/state if available */}
        {city && stateName && (
          <div style={{ textAlign: "center", margin: "20px 0", fontSize: "16px", color: "#666" }}>
            {city}, {stateName}
          </div>
        )}
      </div>
    </>
  );
}
