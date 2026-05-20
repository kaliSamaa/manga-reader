import { useState, useCallback, useEffect } from "react";
import { searchSource, fetchLibrary } from "../api.js";
import MangaCard from "./MangaCard.jsx";

function Spinner() {
  return <div className="spinner-wrap"><div className="spinner" /></div>;
}

// Pick up to 3 search terms from library genres + titles
function buildRecommendTerms(libraryItems) {
  const terms = new Set();
  for (const m of libraryItems) {
    if (m.genre) m.genre.slice(0, 2).forEach(g => terms.add(g));
  }
  // Fall back to first words of titles if no genres
  if (terms.size === 0) {
    for (const m of libraryItems.slice(0, 3)) {
      const word = m.title?.split(" ")[0];
      if (word) terms.add(word);
    }
  }
  return [...terms].slice(0, 3);
}

export default function SearchView({ selectedSource, onSelectManga }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  // Recommendations
  const [recSections, setRecSections] = useState([]); // [{ term, items }]
  const [loadingRecs, setLoadingRecs] = useState(false);

  useEffect(() => {
    if (!selectedSource) return;
    setLoadingRecs(true);
    fetchLibrary()
      .then(async (lib) => {
        if (lib.length === 0) { setLoadingRecs(false); return; }
        // fetch full manga info to get genres — use what we have (title only from library query)
        const terms = buildRecommendTerms(
          lib.map(m => ({ ...m, genre: m.genre || [] }))
        );
        const sections = await Promise.all(
          terms.map(async (term) => {
            try {
              const items = await searchSource(selectedSource, term);
              // exclude things already in library
              const libIds = new Set(lib.map(m => String(m.id)));
              const filtered = items.filter(m => !libIds.has(String(m.id))).slice(0, 8);
              return filtered.length > 0 ? { term, items: filtered } : null;
            } catch {
              return null;
            }
          })
        );
        setRecSections(sections.filter(Boolean));
        setLoadingRecs(false);
      })
      .catch(() => setLoadingRecs(false));
  }, [selectedSource]);

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

  const showWelcome = !query && !searching;

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

      {showWelcome && (
        <>
          {loadingRecs && <Spinner />}

          {!loadingRecs && recSections.length > 0 && (
            <div className="rec-sections">
              {recSections.map(({ term, items }) => (
                <div key={term} className="rec-section">
                  <div className="section-title">Because you read · {term}</div>
                  <div className="results-grid">
                    {items.map((m, i) => (
                      <MangaCard key={m.id ?? i} manga={m} onClick={onSelectManga} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loadingRecs && recSections.length === 0 && (
            <div className="welcome">
              <div className="welcome-icon"><i className="fa-solid fa-magnifying-glass" /></div>
              <h2>Find your next read</h2>
              <p>Select a source in the sidebar, then search for any manga title.</p>
            </div>
          )}
        </>
      )}
    </>
  );
}
