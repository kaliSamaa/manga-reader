import { useState, useEffect } from "react";
import { fetchLibrary, gql } from "../api.js";
import { REMOVE_FROM_LIB } from "../api.js";
import { getProgress } from "../storage.js";
import MangaCard from "./MangaCard.jsx";

function Spinner() {
  return <div className="spinner-wrap"><div className="spinner" /></div>;
}

export default function LibraryView({ onSelectManga, username }) {
  const [manga, setManga] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchLibrary()
      .then(list => { setManga(list); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const removeFromLib = async (e, id) => {
    e.stopPropagation();
    await gql(REMOVE_FROM_LIB, { id }).catch(() => {});
    setManga(prev => prev.filter(m => m.id !== id));
  };

  if (loading) return <Spinner />;
  if (error) return <div className="error-banner">Could not load library: {error}</div>;

  return (
    <>
      <div className="section-title">{manga.length} titles in library</div>
      {manga.length === 0 ? (
        <div className="welcome">
          <div className="welcome-icon">◫</div>
          <h2>Your library is empty</h2>
          <p>Search for manga and click "+ Add to Library" to save titles here.</p>
        </div>
      ) : (
        <div className="results-grid">
          {manga.map(m => {
            const progress = getProgress(username, m.id);
            return (
              <div key={m.id} style={{ position: "relative" }}>
                <MangaCard manga={m} onClick={onSelectManga} progress={progress} />
                <button
                  className="lib-remove-card"
                  onClick={(e) => removeFromLib(e, m.id)}
                  title="Remove from library"
                >✕</button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
