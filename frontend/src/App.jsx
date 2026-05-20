import { useState, useEffect } from "react";
import { getSession, saveSession } from "./storage.js";
import { fetchSources } from "./api.js";

import Login from "./components/Login.jsx";
import Sidebar from "./components/Sidebar.jsx";
import SettingsSheet from "./components/SettingsSheet.jsx";
import SearchView from "./components/SearchView.jsx";
import LibraryView from "./components/LibraryView.jsx";
import MangaDetail from "./components/MangaDetail.jsx";
import ReaderView from "./components/ReaderView.jsx";
import UsersView from "./components/UsersView.jsx";

export default function App() {
  const [session, setSession] = useState(() => getSession());
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState("");
  const [view, setView] = useState("search");
  const [selectedManga, setSelectedManga] = useState(null);
  const [readerChapter, setReaderChapter] = useState(null);
  const [readerMangaId, setReaderMangaId] = useState(null);
  const [chapterList, setChapterList] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem("manki-theme") || "mauve");

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("manki-theme", theme);
  }, [theme]);

  // Sources
  useEffect(() => {
    if (!session) return;
    fetchSources().then(srcs => {
      setSources(srcs);
      if (srcs.length > 0) setSelectedSource(srcs[0].id);
    }).catch(() => {});
  }, [session]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  if (!session) {
    return <Login onLogin={(user) => { saveSession(user); setSession(user); }} />;
  }

  // ── Reader ─────────────────────────────────────────────────────────────────
  const openReader = (ch, chapters, mangaId) => {
    setChapterList(chapters);
    setReaderChapter(ch);
    setReaderMangaId(mangaId);
  };
  const navChapter = (dir) => {
    const idx = chapterList.findIndex(c => c.id === readerChapter.id);
    const next = chapterList[idx + dir];
    if (next) setReaderChapter(next);
  };
  const curIdx = chapterList.findIndex(c => c?.id === readerChapter?.id);

  // ── Shared nav props ───────────────────────────────────────────────────────
  const sidebarProps = {
    view, setView,
    setSelectedManga,
    session,
    sources, selectedSource, setSelectedSource,
    theme, setTheme,
  };

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
          username={session.username}
        />
      )}

      <div className="app">
        {/* Mobile settings sheet */}
        <SettingsSheet
          open={view === "settings"}
          onClose={() => setView("search")}
          sources={sources}
          selectedSource={selectedSource}
          setSelectedSource={setSelectedSource}
          theme={theme}
          setTheme={setTheme}
        />

        <Sidebar {...sidebarProps} />

        <main className="main">
          {selectedManga ? (
            <MangaDetail
              manga={selectedManga}
              onBack={() => setSelectedManga(null)}
              onReadChapter={openReader}
              username={session.username}
            />
          ) : view === "library" ? (
            <LibraryView
              onSelectManga={setSelectedManga}
              username={session.username}
            />
          ) : view === "users" && session.isAdmin ? (
            <UsersView session={session} />
          ) : (
            <SearchView
              selectedSource={selectedSource}
              onSelectManga={setSelectedManga}
            />
          )}
        </main>
      </div>
    </>
  );
}
