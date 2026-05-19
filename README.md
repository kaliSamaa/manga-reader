# Manki — Self-Hosted Manga Reader

A custom manga reader UI on top of Suwayomi (Tachiyomi-compatible backend).
Search thousands of sources, download chapters, read online — all from your own server.

## Stack

| Service | Role | Port |
|---------|------|------|
| `suwayomi` | Backend: sources, search, download, library | internal |
| `flaresolverr` | Bypasses Cloudflare-protected manga sites | internal |
| `frontend` | Custom React UI (your manga reader) | **3000** |

---

## Setup

### 1. Clone / copy this folder to your server

```
manga-reader/
├── docker-compose.yml
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        └── index.css
```

### 2. Start everything

```bash
docker compose up -d --build
```

First run builds the frontend image and pulls Suwayomi (~1-2 min).

### 3. Open your reader

```
http://your-server-ip:3000
```

---

## First-time Suwayomi setup (required)

Suwayomi needs extensions installed before you can search manga.

1. Open Suwayomi's own UI temporarily:

   ```bash
   # forward the port locally, or allow 4567 on your firewall temporarily
   ```

   Or access it directly if on LAN: `http://your-server-ip:4567`

2. Go to **Extensions** → install the sources you want.
   Popular picks:
   - **MangaDex** (huge, legal, multi-language)
   - **MangaPlus** (official Shonen Jump titles)
   - **Cubari** (aggregator)

3. Done — go back to `http://your-server-ip:3000` and your sources will appear in the sidebar dropdown.

---

## Usage

| Action | How |
|--------|-----|
| Search | Pick a source in sidebar, type title, press Enter |
| Read | Click a manga → pick a chapter → Read |
| Download | Click ↓ next to any chapter |
| Save to library | Click "+ Add to Library" on the manga detail page |
| Scroll / Page mode | Toggle in the reader top bar |

---

## Updating

```bash
docker compose pull suwayomi flaresolverr
docker compose up -d --build
```

---

## Data location

All manga data, downloads, and library state are stored in `./data/` on the host — persists across container restarts and updates.

---

## Troubleshooting

**Sources not showing?**
Install extensions in Suwayomi first (see First-time setup above).

**Images not loading?**
Some sites need FlareSolverr — it's already included and wired up.

**Suwayomi keeps restarting?**
Check logs: `docker compose logs suwayomi`
If it ends with `libcef.so`, the image download was corrupted — run `docker compose pull suwayomi` to re-pull.

**Change timezone:**
Edit `TZ=Asia/Jerusalem` in `docker-compose.yml` to your timezone.
