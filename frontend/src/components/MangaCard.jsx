import { thumbUrl } from "../api.js";

export default function MangaCard({ manga, onClick, progress }) {
  const thumb = thumbUrl(manga.thumbnailUrl);

  return (
    <div className="manga-card" onClick={() => onClick(manga)}>
      <div className="manga-cover">
        {thumb
          ? <img src={thumb} alt={manga.title} loading="lazy" />
          : <div className="manga-cover-placeholder">{manga.title?.[0]}</div>}
        <div className="manga-overlay"><span className="read-btn">View</span></div>
        {progress && (
          <div className="progress-bar-wrap">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.round((progress.page / Math.max(progress.pageCount - 1, 1)) * 100)}%` }}
            />
          </div>
        )}
      </div>
      <div className="manga-title">{manga.title}</div>
      {progress && (
        <div className="manga-progress-label">Ch. {progress.chapterNumber ?? "?"}</div>
      )}
    </div>
  );
}
