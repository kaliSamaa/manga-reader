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

export async function fetchManga(mangaId) {
  const [info, chData] = await Promise.all([
    rest(`/api/v1/manga/${mangaId}/`),
    rest(`/api/v1/manga/${mangaId}/chapters`),
  ]);
  return {
    ...info,
    chapters: Array.isArray(chData) ? chData : chData.chapters || [],
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
