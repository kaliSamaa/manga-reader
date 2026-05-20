import { clearSession } from "../storage.js";

export default function Sidebar({ view, setView, setSelectedManga, session, sources, selectedSource, setSelectedSource, theme, setTheme }) {

  function handleNav(v) {
    setView(v);
    setSelectedManga(null);
  }

  function logout() {
    clearSession();
    window.location.reload();
  }

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-mark">M</div>
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

        {session.isAdmin && (
          <>
            <div className="nav-section-label">Admin</div>
            <button className={`nav-item ${view === "users" ? "active" : ""}`} onClick={() => handleNav("users")}>
              <i className="nav-icon fa-solid fa-user" /> Users
            </button>
          </>
        )}

        {/* Mobile-only settings nav item */}
        <button className={`nav-item mobile-only ${view === "settings" ? "active" : ""}`} onClick={() => setView("settings")}>
          <i className="nav-icon fa-solid fa-gear" /> Settings
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="session-row">
          <span className="session-user">
            <i className={`fa-solid ${session.isAdmin ? "fa-user-tie" : "fa-user"}`} /> {session.username}
          </span>
          <button className="logout-btn" onClick={logout}>Sign out</button>
        </div>

        <div className="source-label" style={{ marginBottom: "6px", marginTop: "0.75rem" }}>Theme</div>
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
