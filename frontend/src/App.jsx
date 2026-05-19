import { useState, useEffect, useCallback } from "react";

const API = "/api/suwayomi";

async function gql(query, variables = {}) {
  const res = await fetch(`${API}/api/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  return data.data;
}

const SEARCH_SOURCES = `
  query SearchManga($query: String!, $sourceId: LongString!) {
    fetchSourceManga(input: { query: $query, sourceId: $sourceId, type: SEARCH, page: 1 }) {
      mangas { id title thumbnailUrl }
    }
  }
`;

const GET_SOURCES = `
  query { sources { nodes { id name iconUrl lang } } }
`;

const GET_MANGA = `
  query GetManga($id: Int!) {
    manga(id: $id) {
      id title description author status thumbnailUrl
      chapters { nodes { id name chapterNumber uploadDate } }
    }
  }
`;

const ADD_TO_LIB = `
  mutation($id: Int!) { updateManga(input: { id: $id, patch: { inLibrary: true } }) { manga { id } } }
`;

const GET_PAGES = `
  query GetPages($chapterId: Int!) {
    fetchChapterPages(input: { chapterId: $chapterId }) { pages }
  }
`;

const DOWNLOAD = `
  mutation DownloadChapter($id: Int!) { downloadChapter(input: { id: $id }) { downloadStatus { chapter { id } } } }
`;

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
      <div className="spinner" />
    </div>
  );
}

function MangaCard({ manga, onClick }) {
  const [hovered, setHovered] = useState(false);
  const thumb = manga.thumbnailUrl
    ? `${API}${manga.thumbnailUrl}`
    : null;

  return (
    <div
      className="manga-card"
      onClick={() => onClick(manga)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ transform: hovered ? "translateY(-4px)" : "translateY(0)" }}
    >
      <div className="manga-cover">
        {thumb ? (
          <img src={thumb} alt={manga.title} loading="lazy" />
        ) : (
          <div className="manga-cover-placeholder">
            <span>{manga.title?.[0]}</span>
          </div>
        )}
        <div className={`manga-overlay ${hovered ? "visible" : ""}`}>
          <span className="read-btn">View</span>
        </div>
      </div>
      <div className="manga-title">{manga.title}</div>
    </div>
  );
}

function ReaderView({ chapter, apiBase, onClose, onPrev, onNext, hasPrev, hasNext }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [mode, setMode] = useState("scroll");

  useEffect(() => {
    setLoading(true);
    setPages([]);
    setCurrentPage(0);
    gql(GET_PAGES, { chapterId: chapter.id }).then((d) => {
      setPages(d?.fetchChapterPages?.pages || []);
      setLoading(false);
    });
  }, [chapter.id]);

  return (
    <div className="reader-overlay">
      <div className="reader-topbar">
        <button className="icon-btn" onClick={onClose}>✕ Close</button>
        <div className="chapter-label">{chapter.name}</div>
        <div className="reader-controls">
          <button
            className={`mode-btn ${mode === "scroll" ? "active" : ""}`}
            onClick={() => setMode("scroll")}
          >Scroll</button>
          <button
            className={`mode-btn ${mode === "page" ? "active" : ""}`}
            onClick={() => setMode("page")}
          >Page</button>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="icon-btn" onClick={onPrev} disabled={!hasPrev}>← Prev</button>
          <button className="icon-btn" onClick={onNext} disabled={!hasNext}>Next →</button>
        </div>
      </div>

      <div className={`reader-body ${mode}`}>
        {loading ? <Spinner /> : mode === "scroll" ? (
          pages.map((p, i) => (
            <img
              key={i}
              src={`${apiBase}${p}`}
              alt={`Page ${i + 1}`}
              className="reader-page"
              loading="lazy"
            />
          ))
        ) : (
          <div className="paged-reader">
            <button className="page-nav left" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}>‹</button>
            {pages[currentPage] && (
              <img
                src={`${apiBase}${pages[currentPage]}`}
                alt={`Page ${currentPage + 1}`}
                className="reader-page paged"
              />
            )}
            <button className="page-nav right" onClick={() => setCurrentPage(p => Math.min(pages.length - 1, p + 1))} disabled={currentPage === pages.length - 1}>›</button>
            <div className="page-counter">{currentPage + 1} / {pages.length}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function MangaDetail({ manga, onBack, onReadChapter }) {
  const [full, setFull] = useState(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [downloading, setDownloading] = useState({});

  useEffect(() => {
    gql(GET_MANGA, { id: manga.id }).then((d) => {
      setFull(d?.manga);
      setLoading(false);
    });
  }, [manga.id]);

  const addToLibrary = async () => {
    await gql(ADD_TO_LIB, { id: manga.id });
    setAdded(true);
  };

  const downloadChapter = async (ch) => {
    setDownloading(d => ({ ...d, [ch.id]: true }));
    await gql(DOWNLOAD, { id: ch.id });
    setDownloading(d => ({ ...d, [ch.id]: false }));
  };

  if (loading) return <Spinner />;

  const thumb = full?.thumbnailUrl ? `${API}${full.thumbnailUrl}` : null;
  const chapters = full?.chapters?.nodes?.slice().sort((a, b) => a.chapterNumber - b.chapterNumber) || [];

  return (
    <div className="detail-view">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="detail-hero">
        <div className="detail-cover">
          {thumb ? <img src={thumb} alt={full.title} /> : <div className="manga-cover-placeholder"><span>{full.title?.[0]}</span></div>}
        </div>
        <div className="detail-info">
          <h1 className="detail-title">{full.title}</h1>
          {full.author && <div className="detail-meta">by {full.author}</div>}
          {full.status && <div className="status-badge">{full.status}</div>}
          <p className="detail-desc">{full.description?.slice(0, 300)}{full.description?.length > 300 ? "…" : ""}</p>
          <button className={`lib-btn ${added ? "added" : ""}`} onClick={addToLibrary}>
            {added ? "✓ In Library" : "+ Add to Library"}
          </button>
        </div>
      </div>

      <div className="chapters-section">
        <h2 className="section-heading">Chapters <span className="chapter-count">{chapters.length}</span></h2>
        <div className="chapter-list">
          {chapters.map((ch) => (
            <div key={ch.id} className="chapter-row">
              <div>
                <div className="chapter-name">{ch.name}</div>
                {ch.uploadDate && <div className="chapter-date">{new Date(ch.uploadDate).toLocaleDateString()}</div>}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="chapter-btn read" onClick={() => onReadChapter(ch, chapters)}>Read</button>
                <button
                  className="chapter-btn dl"
                  onClick={() => downloadChapter(ch)}
                  disabled={downloading[ch.id]}
                >
                  {downloading[ch.id] ? "…" : "↓"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("search");
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedManga, setSelectedManga] = useState(null);
  const [readerChapter, setReaderChapter] = useState(null);
  const [chapterList, setChapterList] = useState([]);

  useEffect(() => {
    gql(GET_SOURCES).then((d) => {
      const srcs = d?.sources?.nodes || [];
      setSources(srcs);
      if (srcs.length > 0) setSelectedSource(srcs[0].id);
    });
  }, []);

  const doSearch = useCallback(async () => {
    if (!query.trim() || !selectedSource) return;
    setSearching(true);
    setResults([]);
    const d = await gql(SEARCH_SOURCES, { query, sourceId: selectedSource });
    setResults(d?.fetchSourceManga?.mangas || []);
    setSearching(false);
  }, [query, selectedSource]);

  const openReader = (chapter, chapters) => {
    setChapterList(chapters);
    setReaderChapter(chapter);
  };

  const navChapter = (dir) => {
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
          apiBase={API}
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
            <span className="logo-icon">卷</span>
            <span className="logo-text">Manki</span>
          </div>
          <nav className="sidenav">
            <button className={`nav-item ${view === "search" ? "active" : ""}`} onClick={() => { setView("search"); setSelectedManga(null); }}>
              <span className="nav-icon">⌕</span> Search
            </button>
            <button className={`nav-item ${view === "library" ? "active" : ""}`} onClick={() => setView("library")}>
              <span className="nav-icon">◫</span> Library
            </button>
          </nav>
          <div className="sidebar-footer">
            <div className="source-label">Source</div>
            <select
              className="source-select"
              value={selectedSource}
              onChange={e => setSelectedSource(e.target.value)}
            >
              {sources.map(s => (
                <option key={s.id} value={s.id}>{s.name} [{s.lang}]</option>
              ))}
            </select>
          </div>
        </aside>

        <main className="main">
          {selectedManga ? (
            <MangaDetail
              manga={selectedManga}
              onBack={() => setSelectedManga(null)}
              onReadChapter={openReader}
            />
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
                  <button className="search-btn" onClick={doSearch}>Search</button>
                </div>
              </div>

              {searching && <Spinner />}

              {!searching && results.length > 0 && (
                <div className="results-grid">
                  {results.map(m => (
                    <MangaCard key={m.id} manga={m} onClick={setSelectedManga} />
                  ))}
                </div>
              )}

              {!searching && results.length === 0 && query && (
                <div className="empty-state">No results for "{query}"</div>
              )}

              {!searching && !query && (
                <div className="welcome">
                  <div className="welcome-kanji">漫画</div>
                  <p>Pick a source, search for manga, read and download.</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
