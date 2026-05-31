import { useState, useEffect } from "react";
import { fetchManga, gql, thumbUrl, downloadChapter as apiDownload } from "../api.js";
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
  const [downloading, setDownloading] = useState({}); // id -> "dl" | "done" | "err"

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

  const handleDownload = async (ch) => {
    setDownloading(d => ({ ...d, [ch.id]: "dl" }));
    try {
      await apiDownload(ch.id);
      setDownloading(d => ({ ...d, [ch.id]: "done" }));
    } catch (e) {
      console.error("Download failed:", e.message);
      setDownloading(d => ({ ...d, [ch.id]: "err" }));
    }
    setTimeout(() => setDownloading(d => ({ ...d, [ch.id]: null })), 3000);
  };

  if (loading) return (
    <>
      <button className="back-btn" onClick={onBack}><i className="fa-solid fa-caret-left" /> Back</button>
      <Spinner />
    </>
  );
  if (error) return (
    <div className="detail-view">
      <button className="back-btn" onClick={onBack}><i className="fa-solid fa-caret-left" /> Back</button>
      <div className="error-banner">Could not load manga: {error}</div>
    </div>
  );

  const chapters = (full?.chapters || []).slice().sort((a, b) => a.chapterNumber - b.chapterNumber);
  const thumb = thumbUrl(full?.thumbnailUrl ?? manga.thumbnailUrl);
  const progress = getProgress(manga.id);
  const resumeChapter = progress ? chapters.find(c => c.id === progress.chapterId) ?? null : null;

  return (
    <div className="detail-view">
      <button className="back-btn" onClick={onBack}><i className="fa-solid fa-caret-left" /> Back</button>

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
              ? <button className="lib-btn" onClick={addToLibrary}><i className="fa-solid fa-plus" /> Add to Library</button>
              : <>
                  <button className="lib-btn added" disabled><i className="fa-solid fa-check" /> In Library</button>
                  <button className="lib-btn remove" onClick={removeFromLibrary}><i className="fa-solid fa-xmark" /> Remove</button>
                </>
            }
            {resumeChapter && (
              <button
                className="lib-btn resume-btn"
                onClick={() => onReadChapter(resumeChapter, chapters, full.id)}
                title={`Resume: ${resumeChapter.name}${progress.pageCount > 1 ? ` · p.${progress.page + 1}/${progress.pageCount}` : ""}`}
              >
                <i className="fa-solid fa-forward" />
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
            const dlState = downloading[ch.id];
            return (
              <div key={ch.id} className={`chapter-row ${isResume ? "chapter-row-resume" : ""}`}>
                <div>
                  <div className="chapter-name">
                    {ch.name}
                    {isResume && <i className="fa-solid fa-forward resume-pip" style={{ marginLeft: "6px" }} />}
                    {ch.isDownloaded && <i className="fa-solid fa-circle-check" style={{ marginLeft: "6px", color: "var(--green)", fontSize: "0.75rem" }} title="Downloaded" />}
                  </div>
                  {ch.uploadDate > 0 && (
                    <div className="chapter-date">{new Date(ch.uploadDate).toLocaleDateString()}</div>
                  )}
                </div>
                <div className="chapter-actions">
                  <button
                    className="chapter-btn read"
                    onClick={() => onReadChapter(ch, chapters, full.id)}
                    title="Read"
                  >
                    <i className="fa-solid fa-circle-chevron-right" />
                  </button>
                  <button
                    className={`chapter-btn dl${dlState === "done" ? " done" : dlState === "err" ? " err" : ""}`}
                    onClick={() => handleDownload(ch)}
                    disabled={dlState === "dl" || ch.isDownloaded}
                    title={
                      ch.isDownloaded  ? "Already downloaded" :
                      dlState === "dl"   ? "Downloading… (check Suwayomi queue)" :
                      dlState === "done" ? "Downloaded!" :
                      dlState === "err"  ? "Failed — check Suwayomi logs" :
                      "Download chapter"
                    }
                  >
                    {dlState === "dl"   ? <i className="fa-solid fa-spinner fa-spin" /> :
                     dlState === "done" ? <i className="fa-solid fa-check" /> :
                     dlState === "err"  ? <i className="fa-solid fa-xmark" /> :
                     ch.isDownloaded    ? <i className="fa-solid fa-circle-check" /> :
                                         <i className="fa-solid fa-download" />}
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
