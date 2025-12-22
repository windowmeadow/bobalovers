import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getEventsByJurisdiction } from "./openstates";
import { geocodeZip } from "./zipLookup";
import "./App.css";
import "./Events.css";

export default function EventsPage() {
  const location = useLocation();
  const initialZip = location.state?.zip ?? "";
  const [lat, setLat] = useState(42.3584);
  const [lon, setLon] = useState(-71.0598);
  const [zip, setZip] = useState(initialZip);
  const [events, setEvents] = useState(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState(null);
  const [eventsLimit, setEventsLimit] = useState(5);
  const [availableEventsCount, setAvailableEventsCount] = useState(null);
  const [city, setCity] = useState(null);
  const [stateName, setStateName] = useState(null);

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
      const stateNameResolved = geo.state;
      if (!stateNameResolved) throw new Error('Could not determine state from ZIP');
      const ev = await getEventsByJurisdiction(stateNameResolved, 5);
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
      setEventsError(err.message ?? String(err));
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    if (/^[0-9]{5}$/.test(String(initialZip))) {
      // Auto-run events search when arriving with a valid ZIP
      searchEventsForZip();
    }
  }, []);

  return (
    <div className="events-shell">
      {/* White header bar */}
      <header className="events-header">
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
      <main className="events-main">
        <div className="events-content-wrapper">
          {/* Left column - Title and controls */}
          <div className="events-left-column">
            <h1 className="events-page-title">Upcoming Events</h1>
            
            {/* Show events control */}
            <div className="events-control">
              <label className="control-label">
                Show 
                <input
                  type="number"
                  min={0}
                  max={Math.min(5, availableEventsCount ?? 5)}
                  value={eventsLimit}
                  onChange={(e) => setEventsLimit(Number(e.target.value) || 0)}
                  className="control-input"
                />
                Events
              </label>
              <span className="control-divider">|</span>
              <span className="control-showing">
                Showing {Math.min(eventsLimit, availableEventsCount ?? 0)} out of {availableEventsCount ?? 0} events.
              </span>
            </div>

            {/* Event cards - 2 column grid */}
            <div className="events-grid">
              {events && Array.isArray(events) && events.length > 0 ? (
                events.slice(0, eventsLimit).map((ev, idx) => {
                  const key = ev?.id ?? ev?.identifier ?? `ev-${idx}`;
                  const title = (ev?.title ?? ev?.name) || 'Event Title.';
                  const locationText = typeof ev?.location === 'string' ? ev.location : (ev?.location?.name ?? 'Event Location.');
                  const classification = ev?.classification ?? 'Event Classification.';
                  const whenText = ev?.when ?? ev?.start_time ?? ev?.datetime ?? ev?.start ?? '';
                  const whenFormatted = (formatDateStr(whenText) ?? whenText) || 'Event Start time.';
                  const allDay = ev?.all_day ?? false;
                  const status = ev?.status ?? 'Event Status.';
                  const deleted = ev?.deleted ?? false;

                  return (
                    <div key={key} className="event-card">
                      <h3 className="event-title">{title}</h3>
                      <div className="event-details">
                        <div className="event-detail-line">{locationText}</div>
                        <div className="event-detail-line">{classification}</div>
                        <div className="event-detail-line">{whenFormatted}</div>
                        <div className="event-detail-line">Lasts all day: {allDay ? 'Yes' : 'No'}</div>
                        <div className="event-detail-line">{status}</div>
                        <div className="event-detail-line">Is the event canceled? {deleted ? 'Yes' : 'No'}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-events">
                  {eventsLoading ? "Loading events..." : "No upcoming events found for this location."}
                </div>
              )}
            </div>
          </div>

          {/* Right column - Location info */}
          <div className="events-right-column">
            <div className="location-section">
              <h2 className="location-title">Location</h2>
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
            </div>
          </div>
        </div>

        {eventsError && <div className="error-message">Events error: {eventsError}</div>}
      </main>
    </div>
  );
}
