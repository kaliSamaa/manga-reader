import { useState, useEffect, useCallback } from "react";
import { fetchChapterMeta, pageUrl } from "../api.js";
import { saveProgress, getProgress } from "../storage.js";

function Spinner() {
  return <div className="spinner-wrap"><div className="spinner" /></div>;
}

const MAX_PARALLEL = 3; // pages fetched at once; sources rate-limit bursts

// One page image with a visible error state and a retry button,
// instead of the browser's bare alt text when the source fails.
function PageImage({ src, index, paged, onDone }) {
  const [status, setStatus] = useState("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { setStatus("loading"); setAttempt(0); }, [src]);

  const url = attempt ? `${src}${src.includes("?") ? "&" : "?"}retry=${attempt}` : src;
  const cls = `reader-page${paged ? " paged" : ""}`;

  if (status === "error") {
    return (
      <div className={`${cls} page-failed`}>
        <span>Page {index + 1} failed to load</span>
        <button className="mode-btn" onClick={() => { setStatus("loading"); setAttempt(a => a + 1); }}>
          <i className="fa-solid fa-rotate-right" /> Retry
        </button>
      </div>
    );
  }
  return (
    <>
      {status === "loading" && <div className={`${cls} page-placeholder`}><div className="spinner" /></div>}
      <img
        src={url}
        alt=""
        className={cls}
        style={status === "loading" ? { display: "none" } : undefined}
        onLoad={() => { setStatus("ok"); onDone?.(index, true); }}
        onError={() => { setStatus("error"); onDone?.(index, false); }}
      />
    </>
  );
}

export default function ReaderView({
  chapter, mangaId, onClose, onPrev, onNext, hasPrev, hasNext,
}) {
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("scroll");
  const [cur, setCur] = useState(0);
  const [limit, setLimit] = useState(MAX_PARALLEL);
  const [results, setResults] = useState({}); // page index -> true (ok) / false (failed)

  const chIdx = chapter.index ?? chapter.sourceOrder ?? 0;

  useEffect(() => {
    setLoading(true); setError(null); setPageCount(0);
    setLimit(MAX_PARALLEL); setResults({});
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

  const onPageDone = useCallback((i, ok) => {
    setResults(r => (i in r && r[i] === ok ? r : { ...r, [i]: ok }));
    setLimit(l => l + 1);
  }, []);

  const doneCount = Object.keys(results).length;
  const failedCount = Object.values(results).filter(ok => !ok).length;
  const sourceDown = doneCount >= MAX_PARALLEL && failedCount === doneCount;

  return (
    <div className="reader-overlay">
      <div className="reader-topbar">
        <button className="icon-btn" onClick={onClose} title="Close">
          <i className="fa-solid fa-xmark" />
        </button>
        <div className="chapter-label">{chapter.name}</div>
        <div className="reader-controls">
          <button className={`mode-btn ${mode === "scroll" ? "active" : ""}`} onClick={() => setMode("scroll")}>Scroll</button>
          <button className={`mode-btn ${mode === "page" ? "active" : ""}`} onClick={() => setMode("page")}>Page</button>
        </div>
        <button className="icon-btn" onClick={onPrev} disabled={!hasPrev} title="Previous chapter">
          <i className="fa-solid fa-circle-chevron-left" />
        </button>
        <button className="icon-btn" onClick={onNext} disabled={!hasNext} title="Next chapter">
          <i className="fa-solid fa-circle-chevron-right" />
        </button>
      </div>

      <div className={`reader-body ${mode}`}>
        {loading && <Spinner />}
        {error && <div className="error-banner">Failed to load pages: {error}</div>}

        {!loading && !error && sourceDown && (
          <div className="error-banner reader-banner">
            The source isn't serving images for this chapter right now. It may be
            temporarily blocking requests — try again later or use another source.
          </div>
        )}

        {!loading && !error && mode === "scroll" && pages.map((i) => (
          i < limit
            ? <PageImage key={i} index={i} src={pageUrl(mangaId, chIdx, i)} onDone={onPageDone} />
            : <div key={i} className="reader-page page-placeholder" />
        ))}

        {!loading && !error && mode === "page" && (
          <div className="paged-reader">
            <button
              className="page-nav left"
              onClick={() => goPage(Math.max(0, cur - 1))}
              disabled={cur === 0}
            ><i className="fa-solid fa-caret-left" /></button>

            {pageCount > 0 && (
              <PageImage
                key={cur}
                index={cur}
                paged
                src={pageUrl(mangaId, chIdx, cur)}
                onDone={onPageDone}
              />
            )}

            <button
              className="page-nav right"
              onClick={() => goPage(Math.min(pages.length - 1, cur + 1))}
              disabled={cur === pageCount - 1}
            ><i className="fa-solid fa-caret-right" /></button>

            <div className="page-counter">{cur + 1} / {pageCount}</div>
          </div>
        )}
      </div>
    </div>
  );
}
