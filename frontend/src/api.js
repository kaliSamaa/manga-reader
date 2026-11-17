const BASE = "/api/suwayomi";

export async function rest(path) {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function gql(query, variables = {}) {
  const r = await fetch(`${BASE}/api/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const d = await r.json();
  if (d.errors) throw new Error(d.errors[0].message);
  return d.data;
}

export const ADD_TO_LIB = `mutation($id: Int!) {
  updateManga(input:{id:$id, patch:{inLibrary:true}}) { manga { id } }
}`;

export const REMOVE_FROM_LIB = `mutation($id: Int!) {
  updateManga(input:{id:$id, patch:{inLibrary:false}}) { manga { id } }
}`;

export const thumbUrl = (url) => (url ? `${BASE}${url}` : null);

export async function fetchSources() {
  const list = await rest("/api/v1/source/list");
  return (list || []).filter((s) => s.id !== "0");
}

export async function searchSource(sourceId, query) {
  const data = await rest(
    `/api/v1/source/${sourceId}/search?searchTerm=${encodeURIComponent(query)}&pageNum=1`
  );
  return data.mangaList || data || [];
}

const MANGA_QUERY = `
  query($id: Int!) {
    manga(id: $id) {
      id title description author status thumbnailUrl inLibrary genre initialized
      chapters {
        nodes { id name isDownloaded chapterNumber uploadDate sourceOrder }
      }
    }
  }
`;

export async function fetchManga(mangaId) {
  let manga = (await gql(MANGA_QUERY, { id: mangaId })).manga;
  // Search results are stubs: details and chapters only exist in Suwayomi's DB
  // after they've been fetched from the source once, so fetch them online.
  const needDetails = !manga.initialized;
  const needChapters = !manga.chapters?.nodes?.length;
  if (needDetails || needChapters) {
    await Promise.all([
      needDetails && rest(`/api/v1/manga/${mangaId}/?onlineFetch=true`).catch(() => {}),
      needChapters && rest(`/api/v1/manga/${mangaId}/chapters?onlineFetch=true`).catch(() => {}),
    ]);
    manga = (await gql(MANGA_QUERY, { id: mangaId })).manga;
  }
  return {
    ...manga,
    chapters: manga.chapters?.nodes || [],
  };
}

export async function fetchLibrary() {
  const d = await gql(
    `query { mangas(condition: { inLibrary: true }) { nodes { id title thumbnailUrl } } }`
  );
  return d?.mangas?.nodes || [];
}

export async function fetchChapterMeta(mangaId, chapterIndex) {
  return rest(`/api/v1/manga/${mangaId}/chapter/${chapterIndex}`);
}

export function pageUrl(mangaId, chapterIndex, pageIndex) {
  return `${BASE}/api/v1/manga/${mangaId}/chapter/${chapterIndex}/page/${pageIndex}`;
}

// Enqueue chapter + start the downloader, then poll until isDownloaded
export async function downloadChapter(chapterId) {
  // 1. Add to download queue
  await gql(
    `mutation($id: Int!) { enqueueChapterDownload(input: { id: $id }) { downloadStatus { state } } }`,
    { id: chapterId }
  );
  // 2. Make sure the downloader is running
  await gql(`mutation { startDownloader { downloadStatus { state } } }`).catch(() => {});
  // 3. Poll until isDownloaded (max 120s)
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const d = await gql(
      `query($id: Int!) { chapter(id: $id) { isDownloaded } }`,
      { id: chapterId }
    );
    if (d?.chapter?.isDownloaded) return;
  }
  throw new Error("Timed out — check the Downloads tab in Suwayomi");
}
