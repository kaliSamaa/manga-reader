import { useState, useCallback } from "react";
import { searchSource } from "../api.js";
import MangaCard from "./MangaCard.jsx";

function Spinner() {
  return <div className="spinner-wrap"><div className="spinner" /></div>;
}

export default function SearchView({ selectedSource, onSelectManga }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  const doSearch = useCallback(async () => {
    if (!query.trim() || !selectedSource) return;
    setSearching(true); setResults([]); setError(null);
    try {
      setResults(await searchSource(selectedSource, query));
    } catch (e) {
      setError(e.message);
    }
    setSearching(false);
  }, [query, selectedSource]);

  return (
    <>
      <div className="topbar">
        <div className="search-wrap">
          <input
            className="search-input"
            placeholder="Search manga…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doSearch()}
          />
          <button className="search-btn" onClick={doSearch} disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </button>
        </div>
      </div>

      {error && <div className="error-banner">Search failed: {error}</div>}
      {searching && <Spinner />}

      {!searching && results.length > 0 && (
        <>
          <div className="section-title">{results.length} results</div>
          <div className="results-grid">
            {results.map((m, i) => (
              <MangaCard key={m.id ?? i} manga={m} onClick={onSelectManga} />
            ))}
          </div>
        </>
      )}

      {!searching && results.length === 0 && query && !error && (
        <div className="empty-state">No results for "{query}"</div>
      )}

      {!query && !searching && (
        <div className="welcome">
          <div className="welcome-icon">◫</div>
          <h2>Find your next read</h2>
          <p>Select a source in the sidebar, then search for any manga title.</p>
        </div>
      )}
    </>
  );
}
