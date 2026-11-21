<p align="center">
  <a href="https://github.com/sickboydroid/SnapSense/releases/latest">
    <img src="assets/icon.png" alt="SnapSense" width="160" height="160" />
  </a>
</p>

<h1 align="center">SnapSense</h1>

<p align="center">
  Tray screenshot tool with AI chat, text extraction, and Google Lens — built with Electron.
</p>

<p align="center">
  <a href="https://snapsense-tawny.vercel.app/">Website</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/sickboydroid/SnapSense/releases/latest">Download latest release</a>
</p>

---

## Features

- **Capture** — Global shortcut freezes the desktop and lets you drag a region to analyze.
- **AI** — Send the capture to **Groq**, **OpenAI**, or a compatible endpoint for answers and follow-up questions.
- **Text** — AI-based text extraction from the screenshot.
- **Lens** — Open or route captures toward Google Lens workflows.

## Requirements

- **Windows** (x64), **Linux** (x86_64 AppImage), or **macOS** (Apple Silicon DMG) for running release builds.
- **Node.js** 20.19+ for development and builds.
- A **Groq API key**, **OpenAI API key**, or a local OpenAI-compatible server with a vision-capable model for AI and Text modes.

### macOS (Apple Silicon DMG)

| Topic | What to do |
|--------|------------|
| **Capture shortcut** | **⌘⌥S** — **Command + Option + S** (same idea as Win+Alt+S on Windows). The app registers this explicitly on macOS. |
| **Gatekeeper / “damaged” app** | Unsigned builds: **Right‑click the app → Open** the first time, or allow in **System Settings → Privacy & Security**. |
| **Screen Recording** | Required for `desktopCapturer`. Go to **System Settings → Privacy & Security → Screen Recording** and enable **SnapSense**, then **quit and reopen** the app. If the shortcut “does nothing” or capture never starts, this is usually the cause. |
| **Accessibility** | If the global shortcut still never fires, enable **SnapSense** under **System Settings → Privacy & Security → Accessibility** (Electron may prompt when you first run the app). |
| **Tray** | SnapSense lives in the **menu bar**. Use **Capture region** if the shortcut is blocked by another app. |
| **Install location** | Prefer dragging **SnapSense.app** into **Applications** before running (more stable than running only from the DMG mount). |

---

## Quick start (development)

```bash
npm ci
```

```bash
npm run dev
```

The app runs in the system tray / menu bar. Use the shortcut (**Win + Alt + S** on Windows, **⌘ + Option + S** on macOS) or the tray menu → **Capture region**.

Open the model settings button beside the provider selector. Choose Groq, OpenAI, or Custom API. Enter a provider key and load its model list, or type a model ID directly. For a local server such as LM Studio, enter an OpenAI-compatible base URL such as `http://localhost:1234/v1` and choose a model that accepts images. Remote custom endpoints must use HTTPS. The model list may include text-only models; those cannot analyze screenshots.

---

## Keys and model settings

Keys entered in the app are stored per provider using Electron `safeStorage` when OS encryption is available. The app does not include a shared API key in installers. For development, you can instead set `GROQ_KEY`, `OPENAI_API_KEY`, or `SNAPSENSE_CUSTOM_API_KEY` in the environment or a gitignored root `.env` file; a saved key takes precedence. Use the **Forget saved key** button to remove a saved key. A local custom endpoint may need no key.

Model IDs and the custom base URL are saved in the app's user data directory. The provider's `/models` endpoint supplies the optional model list. Manual model IDs work when a provider does not offer a model list.

---

## Building installers

The `dist` scripts run **electron-builder**. They do not require an API key at build time.

| Command | Output (under `dist/`) |
|---------|------------------------|
| `npm run dist:win` | Windows NSIS `SnapSense-Setup-<version>.exe` |
| `npm run dist:linux` | Linux `SnapSense-<version>-x86_64.AppImage` |
| `npm run dist:mac` | macOS `SnapSense-<version>-arm64.dmg` |
| `npm run dist` | Default targets from `package.json` |
| `npm run pack` | Unpacked app dir for quick testing |

Use **`*:local`** variants (`dist:win:local`, etc.) to build **without** publishing to GitHub (adds `--publish never`).

After a full multi-target build, `scripts/prune-release-artifacts.js` keeps primary installers (`.exe`, `.dmg`, `.AppImage`) and removes extra side files in `dist/` before upload.

---

## Releases (tags & CI)

- Pushing a **git tag** matching `*` triggers **Build Release** on Ubuntu, Windows, and macOS runners.
- Each job runs the matching `npm run dist:*`, publishes installers to that tag’s **GitHub Release** (via electron-builder + `GH_TOKEN`), and uploads `dist/**` as workflow artifacts for backup.

---

## Frontend (marketing site)

The `frontend/` folder is a separate Vite + React landing page. See `frontend/package.json` for `dev` / `build` scripts.

---

## Project layout

| Path | Role |
|------|------|
| `src/main.js` | Electron main: tray, shortcuts, capture & panel windows |
| `src/aiClient.js` | AI provider selection, settings, and requests |
| `src/panel/` | Results UI (AI / text / Lens) |
| `src/capture/` | Full-screen selection overlay |
| `config/` | Default AI prompts and settings packaged with the app |
| `src/secureCredentials.js` | Saves provider keys through Electron `safeStorage` |
| `scripts/prune-release-artifacts.js` | Post-build cleanup of `dist/` for releases |
| `.github/workflows/release.yml` | Tagged release builds + publish |
| `assets/` | Icons for the app and docs |
| `frontend/` | Marketing website |

For the process and window flow, see [Architecture](docs/ARCHITECTURE.md).

---

## License

Copyright © SnapSense. All rights reserved. *(Update this section when you choose a license.)*
