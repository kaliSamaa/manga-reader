import { useState, useEffect, useCallback } from "react";
import { fetchChapterMeta, pageUrl } from "../api.js";
import { saveProgress, getProgress } from "../storage.js";

function Spinner() {
  return <div className="spinner-wrap"><div className="spinner" /></div>;
}

export default function ReaderView({
  chapter, mangaId, onClose, onPrev, onNext, hasPrev, hasNext,
}) {
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("scroll");
  const [cur, setCur] = useState(0);

  const chIdx = chapter.index ?? chapter.sourceOrder ?? 0;

  useEffect(() => {
    setLoading(true); setError(null); setPageCount(0);
    fetchChapterMeta(mangaId, chIdx)
      .then(d => {
        const count = d.pageCount ?? 0;
        setPageCount(count);
        const saved = getProgress(mangaId);
        if (saved && saved.chapterId === chapter.id && saved.page < count) {
          setCur(saved.page);
        } else {
          setCur(0);
        }
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [mangaId, chIdx, chapter.id]);

  const persistProgress = useCallback((page, count) => {
    saveProgress(mangaId, {
      chapterId: chapter.id,
      chapterName: chapter.name,
      chapterNumber: chapter.chapterNumber,
      page,
      pageCount: count,
    });
  }, [mangaId, chapter]);

  const goPage = (next) => {
    setCur(next);
    persistProgress(next, pageCount);
  };

  useEffect(() => {
    if (!loading && mode === "scroll" && pageCount > 0) {
      persistProgress(cur, pageCount);
    }
  }, [loading, mode, pageCount]);

  const pages = Array.from({ length: pageCount }, (_, i) => i);

  return (
    <div className="reader-overlay">
      <div className="reader-topbar">
        <button className="icon-btn" onClick={onClose}>← Close</button>
        <div className="chapter-label">{chapter.name}</div>
        <div className="reader-controls">
          <button className={`mode-btn ${mode === "scroll" ? "active" : ""}`} onClick={() => setMode("scroll")}>Scroll</button>
          <button className={`mode-btn ${mode === "page" ? "active" : ""}`} onClick={() => setMode("page")}>Page</button>
        </div>
        <button className="icon-btn" onClick={onPrev} disabled={!hasPrev}>← Prev</button>
        <button className="icon-btn" onClick={onNext} disabled={!hasNext}>Next →</button>
      </div>

      <div className={`reader-body ${mode}`}>
        {loading && <Spinner />}
        {error && <div className="error-banner">Failed to load pages: {error}</div>}

        {!loading && !error && mode === "scroll" && pages.map((i) => (
          <img
            key={i}
            src={pageUrl(mangaId, chIdx, i)}
            alt={`Page ${i + 1}`}
            className="reader-page"
            loading="lazy"
          />
        ))}

        {!loading && !error && mode === "page" && (
          <div className="paged-reader">
            <button
              className="page-nav left"
              onClick={() => goPage(Math.max(0, cur - 1))}
              disabled={cur === 0}
            >‹</button>

            {pageCount > 0 && (
              <img
                key={cur}
                src={pageUrl(mangaId, chIdx, cur)}
                alt={`Page ${cur + 1}`}
                className="reader-page paged"
              />
            )}

            <button
              className="page-nav right"
              onClick={() => goPage(Math.min(pages.length - 1, cur + 1))}
              disabled={cur === pageCount - 1}
            >›</button>

            <div className="page-counter">{cur + 1} / {pageCount}</div>
          </div>
        )}
      </div>
    </div>
  );
}
