export async function hashPassword(password) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(password)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const USERS_KEY = "manki-users";
const SESSION_KEY = "manki-session";
const progressKey = (username, mangaId) =>
  `manki-progress-${username}-${mangaId}`;

// User shape: { username, passwordHash, isAdmin, createdAt }

export function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function hasAnyUser() {
  return getUsers().length > 0;
}

export async function createUser(username, password, isAdmin = false) {
  const users = getUsers();
  if (users.find((u) => u.username === username)) {
    throw new Error("Username already exists");
  }
  const passwordHash = await hashPassword(password);
  users.push({ username, passwordHash, isAdmin, createdAt: Date.now() });
  saveUsers(users);
}

export async function verifyUser(username, password) {
  const users = getUsers();
  const user = users.find((u) => u.username === username);
  if (!user) return null;
  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) return null;
  return user;
}

export function deleteUser(username) {
  const users = getUsers().filter((u) => u.username !== username);
  saveUsers(users);
  // clean up their progress keys
  Object.keys(localStorage)
    .filter((k) => k.startsWith(`manki-progress-${username}-`))
    .forEach((k) => localStorage.removeItem(k));
}

export async function changePassword(username, newPassword) {
  const users = getUsers();
  const user = users.find((u) => u.username === username);
  if (!user) throw new Error("User not found");
  user.passwordHash = await hashPassword(newPassword);
  saveUsers(users);
}

// Session shape: { username, isAdmin }

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function saveSession(user) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ username: user.username, isAdmin: user.isAdmin })
  );
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// Progress shape: { chapterId, chapterName, chapterNumber, page, pageCount, timestamp }

export function getProgress(username, mangaId) {
  try {
    return JSON.parse(localStorage.getItem(progressKey(username, mangaId)));
  } catch {
    return null;
  }
}

export function saveProgress(username, mangaId, data) {
  localStorage.setItem(
    progressKey(username, mangaId),
    JSON.stringify({ ...data, timestamp: Date.now() })
  );
}

export function clearProgress(username, mangaId) {
  localStorage.removeItem(progressKey(username, mangaId));
}

// Returns all progress entries for a user, sorted newest first
export function getAllProgress(username) {
  const prefix = `manki-progress-${username}-`;
  return Object.keys(localStorage)
    .filter((k) => k.startsWith(prefix))
    .map((k) => {
      const mangaId = k.slice(prefix.length);
      return { mangaId: Number(mangaId), ...JSON.parse(localStorage.getItem(k)) };
    })
    .sort((a, b) => b.timestamp - a.timestamp);
}
