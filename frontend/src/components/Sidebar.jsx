export default function Sidebar({ view, setView, setSelectedManga, sources, selectedSource, setSelectedSource, theme, setTheme }) {

  function handleNav(v) {
    setView(v);
    setSelectedManga(null);
  }

  return (
    <aside className="sidebar">
      <div className="logo">
        <img src="/logo.png" alt="Manki" className="logo-mark" style={{ padding: 0, objectFit: "cover" }} />
        <div>
          <div className="logo-text">Manki</div>
          <div className="logo-sub">Manga Reader</div>
        </div>
      </div>

      <nav className="sidenav">
        <div className="nav-section-label">Browse</div>
        <button className={`nav-item ${view === "search" ? "active" : ""}`} onClick={() => handleNav("search")}>
          <i className="nav-icon fa-solid fa-magnifying-glass" /> Search
        </button>
        <button className={`nav-item ${view === "library" ? "active" : ""}`} onClick={() => handleNav("library")}>
          <i className="nav-icon fa-solid fa-book-atlas" /> Library
        </button>
        <button className={`nav-item mobile-only ${view === "settings" ? "active" : ""}`} onClick={() => setView("settings")}>
          <i className="nav-icon fa-solid fa-gear" /> Settings
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="source-label" style={{ marginBottom: "6px" }}>Theme</div>
        <div style={{ display: "flex", gap: "6px", marginBottom: "1rem" }}>
          <button className={`theme-btn ${theme === "mauve" ? "active" : ""}`} onClick={() => setTheme("mauve")}>
            <span className="theme-dot mauve-dot" />sky
          </button>
          <button className={`theme-btn ${theme === "blue" ? "active" : ""}`} onClick={() => setTheme("blue")}>
            <span className="theme-dot blue-dot" />dash
          </button>
        </div>

        <div className="source-label">Source</div>
        <select className="source-select" value={selectedSource} onChange={e => setSelectedSource(e.target.value)}>
          {sources.length === 0 && <option value="">No sources — install extensions</option>}
          {sources.map(s => (
            <option key={s.id} value={s.id}>{s.displayName || s.name} [{s.lang}]</option>
          ))}
        </select>
      </div>
    </aside>
  );
}
