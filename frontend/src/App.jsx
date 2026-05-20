import { useState, useEffect, useCallback } from "react";

const BASE = "/api/suwayomi";

// REST helpers (more reliable for source search)
async function rest(path) {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// GraphQL helper (for library mutations & chapter ops)
async function gql(query, variables = {}) {
  const r = await fetch(`${BASE}/api/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const d = await r.json();
  if (d.errors) throw new Error(d.errors[0].message);
  return d.data;
}

const ADD_TO_LIB = `mutation($id: Int!) {
  updateManga(input:{id:$id, patch:{inLibrary:true}}) { manga { id } }
}`;
const DOWNLOAD_CH = `mutation($id: Int!) {
  downloadChapter(input:{id:$id}) { downloadStatus { chapter { id } } }
}`;

function Spinner() {
  return <div className="spinner-wrap"><div className="spinner" /></div>;
}

function MangaCard({ manga, onClick }) {
  const thumb = manga.thumbnailUrl ? `${BASE}${manga.thumbnailUrl}` : null;
  return (
    <div className="manga-card" onClick={() => onClick(manga)}>
      <div className="manga-cover">
        {thumb
          ? <img src={thumb} alt={manga.title} loading="lazy" />
          : <div className="manga-cover-placeholder">{manga.title?.[0]}</div>}
        <div className="manga-overlay"><span className="read-btn">View</span></div>
      </div>
      <div className="manga-title">{manga.title}</div>
    </div>
  );
}

function ReaderView({ chapter, mangaId, onClose, onPrev, onNext, hasPrev, hasNext }) {
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("scroll");
  const [cur, setCur] = useState(0);

  // chapterIndex is the 0-based index within the manga (sourceOrder field)
  const chIdx = chapter.index ?? chapter.sourceOrder ?? 0;

  useEffect(() => {
    setLoading(true); setError(null); setPageCount(0); setCur(0);
    // Fetch chapter metadata to get pageCount
    rest(`/api/v1/manga/${mangaId}/chapter/${chIdx}`)
      .then(d => { setPageCount(d.pageCount ?? 0); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [mangaId, chIdx]);

  // Build page URLs: /api/v1/manga/{mangaId}/chapter/{chapterIndex}/page/{pageIndex}
  const pageUrl = (i) => `${BASE}/api/v1/manga/${mangaId}/chapter/${chIdx}/page/${i}`;
  const pages = Array.from({ length: pageCount }, (_, i) => i);

  return (
    <div className="reader-overlay">
      <div className="reader-topbar">
        <button className="icon-btn" onClick={onClose}>← Close</button>
        <div className="chapter-label">{chapter.name}</div>
        <div className="reader-controls">
          <button className={`mode-btn ${mode==="scroll"?"active":""}`} onClick={() => setMode("scroll")}>Scroll</button>
          <button className={`mode-btn ${mode==="page"?"active":""}`} onClick={() => setMode("page")}>Page</button>
        </div>
        <button className="icon-btn" onClick={onPrev} disabled={!hasPrev}>← Prev</button>
        <button className="icon-btn" onClick={onNext} disabled={!hasNext}>Next →</button>
      </div>

      <div className={`reader-body ${mode}`}>
        {loading && <Spinner />}
        {error && <div className="error-banner">Failed to load pages: {error}</div>}
        {!loading && !error && mode === "scroll" && pages.map((i) => (
          <img key={i} src={pageUrl(i)} alt={`Page ${i+1}`} className="reader-page" loading="lazy" />
        ))}
        {!loading && !error && mode === "page" && (
          <div className="paged-reader">
            <button className="page-nav left" onClick={() => setCur(c => Math.max(0, c-1))} disabled={cur===0}>‹</button>
            {pageCount > 0 && <img key={cur} src={pageUrl(cur)} alt={`Page ${cur+1}`} className="reader-page paged" />}
            <button className="page-nav right" onClick={() => setCur(c => Math.min(pages.length-1, c+1))} disabled={cur===pageCount-1}>›</button>
            <div className="page-counter">{cur+1} / {pageCount}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function MangaDetail({ manga, onBack, onReadChapter }) {
  const [full, setFull] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [added, setAdded] = useState(false);
  const [downloading, setDownloading] = useState({});

  useEffect(() => {
    setLoading(true); setError(null);
    // Fetch full manga info + chapters via REST
    Promise.all([
      rest(`/api/v1/manga/${manga.id}/`),
      rest(`/api/v1/manga/${manga.id}/chapters`),
    ]).then(([info, chData]) => {
      setFull({ ...info, chapters: Array.isArray(chData) ? chData : (chData.chapters || []) });
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  }, [manga.id]);

  const addToLibrary = async () => {
    try { await gql(ADD_TO_LIB, { id: manga.id }); setAdded(true); }
    catch { /* fallback: REST */ await fetch(`${BASE}/api/v1/manga/${manga.id}/`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({inLibrary:true}) }); setAdded(true); }
  };

  const downloadChapter = async (ch) => {
    setDownloading(d => ({ ...d, [ch.id]: true }));
    try { await fetch(`${BASE}/api/v1/download/${ch.id}`, { method: "GET" }); }
    catch {}
    setDownloading(d => ({ ...d, [ch.id]: false }));
  };

  const thumb = full?.thumbnailUrl ? `${BASE}${full.thumbnailUrl}` : (manga.thumbnailUrl ? `${BASE}${manga.thumbnailUrl}` : null);

  if (loading) return <><button className="back-btn" onClick={onBack}>← Back</button><Spinner /></>;
  if (error) return (
    <div className="detail-view">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="error-banner">Could not load manga: {error}</div>
    </div>
  );

  const chapters = (full?.chapters || []).slice().sort((a,b) => a.chapterNumber - b.chapterNumber);

  return (
    <div className="detail-view">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <div className="detail-hero">
        <div className="detail-cover">
          {thumb ? <img src={thumb} alt={full.title} /> : <div className="manga-cover-placeholder">{full.title?.[0]}</div>}
        </div>
        <div className="detail-info">
          <h1 className="detail-title">{full.title}</h1>
          {full.author && <div className="detail-author">by {full.author}</div>}
          <div className="badges">
            {full.status && <span className="badge badge-mauve">{full.status}</span>}
            {chapters.length > 0 && <span className="badge badge-peach">{chapters.length} chapters</span>}
            {full.genre?.slice(0,3).map(g => <span key={g} className="badge badge-green">{g}</span>)}
          </div>
          <p className="detail-desc">{full.description?.slice(0, 400)}{full.description?.length > 400 ? "…" : ""}</p>
          <button className={`lib-btn ${added?"added":""}`} onClick={addToLibrary}>
            {added ? "✓ In Library" : "+ Add to Library"}
          </button>
        </div>
      </div>

      <div className="chapters-section">
        <h2 className="section-heading">
          Chapters <span className="chapter-count">{chapters.length}</span>
        </h2>
        <div className="chapter-list">
          {chapters.map(ch => (
            <div key={ch.id} className="chapter-row">
              <div>
                <div className="chapter-name">{ch.name}</div>
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
          ))}
          {chapters.length === 0 && (
            <div className="chapter-row"><div className="chapter-name" style={{color:"var(--overlay0)"}}>No chapters found — try refreshing in Suwayomi's UI</div></div>
          )}
        </div>
      </div>
    </div>
  );
}


function LibraryView({ onSelectManga }) {
  const [manga, setManga] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    gql(`query { mangas(condition: { inLibrary: true }) { nodes { id title thumbnailUrl } } }`)
      .then(d => { setManga(d?.mangas?.nodes || []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

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
          {manga.map(m => <MangaCard key={m.id} manga={m} onClick={onSelectManga} />)}
        </div>
      )}
    </>
  );
}

export default function App() {
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [selectedManga, setSelectedManga] = useState(null);
  const [readerChapter, setReaderChapter] = useState(null);
  const [chapterList, setChapterList] = useState([]);
  const [view, setView] = useState("search");

  useEffect(() => {
    rest("/api/v1/source/list").then(list => {
      // filter out local source
      const srcs = (list || []).filter(s => s.id !== "0");
      setSources(srcs);
      if (srcs.length > 0) setSelectedSource(srcs[0].id);
    }).catch(() => {});
  }, []);

  const doSearch = useCallback(async () => {
    if (!query.trim() || !selectedSource) return;
    setSearching(true); setResults([]); setSearchError(null);
    try {
      // REST search endpoint: GET /api/v1/source/{sourceId}/search?searchTerm=...&pageNum=1
      const data = await rest(`/api/v1/source/${selectedSource}/search?searchTerm=${encodeURIComponent(query)}&pageNum=1`);
      setResults(data.mangaList || data || []);
    } catch (e) {
      setSearchError(e.message);
    }
    setSearching(false);
  }, [query, selectedSource]);

  const [readerMangaId, setReaderMangaId] = useState(null);
  const openReader = (ch, chapters, mId) => { setChapterList(chapters); setReaderChapter(ch); setReaderMangaId(mId); };
  const navChapter = dir => {
    const idx = chapterList.findIndex(c => c.id === readerChapter.id);
    const next = chapterList[idx + dir];
    if (next) setReaderChapter(next);
  };
  const curIdx = chapterList.findIndex(c => c?.id === readerChapter?.id);

  return (
    <>
      {readerChapter && (
        <ReaderView
          chapter={readerChapter}
          mangaId={readerMangaId}
          onClose={() => setReaderChapter(null)}
          onPrev={() => navChapter(-1)}
          onNext={() => navChapter(1)}
          hasPrev={curIdx > 0}
          hasNext={curIdx < chapterList.length - 1}
        />
      )}

      <div className="app">
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
            <button className={`nav-item ${view==="search"?"active":""}`} onClick={() => { setView("search"); setSelectedManga(null); }}>
              <span className="nav-icon">⌕</span> Search
            </button>
            <button className={`nav-item ${view==="library"?"active":""}`} onClick={() => { setView("library"); setSelectedManga(null); }}>
              <span className="nav-icon">◫</span> Library
            </button>
          </nav>

          <div className="sidebar-footer">
            <div className="source-label">Source</div>
            <select className="source-select" value={selectedSource} onChange={e => setSelectedSource(e.target.value)}>
              {sources.length === 0 && <option value="">No sources — install extensions</option>}
              {sources.map(s => (
                <option key={s.id} value={s.id}>{s.displayName || s.name} [{s.lang}]</option>
              ))}
            </select>
          </div>
        </aside>

        <main className="main">
          {selectedManga ? (
            <MangaDetail manga={selectedManga} onBack={() => setSelectedManga(null)} onReadChapter={openReader} />
          ) : view === "library" ? (
            <LibraryView onSelectManga={setSelectedManga} />
          ) : (
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

              {searchError && <div className="error-banner">Search failed: {searchError}</div>}
              {searching && <Spinner />}

              {!searching && results.length > 0 && (
                <>
                  <div className="section-title">{results.length} results</div>
                  <div className="results-grid">
                    {results.map((m, i) => <MangaCard key={m.id ?? i} manga={m} onClick={setSelectedManga} />)}
                  </div>
                </>
              )}

              {!searching && results.length === 0 && query && !searchError && (
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
          )}
        </main>
      </div>
    </>
  );
}
