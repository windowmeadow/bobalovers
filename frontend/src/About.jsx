import React from "react";
import { Link } from "react-router-dom";
import "./About.css";

export default function AboutPage() {
  return (
    <div className="about-shell">
      {/* White header bar */}
      <header className="about-header">
        <div className="brand-left">Ballot Snapshot</div>
        <nav className="header-nav">
          <Link to="/">Home</Link>
          <Link to="/guide">Voter's Guide to Government</Link>
          <Link to="/elections">Elections</Link>
        </nav>
        <div className="header-spacer" />
      </header>

      {/* Hero section with background and mission content */}
      <section className="about-hero">
        <div className="hero-overlay" />
        <div className="mission">
          <h1 className="mission-title">Our Mission</h1>
          <div className="mission-body">
            <p>
              Ballot Snapshot exists to make state-level democracy easier to understand and
              easier to participate in.
            </p>
            <p>
              State governments shape many of the decisions that affect the daily lives of their
              residents—from public schools and transportation to housing policy, healthcare
              access, and community safety—yet many residents feel disconnected from the
              representatives who make those choices.
            </p>
            <p>
              Our mission is to give non-political voters clear, simple tools to learn who
              represents them, what those officials do, and how their decisions shape life in
              their state.
            </p>
            <p>
              We also highlight how federal representatives work in partnership with state
              priorities—from funding infrastructure to shaping national programs—so
              residents can see how every level of government is connected.
            </p>
            <p>
              By making this information accessible, Ballot Snapshot empowers more people
              to participate confidently in state and federal elections that directly influence
              their communities.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
