<p align="center">
  <a href="https://github.com/sickboydroid/SnapSense/releases/download/V1/SnapSense.exe">
    <img src="assets/icon.svg" alt="SnapSense" width="160" height="160" />
  </a>
</p>

<h1 align="center">SnapSense</h1>

<p align="center">
  Tray screenshot tool for Windows with AI chat, text extraction, and Google Lens — built with Electron.
</p>

<p align="center">
  <a href="https://www.example.com/snapsense">Website</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/sickboydroid/SnapSense/releases/download/V1/SnapSense.exe">Download EXE Now!!</a>
</p>

---

## Features

- **Capture** — Global shortcut freezes the desktop and lets you drag a region to analyze.
- **AI** — Send the capture to **Groq** for chat-style answers and follow-up questions.
- **Text** — OCR-style extraction from the screenshot.
- **Lens** — Open or route captures toward Google Lens workflows.

## Requirements

- **Windows** (x64), **Node.js** 18+ for development and builds.
- A **Groq API key** ([Groq Console](https://console.groq.com/)) for live AI (not needed for **Test** mode).

## Quick start (development)

```bash
npm install
```

Create a `.env` file in the project root:

```env
GROQ_KEY=your_groq_api_key_here
```

```bash
npm run dev
```

The app runs in the system tray. Use the shortcut configured in the app (see tray tooltip) to start a capture.

## Building a Windows installer

1. Put `GROQ_KEY` in `.env` (used only during the bake step for the packaged app).
2. Run:

```bash
npm run dist
```

Output: `dist/SnapSense-Setup-<version>.exe` (NSIS installer).  
`npm run pack` produces an unpacked folder under `dist/` for testing without an installer.

The build scripts generate a temporary baked key file from `.env`, then remove it after packaging — do not commit secrets.

## Project layout

| Path | Role |
|------|------|
| `src/main.js` | Electron main: tray, shortcuts, capture & panel windows |
| `src/panel/` | Results UI (AI / text / Lens) |
| `src/capture/` | Full-screen selection overlay |
| `assets/` | `icon.png` / `icon.svg` for UI and docs |

## License

Copyright © SnapSense. All rights reserved. *(Update this section when you choose a license.)*
