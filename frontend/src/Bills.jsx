import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { getBillsByJurisdiction } from "./openstates";
import { geocodeZip } from "./zipLookup";
import "./Bills.css";

export default function BillsPage() {
  const location = useLocation();
  const initialZip = location.state?.zip ?? "";
  const [zip, setZip] = useState(initialZip);
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

  useEffect(() => {
    if (/^[0-9]{5}$/.test(String(initialZip))) {
      // Auto-run bills search when arriving with a valid ZIP
      searchBillsForZip();
    }
  }, []);

  return (
    <div className="bills-shell">
      {/* Header */}
      <header className="bills-header">
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
      <main className="bills-main">
        <h1 className="bills-page-title">Bills (State Jurisdiction)</h1>

        {/* Search controls */}
        <div className="bills-controls">
          <label className="control-item">
            <span className="control-label">ZIP:</span>
            <input 
              className="control-input" 
              value={zip} 
              onChange={(e) => setZip(e.target.value)} 
              placeholder="Enter ZIP here" 
            />
          </label>
          <label className="control-item">
            <span className="control-label">Created since:</span>
            <input
              className="control-input"
              placeholder="yyyy-mm-dd"
              value={billsCreatedSince}
              onChange={(e) => setBillsCreatedSince(e.target.value)}
            />
          </label>
          <label className="control-item">
            <span className="control-label">Sort:</span>
            <select className="control-select" value={billsSort} onChange={(e) => setBillsSort(e.target.value)}>
              <option value="updated_desc">updated_desc</option>
              <option value="updated_asc">updated_asc</option>
              <option value="first_action_desc">first_action_desc</option>
              <option value="first_action_asc">first_action_asc</option>
              <option value="last_action_desc">last_action_desc</option>
              <option value="last_action_asc">last_action_asc</option>
            </select>
          </label>
          <label className="control-item">
            <span className="control-label">Per page:</span>
            <input 
              className="control-input control-input-small"
              type="number" 
              min={1} 
              max={50} 
              value={billsPerPage} 
              onChange={(e) => setBillsPerPage(Number(e.target.value) || 1)} 
            />
          </label>
          <button className="search-button" onClick={searchBillsForZip} disabled={billsLoading}>
            {billsLoading ? 'Searching bills...' : 'Search Bills'}
          </button>
        </div>

        {billsError && <div className="error-message">Bills error: {billsError}</div>}
        
        {Array.isArray(bills) && (
          <div className="results-count">
            {`Showing: ${bills.length} results`}
          </div>
        )}

        {bills !== null && (
          <div className="bills-results">
            {Array.isArray(bills) && bills.length === 0 ? (
              <div className="no-bills">No bills found for that jurisdiction / date range.</div>
            ) : (
              <ul className="bills-list">
                {bills.map((b, i) => (
                  <li key={b.id ?? b.identifier ?? `bill-${i}`} className="bill-item">
                    <div className="bill-title">{b.title ?? b.other_titles?.[0] ?? b.identifier ?? 'Untitled'}</div>
                    {b.identifier && <div className="bill-detail">ID: {b.identifier}</div>}
                    {b.classification && <div className="bill-detail">Classification: {b.classification}</div>}
                    {b.updated_at && <div className="bill-detail">Updated: {formatDateStr(b.updated_at) ?? b.updated_at}</div>}
                    {Array.isArray(b.sources) && b.sources.length > 0 && (
                      <div className="bill-sources">
                        <div className="sources-label">Sources:</div>
                        <ul className="sources-list">
                          {b.sources.map((s, j) => (
                            <li key={j} className="source-item">
                              {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.url}</a> : (s.title ?? JSON.stringify(s))}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(b.votes) && b.votes.length > 0 && (
                      <div className="bill-detail">Votes: {b.votes.length} recorded</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {Array.isArray(bills) && (
          <div className="results-footer">
            {`Showing ${Math.min(billsPerPage, bills.length)} of ${billsTotal ?? bills.length} results`}
          </div>
        )}
      </main>
    </div>
  );
}
