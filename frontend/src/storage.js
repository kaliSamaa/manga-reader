const progressKey = (mangaId) => `manki-progress-${mangaId}`;

export function getProgress(mangaId) {
  try { return JSON.parse(localStorage.getItem(progressKey(mangaId))); }
  catch { return null; }
}

export function saveProgress(mangaId, data) {
  localStorage.setItem(progressKey(mangaId), JSON.stringify({ ...data, timestamp: Date.now() }));
}
