import { useState } from "react";
import { Link } from "react-router-dom";
import "./Guide.css";

export default function GuidePage() {
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="guide-shell">
      {/* Header */}
      <header className="guide-header">
        <div className="brand-left">Ballot Snapshot</div>
        <nav className="header-nav">
          <Link to="/">Home</Link>
          <Link to="/elections">Elections</Link>
          <Link to="/about">About Us</Link>
        </nav>
        <div className="header-spacer"></div>
      </header>

      {/* Main content */}
      <main className="guide-main">
        <h1 className="guide-page-title">Our Government</h1>
        
        <p className="guide-description">
          The Federal Government is composed of three distinct branches: legislative, executive, and judicial, whose powers are 
          vested by the U.S. Constitution in the Congress, the President, and the Federal courts, respectively. Under the Tenth 
          Amendment to the U.S. Constitution, all powers not granted to the federal government are reserved for the states and the 
          people, which are divided between State and local governments.
        </p>

        <div className="guide-sections">
          <button 
            className="section-button"
            onClick={() => toggleSection('state')}
          >
            <span>State Governments</span>
            <span className="plus-icon">+</span>
          </button>
          
          {openSection === 'state' && (
            <div className="section-content">
              <p>State governments are structured similarly to the federal government with executive, legislative, and judicial branches. Each state has its own constitution, elected officials, and laws that govern matters not covered by federal law.</p>
            </div>
          )}

          <button 
            className="section-button"
            onClick={() => toggleSection('elected')}
          >
            <span>Main Elected Officials</span>
            <span className="plus-icon">+</span>
          </button>
          
          {openSection === 'elected' && (
            <div className="section-content">
              <p>Elected officials include the President, Vice President, members of Congress (Senators and Representatives), Governors, State Legislators, Mayors, and other local officials who are chosen by voters to represent their interests.</p>
            </div>
          )}

          <button 
            className="section-button"
            onClick={() => toggleSection('branches')}
          >
            <span>Branches of Government</span>
            <span className="plus-icon">+</span>
          </button>
          
          {openSection === 'branches' && (
            <div className="section-content">
              <p><strong>Legislative Branch:</strong> Makes laws (Congress: Senate and House of Representatives)</p>
              <p><strong>Executive Branch:</strong> Enforces laws (President, Vice President, Cabinet)</p>
              <p><strong>Judicial Branch:</strong> Interprets laws (Supreme Court and Federal Courts)</p>
            </div>
          )}
        </div>

        <div className="guide-footer">
          <p className="footer-text">
            To learn more about your state's government, you can visit the site below:
          </p>
          <a href="https://www.usa.gov/state-governments" target="_blank" rel="noopener noreferrer" className="footer-link">
            https://www.usa.gov/state-governments
          </a>
        </div>
      </main>
    </div>
  );
}
