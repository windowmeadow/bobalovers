import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import HomePage from "./Home.jsx";
import ElectionsPage from "./Elections.jsx";
import GuidePage from "./Guide.jsx";
import RepresentativesPage from "./Representatives.jsx";
import EventsPage from "./Events.jsx";
import BillsPage from "./Bills.jsx";
import AboutPage from "./About.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/elections" element={<ElectionsPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/representatives" element={<RepresentativesPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/bills" element={<BillsPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
