import { useState, useEffect } from "react";
import { fetchManga, gql, thumbUrl } from "../api.js";
import { ADD_TO_LIB, REMOVE_FROM_LIB } from "../api.js";
import { getProgress } from "../storage.js";

function Spinner() {
  return <div className="spinner-wrap"><div className="spinner" /></div>;
}

export default function MangaDetail({ manga, onBack, onReadChapter }) {
  const [full, setFull] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inLib, setInLib] = useState(false);
  const [downloading, setDownloading] = useState({});

  useEffect(() => {
    setLoading(true); setError(null);
    fetchManga(manga.id)
      .then(data => {
        setFull(data);
        setInLib(!!data.inLibrary);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [manga.id]);

  const addToLibrary = async () => {
    try { await gql(ADD_TO_LIB, { id: manga.id }); setInLib(true); }
    catch { setInLib(true); }
  };

  const removeFromLibrary = async () => {
    try { await gql(REMOVE_FROM_LIB, { id: manga.id }); setInLib(false); }
    catch {}
  };

  const downloadChapter = async (ch) => {
    setDownloading(d => ({ ...d, [ch.id]: true }));
    try { await fetch(`/api/suwayomi/api/v1/download/${ch.id}`); } catch {}
    setDownloading(d => ({ ...d, [ch.id]: false }));
  };

  if (loading) return <><button className="back-btn" onClick={onBack}>← Back</button><Spinner /></>;
  if (error) return (
    <div className="detail-view">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="error-banner">Could not load manga: {error}</div>
    </div>
  );

  const chapters = (full?.chapters || []).slice().sort((a, b) => a.chapterNumber - b.chapterNumber);
  const thumb = thumbUrl(full?.thumbnailUrl ?? manga.thumbnailUrl);

  const progress = getProgress(manga.id);
  const resumeChapter = progress
    ? chapters.find(c => c.id === progress.chapterId) ?? null
    : null;

  return (
    <div className="detail-view">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <div className="detail-hero">
        <div className="detail-cover">
          {thumb
            ? <img src={thumb} alt={full.title} />
            : <div className="manga-cover-placeholder">{full.title?.[0]}</div>}
        </div>
        <div className="detail-info">
          <h1 className="detail-title">{full.title}</h1>
          {full.author && <div className="detail-author">by {full.author}</div>}
          <div className="badges">
            {full.status && <span className="badge badge-mauve">{full.status}</span>}
            {chapters.length > 0 && <span className="badge badge-peach">{chapters.length} chapters</span>}
            {full.genre?.slice(0, 3).map(g => <span key={g} className="badge badge-green">{g}</span>)}
          </div>
          <p className="detail-desc">
            {full.description?.slice(0, 400)}{full.description?.length > 400 ? "…" : ""}
          </p>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {!inLib
              ? <button className="lib-btn" onClick={addToLibrary}>+ Add to Library</button>
              : <>
                  <button className="lib-btn added" disabled>✓ In Library</button>
                  <button className="lib-btn remove" onClick={removeFromLibrary}>✕ Remove</button>
                </>
            }
            {resumeChapter && (
              <button
                className="lib-btn resume-btn"
                onClick={() => onReadChapter(resumeChapter, chapters, full.id)}
              >
                ▶ Resume · {resumeChapter.name}
                {progress.pageCount > 1 && ` · p.${progress.page + 1}/${progress.pageCount}`}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="chapters-section">
        <h2 className="section-heading">
          Chapters <span className="chapter-count">{chapters.length}</span>
        </h2>
        <div className="chapter-list">
          {chapters.map(ch => {
            const isResume = resumeChapter?.id === ch.id;
            return (
              <div key={ch.id} className={`chapter-row ${isResume ? "chapter-row-resume" : ""}`}>
                <div>
                  <div className="chapter-name">
                    {ch.name}
                    {isResume && <span className="resume-pip"> ▶</span>}
                  </div>
                  {ch.uploadDate > 0 && (
                    <div className="chapter-date">{new Date(ch.uploadDate).toLocaleDateString()}</div>
                  )}
                </div>
                <div className="chapter-actions">
                  <button className="chapter-btn read" onClick={() => onReadChapter(ch, chapters, full.id)}>Read</button>
                  <button className="chapter-btn dl" onClick={() => downloadChapter(ch)} disabled={downloading[ch.id]}>
                    {downloading[ch.id] ? "…" : "↓"}
                  </button>
                </div>
              </div>
            );
          })}
          {chapters.length === 0 && (
            <div className="chapter-row">
              <div className="chapter-name" style={{ color: "var(--overlay0)" }}>
                No chapters found — try refreshing in Suwayomi's UI
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
