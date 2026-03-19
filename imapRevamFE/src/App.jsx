import logo from "./assets/logo.png";
import "./App.css";
import Bar from "./Bar";

function App() {
  return (
    <div className="relative w-full min-h-screen bg-[#eef1f5]">

      {/* ── Top bar ── */}
      <header className="imap-header">
        <div className="imap-left">
          <img src={logo} alt="Taboola" className="imap-logo" />
          <div className="imap-divider" />
          <span className="imap-app-name">INCIDENT MANAGEMENT</span>
        </div>
        
      </header>

      {/* ── Hero banner ──
      <div className="imap-hero">
        <div className="imap-hero-glow" />
        <div className="imap-hero-content">
          <p className="imap-hero-label">Internal Platform</p>
          <h1 className="imap-hero-title">Incident Communication & Reporting</h1>
          <p className="imap-hero-subtitle">
            Track, escalate, and resolve incidents across departments in real time.
          </p>
        </div>
      </div> */}

      {/* ── Form area ── */}
      <div className="relative w-full flex justify-center items-start min-h-[calc(100vh-150px)] p-2">
      <Bar />
      </div>
    </div>
  );
}

export default App;