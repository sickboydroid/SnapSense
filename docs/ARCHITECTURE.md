# SnapSense architecture

SnapSense has an Electron desktop app and a separate React landing page in `frontend/`. The desktop app does not depend on the landing page at runtime.

## Desktop app

`src/main.js` owns the tray, global shortcut, window lifecycle, desktop source selection, API calls, and external links. `src/preload.js` exposes the IPC methods used by the renderer pages. The pages have context isolation enabled and no direct Node integration.

On Linux, `src/launcher/` provides a visible Capture button when a desktop does not display tray icons. A second invocation with `--capture` sends the request to the running instance through Electron's single-instance lock; GNOME Wayland can bind that command in its keyboard settings. The launcher is hidden before the screenshot frame is frozen and shown again after cancellation or closing the result panel.

The normal capture path is:

1. The shortcut or tray action starts a capture flow and closes any existing result panel.
2. The main process finds the primary display's desktop source and opens `src/capture/index.html` plus the small mode strip in `src/mode-strip/`.
3. The capture renderer takes one screen frame, dims it, and maps pointer coordinates to the native frame resolution. The mode strip appears after the frame is frozen so it does not enter the screenshot. A drag creates a PNG crop. Esc cancels the flow.
4. The main process closes capture windows and opens `src/panel/index.html` with the selected mode and crop.
5. AI and Text modes call `src/aiClient.js` through IPC. Text mode uses an AI extraction prompt; it is not a local OCR engine. Lens mode uploads the image to Google Lens and can fall back to the browser with the crop copied to the clipboard.

The panel can request another region for an AI follow-up. In that path, the panel is hidden while capture runs, then shown again when the crop arrives or capture is cancelled. A generation counter prevents older capture requests from opening stale windows.

## AI settings and data

`src/aiClient.js` selects Groq, OpenAI, or a custom OpenAI-compatible endpoint and reads defaults from `config/`. Writable preferences live in Electron's `userData` directory. Provider keys entered in the app are stored separately through Electron `safeStorage` in `src/secureCredentials.js`; saved keys take precedence over environment values. The app can fetch model IDs from a provider's `/models` endpoint or accept a manually entered ID. Remote custom endpoints require HTTPS; HTTP is allowed for loopback addresses.

AI and Text mode send the selected image and relevant conversation to the configured provider. Lens mode sends the selected image to Google. The app does not persist screenshots or chat history. The selected crop stays in renderer memory while the panel is open.

## Build layout

The root `package.json` builds desktop installers through electron-builder. `frontend/package.json` builds the Vite site independently. Tagged releases run `.github/workflows/release.yml` for Windows, Linux, and macOS. The desktop package includes `src/`, `assets/`, and `config/`; the landing page is not bundled into the app.

## Known boundaries

- Capture currently targets the primary display.
- Desktop capture depends on platform screen recording permissions.
- Voice input is present as a disabled control.
- AI and Text modes need a vision-capable model. Provider model lists can also contain text-only models.
