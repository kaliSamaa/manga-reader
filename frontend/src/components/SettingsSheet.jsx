export default function SettingsSheet({ open, onClose, sources, selectedSource, setSelectedSource, theme, setTheme }) {
  return (
    <>
      <div className={`mobile-settings-backdrop ${open ? "open" : ""}`} onClick={onClose} />
      <div className={`mobile-settings-sheet ${open ? "open" : ""}`}>
        <span className="source-label">Theme</span>
        <div className="theme-row">
          <button className={`theme-btn ${theme === "mauve" ? "active" : ""}`} onClick={() => setTheme("mauve")}>
            <span className="theme-dot mauve-dot" />sky
          </button>
          <button className={`theme-btn ${theme === "blue" ? "active" : ""}`} onClick={() => setTheme("blue")}>
            <span className="theme-dot blue-dot" />dash
          </button>
        </div>
        <span className="source-label" style={{ marginTop: "1rem", display: "block" }}>Source</span>
        <select className="source-select" value={selectedSource} onChange={e => setSelectedSource(e.target.value)}>
          {sources.length === 0 && <option value="">No sources — install extensions</option>}
          {sources.map(s => (
            <option key={s.id} value={s.id}>{s.displayName || s.name} [{s.lang}]</option>
          ))}
        </select>
      </div>
    </>
  );
}
