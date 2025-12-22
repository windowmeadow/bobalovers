import { Link } from "react-router-dom";
import ballotIcon from "./images/ballot.jpg";
import "./Elections.css";

export default function ElectionsPage() {
  return (
    <div className="elections-shell">
      {/* Header */}
      <header className="elections-header">
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
      <main className="elections-main">
        <h1 className="elections-page-title">Elections</h1>
        
        <div className="elections-content">
          <p className="elections-text">
            Stay informed about upcoming and ongoing elections in your area.
          </p>
          
          <p className="elections-text">
            This page will display election dates, ballot measures, and voting locations to help you participate in the democratic process.
          </p>
          
          <p className="elections-text">
            Check back soon for detailed election information and important deadlines.
          </p>
          
          <div className="ballot-icon-container">
            <img src={ballotIcon} alt="Ballot box" className="ballot-icon" />
          </div>
        </div>
      </main>
    </div>
  );
}
