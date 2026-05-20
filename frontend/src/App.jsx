import { useState, useEffect } from "react";
import { fetchSources } from "./api.js";

import Sidebar from "./components/Sidebar.jsx";
import SettingsSheet from "./components/SettingsSheet.jsx";
import SearchView from "./components/SearchView.jsx";
import LibraryView from "./components/LibraryView.jsx";
import MangaDetail from "./components/MangaDetail.jsx";
import ReaderView from "./components/ReaderView.jsx";

export default function App() {
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState("");
  const [view, setView] = useState("search");
  const [selectedManga, setSelectedManga] = useState(null);
  const [readerChapter, setReaderChapter] = useState(null);
  const [readerMangaId, setReaderMangaId] = useState(null);
  const [chapterList, setChapterList] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem("manki-theme") || "mauve");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("manki-theme", theme);
  }, [theme]);

  useEffect(() => {
    fetchSources().then(srcs => {
      setSources(srcs);
      if (srcs.length > 0) setSelectedSource(srcs[0].id);
    }).catch(() => {});
  }, []);

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
        <SettingsSheet
          open={view === "settings"}
          onClose={() => setView("search")}
          sources={sources}
          selectedSource={selectedSource}
          setSelectedSource={setSelectedSource}
          theme={theme}
          setTheme={setTheme}
        />

        <Sidebar
          view={view} setView={setView}
          setSelectedManga={setSelectedManga}
          sources={sources}
          selectedSource={selectedSource} setSelectedSource={setSelectedSource}
          theme={theme} setTheme={setTheme}
        />

        <main className="main">
          {selectedManga ? (
            <MangaDetail
              manga={selectedManga}
              onBack={() => setSelectedManga(null)}
              onReadChapter={openReader}
            />
          ) : view === "library" ? (
            <LibraryView onSelectManga={setSelectedManga} />
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
