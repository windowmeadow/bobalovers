import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getPeopleByLatLng } from "./openstates";
import { geocodeZip } from "./zipLookup";
import placeholderImg from "./images/Portraitholder.jpg";
import "./App.css";
import "./Representatives.css";

export default function RepresentativesPage() {
  const location = useLocation();
  const initialZip = location.state?.zip ?? "";
  const [lat, setLat] = useState(42.3584);
  const [lon, setLon] = useState(-71.0598);
  const [zip, setZip] = useState(initialZip);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipError, setZipError] = useState(null);
  const [city, setCity] = useState(null);
  const [stateName, setStateName] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    if (/^[0-9]{5}$/.test(String(initialZip))) {
      // Auto-run representative search when arriving with a valid ZIP
      useZip(true);
    }
  }, []);

  return (
    <div className="reps-shell">
      {/* White header bar */}
      <header className="reps-header">
        <div className="brand-left">Ballot Snapshot</div>
        <nav className="header-nav">
          <Link to="/">Home</Link>
          <Link to="/guide">Voter's Guide to Government</Link>
          <Link to="/elections">Elections</Link>
          <Link to="/about">About Us</Link>
        </nav>
        <div className="header-spacer"></div>
      </header>

      {/* Main content */}
      <main className="reps-main">
        {/* Title section */}
        <div className="reps-title-section">
          <h1 className="reps-page-title">Your Representatives</h1>
          <p className="reps-subtitle">In <em>Location</em></p>
        </div>

        {/* Lat/Long display box */}
        <div className="latlong-display">
          <div className="latlong-cell">
            <span className="latlong-label">Latitude</span>
            <span className="latlong-value">{Number(lat).toFixed(6)}</span>
          </div>
          <div className="latlong-cell">
            <span className="latlong-label">Longitude</span>
            <span className="latlong-value">{Number(lon).toFixed(6)}</span>
          </div>
        </div>

        {/* Representative cards grid */}
        {results && Array.isArray(results) && results.length > 0 ? (
          <div className="reps-grid">
            {results.map((p) => {
              const role = p.current_role ?? (Array.isArray(p.roles) ? p.roles[0] : null);
              let roleText = null;
              if (role) {
                if (typeof role === "string") roleText = role;
                else if (role.title) roleText = role.title;
                else if (role.label) roleText = role.label;
                else roleText = JSON.stringify(role);
              }
              const imgSrc = personImageUrl(p) ?? placeholderImg;
              const email = extractEmail(p);

              return (
                <div key={p.id} className="rep-card">
                  <div className="rep-photo">
                    <img src={imgSrc} alt={`${p.name} portrait`} />
                  </div>
                  <div className="rep-name">{p.name ?? "Representative's Name"}</div>
                  <div className="rep-details">
                    <div className="rep-party">{p.party ?? "Representative's Party"}.</div>
                    <div className="rep-role">Role: {roleText ?? "Representative's Role"}.</div>
                    {email && (
                      <div className="rep-email">
                        <a href={`mailto:${email}`}>
                          Email <span className="email-icon">✉</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-results">
            {loading ? "Loading representatives..." : "No representatives found for this location."}
          </div>
        )}

        {error && <div className="error-message">Error: {error}</div>}
        {zipError && <div className="error-message">ZIP error: {zipError}</div>}
      </main>
    </div>
  );
}
