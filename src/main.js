const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  globalShortcut,
  ipcMain,
  nativeImage,
  screen,
  desktopCapturer,
  session,
  shell,
  clipboard,
  systemPreferences,
  dialog
} = require('electron');
const https = require('https');
const path = require('path');
const fs = require('fs');
const log = require('./logger');
const {
  getAiKeyStatus,
  getPrompt,
  requestAi,
  setModelMode,
  getModelSettings,
  setModelConfig,
  listAvailableModels,
  getStealthMode,
  setStealthMode
} = require('./aiClient');
const { setProviderApiKey } = require('./secureCredentials');

const CAPTURE_PRELOAD = path.join(__dirname, 'preload.js');
const PANEL_PRELOAD = path.join(__dirname, 'preload.js');
const CAPTURE_HTML = path.join(__dirname, 'capture', 'index.html');
const PANEL_HTML = path.join(__dirname, 'panel', 'index.html');
const MODE_STRIP_HTML = path.join(__dirname, 'mode-strip', 'index.html');

function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return;
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
    log.info('main', 'Loaded environment from .env');
  } catch (e) {
    log.warn('main', 'Failed to load .env', { message: e.message });
  }
}

loadEnvFile();

const ASSETS_ROOT = path.join(__dirname, '..', 'assets');

/** First successful globalShortcut accelerator for region capture (platform-specific). */
let registeredCaptureAccelerator = null;
let macScreenRecordingHelpShown = false;

function logMissingUiAssets() {
  const interPath = path.join(ASSETS_ROOT, 'fonts', 'Inter.ttf');
  if (!fs.existsSync(interPath)) {
    const msg = `[SnapSense] UI font not found (expected: ${interPath}). Using system fonts.`;
    console.warn(msg);
    log.warn('main', 'Inter.ttf missing — using system UI font', { path: interPath });
  }
  const monoTtf = path.join(ASSETS_ROOT, 'fonts', 'JetBrainsMono.ttf');
  const monoWoff2 = path.join(ASSETS_ROOT, 'fonts', 'JetBrainsMono.woff2');
  if (!fs.existsSync(monoTtf) && !fs.existsSync(monoWoff2)) {
    log.debug('main', 'JetBrains Mono not found (optional .ttf or .woff2)', {
      monoTtf,
      monoWoff2
    });
  }
  const iconNames = [
    'app-mark.svg',
    'mode-ai.svg',
    'mode-text.svg',
    'mode-lens.svg',
    'model-sliders.svg',
    'close.svg',
    'send.svg',
    'copy.svg',
    'external-link.svg'
  ];
  const iconsDir = path.join(ASSETS_ROOT, 'icons');
  for (const name of iconNames) {
    const p = path.join(iconsDir, name);
    if (!fs.existsSync(p)) {
      console.warn(`[SnapSense] Icon missing: ${p}`);
      log.warn('main', 'Icon file missing', { path: p });
    }
  }
}

let tray = null;
let captureWin = null;
let modeStripWin = null;
let panelWin = null;
let captureFrameReady = false;
let modeStripReady = false;
/** Whether stealth mode is currently active. */
let stealthActive = false;
/** Mode chosen in floating strip during active capture */
let captureSessionMode = 'ai';
let captureEscapeShortcutRegistered = false;
/** Incremented on each capture start so stale async work cannot open duplicate windows */
let captureFlowGeneration = 0;
/** True while panel requested a region capture for chat follow-up (panel hidden, not destroyed). */
let followUpCapturePending = false;
/** One GET to google.com so CONSENT / cookies exist before Lens POST (Chromium fetch only). */
let googleLensSessionPrimed = false;

/** Same partition as the panel Lens <webview> so upload cookies match embedded navigation. */
const LENS_WEBVIEW_PARTITION = 'persist:snapsense-lens';

function lensFetch(input, init) {
  return session.fromPartition(LENS_WEBVIEW_PARTITION).fetch(input, init);
}

function unregisterCaptureEscapeShortcut() {
  if (captureEscapeShortcutRegistered) {
    globalShortcut.unregister('Escape');
    captureEscapeShortcutRegistered = false;
  }
}

function registerCaptureEscapeShortcut() {
  unregisterCaptureEscapeShortcut();
  const ok = globalShortcut.register('Escape', () => {
    if (!captureWin || captureWin.isDestroyed()) return;
    log.info('main', 'Escape — cancel capture');
    cancelCaptureFlow();
  });
  captureEscapeShortcutRegistered = Boolean(ok);
  if (!ok) {
    log.warn('main', 'Could not register Escape to cancel capture (focus may stay on mode bar)');
  }
}

function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') {
    throw new Error('Image payload is missing.');
  }
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error('Invalid image payload format.');
  }
  const mime = match[1] || 'image/png';
  const buffer = Buffer.from(match[2], 'base64');
  return { mime, buffer };
}

const LENS_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function lensGetHeaders() {
  return {
    'User-Agent': LENS_UA,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Dest': 'document'
  };
}

/** Origin/Referer must match the host you POST to, or Google may reject the upload. */
function lensPostHeaders(endpointUrl) {
  let origin;
  let referer;
  try {
    const u = new URL(endpointUrl);
    if (u.hostname === 'lens.google.com') {
      origin = 'https://lens.google.com';
      referer = 'https://lens.google.com/';
    } else if (u.hostname === 'images.google.com') {
      origin = 'https://images.google.com';
      referer = 'https://images.google.com/imghp';
    } else {
      origin = 'https://www.google.com';
      referer = 'https://www.google.com/imghp';
    }
  } catch {
    origin = 'https://www.google.com';
    referer = 'https://www.google.com/imghp';
  }
  return {
    'User-Agent': LENS_UA,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    Origin: origin,
    Referer: referer,
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Dest': 'document'
  };
}

function locationToAbsoluteUrl(loc, base) {
  if (!loc) return '';
  if (/^https?:\/\//i.test(loc)) return loc;
  try {
    return new URL(loc, base).toString();
  } catch {
    return '';
  }
}

/**
 * When Google returns 200 HTML instead of a redirect header, try to recover the results URL.
 */
function extractUrlFromGoogleLensHtml(html) {
  if (!html || typeof html !== 'string') return '';
  const candidates = [
    /content=["']0;\s*url=([^"'>\s]+)/i,
    /http-equiv=["']refresh["'][^>]+content=["'][^;]*;\s*url=([^"'>\s]+)/i,
    /(?:location|replace)\s*\(\s*["'](https?:[^"']+)/i,
    /href=["'](https:\/\/www\.google\.com\/search[^"'#]*)/i,
    /href=["'](https:\/\/lens\.google\.com\/[^"'#]+)/i,
    /"(https:\/\/www\.google\.com\/url\?[^"]+)"/i,
    /url:\s*"(https:\/\/www\.google\.com\/search[^"]+)"/i
  ];
  for (const re of candidates) {
    const m = re.exec(html);
    if (m && m[1]) {
      let u = m[1].replace(/&amp;/g, '&').trim();
      if (/^https?:\/\//i.test(u)) {
        return u;
      }
    }
  }
  return '';
}

/**
 * JPEG re-encode for smaller multipart uploads (faster than huge PNGs for Lens).
 */
function bufferForLensUpload(mime, buffer) {
  try {
    const ni = nativeImage.createFromBuffer(buffer);
    if (ni.isEmpty()) {
      const ext = mime.includes('jpeg') ? 'jpg' : 'png';
      return { mime, buffer, filename: `capture.${ext}` };
    }
    const jpeg = ni.toJPEG(86);
    return {
      mime: 'image/jpeg',
      buffer: Buffer.from(jpeg),
      filename: 'capture.jpg'
    };
  } catch (e) {
    log.debug('main', 'Lens JPEG encode skipped', { message: e.message });
    const ext = mime.includes('jpeg') ? 'jpg' : 'png';
    return { mime, buffer, filename: `capture.${ext}` };
  }
}

/**
 * Chromium session.fetch + FormData/Blob in the main process often returns
 * net::ERR_INVALID_ARGUMENT; a raw multipart Buffer avoids that.
 */
function buildLensMultipartBody(fieldName, fileBuffer, fileMime, filename) {
  const safeName = String(filename || 'capture.jpg').replace(/["\r\n]/g, '');
  const safeField = String(fieldName || 'encoded_image').replace(/["\r\n]/g, '');
  const boundary = `----SnapSense${Date.now().toString(36)}${Math.random().toString(36).slice(2, 11)}`;
  const crlf = '\r\n';
  const head = Buffer.from(
    `--${boundary}${crlf}Content-Disposition: form-data; name="${safeField}"; filename="${safeName}"${crlf}Content-Type: ${fileMime}${crlf}${crlf}`,
    'utf8'
  );
  const tail = Buffer.from(
    `${crlf}--${boundary}${crlf}Content-Disposition: form-data; name="hl"${crlf}${crlf}en-US${crlf}--${boundary}--${crlf}`,
    'utf8'
  );
  return {
    body: Buffer.concat([head, fileBuffer, tail]),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

function incomingHttpHeader(headers, name) {
  const want = name.toLowerCase();
  const key = Object.keys(headers).find((h) => h.toLowerCase() === want);
  if (!key) return null;
  const v = headers[key];
  return Array.isArray(v) ? v[0] : v;
}

/** No Sec-Fetch-* headers — Chromium fetch rejects this upload with ERR_INVALID_ARGUMENT. */
function lensNodeUploadHeaders(postUrl) {
  let origin;
  let referer;
  try {
    const u = new URL(postUrl);
    if (u.hostname === 'lens.google.com') {
      origin = 'https://lens.google.com';
      referer = 'https://lens.google.com/';
    } else if (u.hostname === 'images.google.com') {
      origin = 'https://images.google.com';
      referer = 'https://images.google.com/imghp';
    } else {
      origin = 'https://www.google.com';
      referer = 'https://www.google.com/imghp';
    }
  } catch {
    origin = 'https://www.google.com';
    referer = 'https://www.google.com/imghp';
  }
  return {
    'User-Agent': LENS_UA,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    Origin: origin,
    Referer: referer
  };
}

async function buildLensCookieHeader(postUrl) {
  const ses = session.fromPartition(LENS_WEBVIEW_PARTITION);
  const u = new URL(postUrl);
  const urls = [
    `${u.protocol}//${u.host}`,
    'https://www.google.com',
    'https://google.com',
    'https://images.google.com'
  ];
  const map = new Map();
  for (const url of urls) {
    try {
      const list = await ses.cookies.get({ url });
      for (const c of list) {
        map.set(c.name, c.value);
      }
    } catch {
      /* ignore */
    }
  }
  if (!map.size) return '';
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function httpsRawRequest(method, urlString, bodyBuffer, headerObj, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }
    const u = new URL(urlString);
    const headers = { ...headerObj };
    if (bodyBuffer != null && method !== 'GET' && method !== 'HEAD') {
      headers['Content-Length'] = String(bodyBuffer.length);
    }
    const opts = {
      hostname: u.hostname,
      port: u.port || 443,
      path: `${u.pathname}${u.search}`,
      method,
      headers
    };
    let onAbort;
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        if (onAbort && signal) signal.removeEventListener('abort', onAbort);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks)
        });
      });
    });
    if (signal) {
      onAbort = () => {
        req.destroy();
        reject(new Error('Aborted'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }
    req.on('error', (err) => {
      if (onAbort && signal) signal.removeEventListener('abort', onAbort);
      reject(err);
    });
    if (bodyBuffer) req.write(bodyBuffer);
    req.end();
  });
}

function wrapLensNodeResponse(currentUrl, raw) {
  const hdrs = raw.headers;
  return {
    status: raw.statusCode,
    ok: raw.statusCode >= 200 && raw.statusCode < 300,
    url: currentUrl,
    headers: {
      get(n) {
        return incomingHttpHeader(hdrs, n);
      }
    },
    async text() {
      return raw.body.toString('utf8');
    }
  };
}

async function lensUploadPostNode(postUrl, fieldName, fileBuffer, fileMime, filename, signal) {
  const { body, contentType } = buildLensMultipartBody(fieldName, fileBuffer, fileMime, filename);
  const cookieHeader = await buildLensCookieHeader(postUrl);
  const headers = {
    ...lensNodeUploadHeaders(postUrl),
    'Content-Type': contentType,
    ...(cookieHeader ? { Cookie: cookieHeader } : {})
  };
  const raw = await httpsRawRequest('POST', postUrl, body, headers, signal);
  return wrapLensNodeResponse(postUrl, raw);
}

async function lensUploadPostFollowNode(
  postUrl,
  fieldName,
  fileBuffer,
  fileMime,
  filename,
  signal
) {
  const { body, contentType } = buildLensMultipartBody(fieldName, fileBuffer, fileMime, filename);
  const cookieHeader = await buildLensCookieHeader(postUrl);

  async function one(method, url, reqBody, extra = {}) {
    const headers = {
      ...lensNodeUploadHeaders(url),
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...extra
    };
    const raw = await httpsRawRequest(method, url, reqBody, headers, signal);
    return { raw, url };
  }

  let currentUrl = postUrl;
  let { raw } = await one('POST', currentUrl, body, { 'Content-Type': contentType });

  for (let hop = 0; hop < 16; hop++) {
    if (raw.statusCode >= 300 && raw.statusCode < 400) {
      const loc = incomingHttpHeader(raw.headers, 'location');
      if (!loc) break;
      const next = locationToAbsoluteUrl(loc, currentUrl);
      if (!next || !/^https?:\/\//i.test(next)) break;
      currentUrl = next;
      ({ raw } = await one('GET', currentUrl, null));
      continue;
    }
    return wrapLensNodeResponse(currentUrl, raw);
  }
  return wrapLensNodeResponse(currentUrl, raw);
}

async function primeGoogleLensSession() {
  if (googleLensSessionPrimed) return;
  const ac = new AbortController();
  const tid = setTimeout(() => ac.abort(), 8000);
  const h = lensGetHeaders();
  try {
    await Promise.allSettled([
      lensFetch('https://www.google.com/', {
        method: 'GET',
        redirect: 'follow',
        signal: ac.signal,
        headers: h
      }),
      lensFetch('https://images.google.com/', {
        method: 'GET',
        redirect: 'follow',
        signal: ac.signal,
        headers: h
      }),
      lensFetch('https://lens.google.com/', {
        method: 'GET',
        redirect: 'follow',
        signal: ac.signal,
        headers: h
      })
    ]);
    log.debug('main', 'Google / Lens session primed for upload');
  } catch (e) {
    log.debug('main', 'Session prime skipped', { message: e.message });
  } finally {
    clearTimeout(tid);
    googleLensSessionPrimed = true;
  }
}

async function uploadImageToLens(imageDataUrl) {
  const parsed = parseDataUrl(imageDataUrl);
  const { mime, buffer, filename } = bufferForLensUpload(parsed.mime, parsed.buffer);

  await primeGoogleLensSession();

  /**
   * www.google.com/searchbyimage/upload + encoded_image reliably returns 302;
   * images.google.com often returns 400 for the same multipart from Node.
   */
  const endpoints = [
    'https://www.google.com/searchbyimage/upload',
    'https://images.google.com/searchbyimage/upload'
  ];

  const fileFieldNames = ['encoded_image', 'image', 'file'];

  const requestTimeoutMs = 28000;

  const postManual = async (postUrl, fieldName) => {
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), requestTimeoutMs);
    try {
      const res = await lensUploadPostNode(postUrl, fieldName, buffer, mime, filename, ac.signal);
      log.debug('main', 'Lens POST manual', {
        status: res.status,
        ep: postUrl,
        field: fieldName
      });
      const loc = res.headers.get('location');
      if (loc) {
        const out = locationToAbsoluteUrl(loc, postUrl);
        if (out && /^https?:\/\//i.test(out)) {
          return out;
        }
      }
      if (res.status >= 300 && res.status < 400) {
        const l = res.headers.get('location');
        if (l) {
          const out = locationToAbsoluteUrl(l, postUrl);
          if (out && /^https?:\/\//i.test(out)) {
            return out;
          }
        }
      }
      if (res.ok && res.url) {
        const u = res.url;
        if (/google\.com\/search|tbs=sbi|\/imgres/i.test(u)) {
          return u;
        }
      }
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (res.ok && ct.includes('text/html')) {
        const html = await res.text();
        const extracted = extractUrlFromGoogleLensHtml(html);
        if (extracted) {
          const out = locationToAbsoluteUrl(extracted, postUrl);
          if (out && /^https?:\/\//i.test(out)) {
            return out;
          }
        }
      }
      if (res.status === 400) {
        try {
          const snip = (await res.text()).slice(0, 220).replace(/\s+/g, ' ');
          if (snip) {
            log.debug('main', 'Lens upload 400', { ep: postUrl, field: fieldName, snip });
          }
        } catch {
          /* ignore */
        }
      }
    } finally {
      clearTimeout(tid);
    }
    return '';
  };

  const postFollow = async (postUrl, fieldName) => {
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), requestTimeoutMs);
    try {
      const res = await lensUploadPostFollowNode(
        postUrl,
        fieldName,
        buffer,
        mime,
        filename,
        ac.signal
      );
      if (!res.ok) {
        log.debug('main', 'Lens POST follow not ok', {
          status: res.status,
          url: postUrl,
          field: fieldName
        });
        return '';
      }
      const finalUrl = res.url || '';
      if (!finalUrl || !/^https?:\/\//i.test(finalUrl)) {
        return '';
      }
      const pathOnly = finalUrl.split('?')[0];
      if (/\/searchbyimage\/upload\/?$/i.test(pathOnly)) {
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('text/html')) {
          const html = await res.text();
          const extracted = extractUrlFromGoogleLensHtml(html);
          if (extracted) {
            const out = locationToAbsoluteUrl(extracted, postUrl);
            if (out && /^https?:\/\//i.test(out)) {
              return out;
            }
          }
        }
        return '';
      }
      return finalUrl;
    } finally {
      clearTimeout(tid);
    }
  };

  for (const ep of endpoints) {
    for (const field of fileFieldNames) {
      try {
        const u = await postManual(ep, field);
        if (u) {
          log.info('main', 'Lens upload OK (redirect)', { url: u.slice(0, 140) });
          return u;
        }
      } catch (e) {
        log.warn('main', 'Lens manual POST failed', { ep, field, message: e.message });
      }
    }
  }

  for (const ep of endpoints) {
    for (const field of fileFieldNames) {
      try {
        const u = await postFollow(ep, field);
        if (u) {
          log.info('main', 'Lens upload OK (follow)', { url: u.slice(0, 140) });
          return u;
        }
      } catch (e) {
        log.warn('main', 'Lens follow POST failed', { ep, field, message: e.message });
      }
    }
  }

  log.error('main', 'Google Lens upload failed (all attempts)');
  throw new Error('Failed to upload image to Google Lens.');
}

function appIconPath() {
  return path.join(ASSETS_ROOT, 'icon.png');
}

function trayIconPath() {
  return appIconPath();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestMacAccessibilityTrust() {
  if (process.platform !== 'darwin') return;
  try {
    const trusted = systemPreferences.isTrustedAccessibilityClient(true);
    log.info('main', 'macOS Accessibility (trusted client)', { trusted });
  } catch (e) {
    log.warn('main', 'isTrustedAccessibilityClient', { message: e?.message });
  }
}

async function showMacScreenRecordingHelpOnce() {
  if (macScreenRecordingHelpShown || process.platform !== 'darwin') return;
  macScreenRecordingHelpShown = true;
  const { response } = await dialog.showMessageBox({
    type: 'warning',
    title: 'Screen Recording required',
    message: 'SnapSense could not read any displays.',
    detail:
      'On macOS, allow Screen Recording for SnapSense:\n\n' +
      'System Settings → Privacy & Security → Screen Recording → enable SnapSense.\n\n' +
      'Then quit SnapSense fully (menu bar → Quit) and open it again.',
    buttons: ['Open Screen Recording settings', 'OK'],
    defaultId: 0,
    cancelId: 1
  });
  if (response === 0) {
    try {
      await shell.openExternal(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
      );
    } catch (e) {
      log.warn('main', 'open Screen Recording prefs', { message: e?.message });
    }
  }
}

async function pickScreenSourceId() {
  if (process.platform === 'darwin') {
    try {
      const screenStatus = systemPreferences.getMediaAccessStatus('screen');
      log.info('main', 'macOS Screen Recording consent status', { screenStatus });
    } catch (e) {
      log.debug('main', 'getMediaAccessStatus(screen)', { message: e?.message });
    }
  }
  try {
    const primary = screen.getPrimaryDisplay();
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 150, height: 150 },
      fetchWindowIcons: false
    });
    if (!sources.length) {
      log.error('main', 'No desktop capture sources');
      if (process.platform === 'darwin') {
        await showMacScreenRecordingHelpOnce();
      }
      return null;
    }
    const match = sources.find((s) => String(s.display_id) === String(primary.id));
    const picked = match || sources[0];
    log.info('main', 'Desktop source', { id: picked.id, name: picked.name, display_id: picked.display_id });
    return picked.id;
  } catch (e) {
    log.error('main', 'desktopCapturer.getSources failed', { message: e?.message });
    return null;
  }
}

async function hideWindowForCapture(win) {
  if (!win || win.isDestroyed()) {
    log.warn('main', 'hideWindowForCapture: window missing');
    return;
  }
  log.info('main', 'hideWindowForCapture: starting');
  await new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const tid = setTimeout(finish, 140);
    win.once('hide', () => {
      clearTimeout(tid);
      finish();
    });
    try {
      win.hide();
    } catch (e) {
      clearTimeout(tid);
      log.debug('main', 'Follow-up hide panel', { message: e?.message });
      finish();
    }
  });
  // Give Windows a brief beat to settle z-order/composition before opening
  // the transparent fullscreen capture overlay.
  await delay(60);
  log.info('main', 'hideWindowForCapture: done');
}

function destroyModeStripWindow() {
  if (modeStripWin && !modeStripWin.isDestroyed()) {
    modeStripWin.close();
  }
  modeStripWin = null;
}

function destroyCaptureWindow() {
  unregisterCaptureEscapeShortcut();
  destroyModeStripWindow();
  if (captureWin && !captureWin.isDestroyed()) {
    captureWin.close();
  }
  captureWin = null;
  captureFrameReady = false;
  modeStripReady = false;
}

function cancelCaptureFlow() {
  ++captureFlowGeneration;
  const restorePanel = followUpCapturePending;
  followUpCapturePending = false;
  destroyCaptureWindow();
  if (restorePanel && panelWin && !panelWin.isDestroyed()) {
    panelWin.show();
    panelWin.focus();
  }
}

function createModeStripWindow() {
  destroyModeStripWindow();
  const d = screen.getPrimaryDisplay();
  const STRIP_W = 268;
  const STRIP_H = 36;
  const margin = 14;
  const x = Math.round(d.bounds.x + (d.bounds.width - STRIP_W) / 2);
  const y = Math.round(d.bounds.y + margin);

  const win = new BrowserWindow({
    x,
    y,
    width: STRIP_W,
    height: STRIP_H,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: CAPTURE_PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  modeStripWin = win;

  win.setAlwaysOnTop(true, 'pop-up-menu');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win
    .loadFile(MODE_STRIP_HTML)
    .catch((e) => log.error('main', 'loadFile mode strip', e));

  win.once('ready-to-show', () => {
    if (modeStripWin !== win) return;
    modeStripReady = true;
    if (captureFrameReady && !win.isDestroyed()) win.show();
  });

  win.webContents.once('did-finish-load', () => {
    if (!win.isDestroyed()) {
      win.webContents.send('mode-strip-init', { defaultMode: captureSessionMode });
    }
  });

  win.on('closed', () => {
    if (modeStripWin === win) modeStripWin = null;
  });

  log.info('main', 'Mode strip created', { x, y, STRIP_W, STRIP_H });
}

function destroyPanelWindow() {
  if (panelWin && !panelWin.isDestroyed()) {
    panelWin.close();
  }
  panelWin = null;
}

function createCaptureWindow(sourceId) {
  destroyCaptureWindow();
  const display = screen.getPrimaryDisplay();
  const { x, y, width, height } = display.bounds;

  const win = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    fullscreen: false,
    show: false,
    webPreferences: {
      preload: CAPTURE_PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  captureWin = win;

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setBounds(display.bounds);

  win.loadFile(CAPTURE_HTML).catch((e) => log.error('main', 'loadFile capture', e));

  win.once('ready-to-show', () => {
    if (captureWin === win && !win.isDestroyed()) {
      win.setBounds(display.bounds);
      win.show();
      win.focus();
      win.setBounds(display.bounds);
    }
  });

  win.webContents.once('did-finish-load', () => {
    if (captureWin === win && !win.isDestroyed()) {
      win.webContents.send('capture-init', { sourceId });
    }
  });

  win.on('closed', () => {
    if (captureWin === win) captureWin = null;
  });

  log.info('main', 'Capture window created', { bounds: display.bounds });

  createModeStripWindow();
  registerCaptureEscapeShortcut();
}

/**
 * Enable or disable stealth mode on the panel window.
 * - setContentProtection(true) → WDA_EXCLUDEFROMCAPTURE on Windows; invisible to Zoom/Meet/Discord/Teams.
 * - setSkipTaskbar(true)        → removes from Windows taskbar.
 * - Tray icon destroyed/rebuilt so the app has no visible system presence.
 * Must be re-applied on every 'focus' event because Electron may reset it after hide/show cycles.
 */
function applyStealthMode(enabled) {
  stealthActive = Boolean(enabled);
  log.info('main', 'Stealth mode', { enabled: stealthActive });

  // Apply window-level stealth FIRST — this must always run even if persist fails.
  if (panelWin && !panelWin.isDestroyed()) {
    try {
      panelWin.setContentProtection(stealthActive);
      panelWin.setSkipTaskbar(stealthActive);
    } catch (e) {
      log.warn('main', 'applyStealthMode panelWin error', { message: e?.message });
    }
  }

  // Persist preference after applying (write failure must not block the above).
  try {
    setStealthMode(stealthActive);
  } catch (e) {
    log.warn('main', 'applyStealthMode persist error', { message: e?.message });
  }

  if (stealthActive) {
    if (tray) {
      try {
        tray.destroy();
      } catch {
        /* ignore */
      }
      tray = null;
      log.info('main', 'Tray destroyed for stealth mode');
    }
  } else {
    if (!tray) {
      buildTray();
      log.info('main', 'Tray rebuilt after stealth mode off');
    }
  }

  if (panelWin && !panelWin.isDestroyed()) {
    panelWin.webContents.send('stealth-mode-changed', { enabled: stealthActive });
  }
}

function createPanelWindow(payload) {
  destroyPanelWindow();
  const display = screen.getPrimaryDisplay();
  const { x, y, width, height } = display.workArea;
  const panelWidth = 420;
  const panelHeight = Math.min(720, Math.floor(height * 0.88));
  const margin = 24;
  const px = x + width - panelWidth - margin;
  const py = y + margin;

  const panelIcon = appIconPath();
  const win = new BrowserWindow({
    x: px,
    y: py,
    width: panelWidth,
    height: panelHeight,
    minWidth: 360,
    minHeight: 440,
    frame: false,
    transparent: false,
    backgroundColor: '#000000',
    show: false,
    skipTaskbar: false,
    alwaysOnTop: true,
    ...(fs.existsSync(panelIcon) ? { icon: panelIcon } : {}),
    webPreferences: {
      preload: PANEL_PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true
    }
  });
  panelWin = win;

  win.loadFile(PANEL_HTML).catch((e) => log.error('main', 'loadFile panel', e));

  win.webContents.once('did-finish-load', () => {
    if (panelWin === win && !win.isDestroyed()) {
      setImmediate(() => {
        if (panelWin === win && !win.isDestroyed()) {
          win.webContents.send('panel-open', payload);
        }
      });
    }
  });

  win.once('ready-to-show', () => {
    if (panelWin !== win || win.isDestroyed()) return;
    win.show();
    win.focus();
  });

  win.on('focus', () => {
    // Re-apply content protection on every focus gain — Electron resets it after hide/show cycles
    // (see https://github.com/electron/electron/issues/45844).
    if (stealthActive && !win.isDestroyed()) {
      try {
        win.setContentProtection(true);
      } catch {
        /* ignore */
      }
    }
  });

  win.on('closed', () => {
    if (panelWin === win) panelWin = null;
  });

  // Restore persisted stealth preference on each new panel window.
  stealthActive = getStealthMode();
  if (stealthActive) {
    setImmediate(() => {
      if (panelWin === win && !win.isDestroyed()) {
        try {
          win.setContentProtection(true);
          win.setSkipTaskbar(true);
        } catch {
          /* ignore */
        }
        if (tray) {
          try { tray.destroy(); } catch { /* ignore */ }
          tray = null;
        }
        win.webContents.send('stealth-mode-changed', { enabled: true });
      }
    });
  }

  log.info('main', 'Panel window created');
}

/**
 * Same region capture as Win+Alt+S, but keeps the chat panel and returns the image to it (follow-up).
 */
async function startFollowUpCaptureFlow() {
  if (!panelWin || panelWin.isDestroyed()) {
    log.warn('main', 'Follow-up capture: no panel');
    return;
  }
  if (followUpCapturePending || (captureWin && !captureWin.isDestroyed())) {
    log.warn('main', 'Follow-up capture skipped: already active', {
      followUpCapturePending,
      hasCaptureWin: Boolean(captureWin && !captureWin.isDestroyed())
    });
    return;
  }
  const gen = ++captureFlowGeneration;
  log.info('main', 'Follow-up capture flow started', { gen });
  destroyCaptureWindow();
  followUpCapturePending = true;
  captureSessionMode = 'ai';
  try {
    // Resolve desktopCapturer while the panel is still visible. On Windows, calling
    // getSources with no visible BrowserWindow can return no sources or behave oddly.
    log.info('main', 'Follow-up capture: resolving desktop source', { gen });
    const sourceId = await pickScreenSourceId();
    if (gen !== captureFlowGeneration) {
      log.info('main', 'Follow-up capture superseded (generation mismatch)', { gen, current: captureFlowGeneration });
      followUpCapturePending = false;
      if (panelWin && !panelWin.isDestroyed()) {
        panelWin.show();
        panelWin.focus();
      }
      return;
    }
    if (!sourceId) {
      log.warn('main', 'Follow-up capture: no desktop source');
      followUpCapturePending = false;
      if (panelWin && !panelWin.isDestroyed()) {
        panelWin.show();
        panelWin.focus();
      }
      return;
    }
    log.info('main', 'Follow-up capture: hiding panel before overlay', { gen, sourceId });
    await hideWindowForCapture(panelWin);
    log.info('main', 'Follow-up capture: creating capture window', { gen });
    createCaptureWindow(sourceId);
  } catch (e) {
    log.error('main', 'Follow-up capture failed', { message: e.message, gen });
    followUpCapturePending = false;
    if (panelWin && !panelWin.isDestroyed()) {
      panelWin.show();
      panelWin.focus();
    }
  }
}

async function startCaptureFlow() {
  followUpCapturePending = false;
  const gen = ++captureFlowGeneration;
  log.info('main', 'Capture flow started', { gen });
  destroyPanelWindow();
  destroyCaptureWindow();
  captureSessionMode = 'ai';
  try {
    const sourceId = await pickScreenSourceId();
    if (gen !== captureFlowGeneration) {
      log.debug('main', 'Capture flow superseded', { gen });
      return;
    }
    if (!sourceId) {
      log.warn('main', 'Abort capture: no source');
      return;
    }
    createCaptureWindow(sourceId);
  } catch (e) {
    log.error('main', 'Capture flow failed', { message: e.message, gen });
    if (gen === captureFlowGeneration) {
      destroyCaptureWindow();
    }
  }
}

/**
 * Global capture hotkey. On Windows/Linux we use Super+Alt+S (Win+Alt+S).
 * On macOS use Command+Alt+S (⌘⌥S) explicitly — `Super+Alt+S` is unreliable in some Electron builds.
 */
function getCaptureAcceleratorCandidates() {
  if (process.platform === 'darwin') {
    return ['Command+Alt+S', 'Control+Alt+S', 'Super+Alt+S'];
  }
  return ['Super+Alt+S'];
}

function captureShortcutHint() {
  if (process.platform === 'darwin') return '⌘⌥S';
  if (process.platform === 'win32') return 'Win+Alt+S';
  return 'Super+Alt+S';
}

function registerShortcut() {
  registeredCaptureAccelerator = null;
  const candidates = getCaptureAcceleratorCandidates();
  for (const accel of candidates) {
    const ok = globalShortcut.register(accel, () => {
      log.info('main', 'Global shortcut', { accel });
      startCaptureFlow();
    });
    if (ok) {
      registeredCaptureAccelerator = accel;
      log.info('main', 'Shortcut registered', { accel });
      if (tray && !tray.isDestroyed()) {
        tray.setToolTip(`SnapSense — ${captureShortcutHint()} to capture`);
      }
      return;
    }
    log.warn('main', 'Shortcut registration failed, trying next', { accel });
  }
  log.error('main', 'All capture shortcut candidates failed', { candidates });
  if (process.platform === 'darwin') {
    dialog
      .showMessageBox({
        type: 'warning',
        title: 'SnapSense',
        message: 'Could not register the global capture shortcut.',
        detail:
          'Try: System Settings → Privacy & Security → Accessibility → enable SnapSense, then restart the app.\n\n' +
          'You can still use the menu bar icon → Capture region.',
        buttons: ['OK']
      })
      .catch(() => {});
  }
}

function buildTray() {
  let icon = nativeImage.createFromPath(trayIconPath());
  if (icon.isEmpty()) {
    log.warn('main', 'Tray icon missing or empty; using empty icon');
    icon = nativeImage.createEmpty();
  }
  tray = new Tray(icon);
  tray.setToolTip(`SnapSense — ${captureShortcutHint()} to capture`);

  const installationSubmenu = [];
  if (process.platform === 'darwin') {
    installationSubmenu.push({
      label: 'Show app in Finder',
      click: () => {
        try {
          shell.showItemInFolder(app.getPath('exe'));
        } catch (e) {
          log.warn('main', 'showItemInFolder', { message: e?.message });
        }
      }
    });
  } else {
    installationSubmenu.push({
      label: 'Open install folder',
      click: () => {
        const dir = path.dirname(app.getPath('exe'));
        shell.openPath(dir).then((errMsg) => {
          if (errMsg) log.warn('main', 'openPath install folder', { err: errMsg });
        });
      }
    });
    if (process.platform === 'win32') {
      installationSubmenu.push({
        label: 'Open Start Menu (SnapSense)',
        click: () => {
          const programs = path.join(
            process.env.APPDATA || '',
            'Microsoft',
            'Windows',
            'Start Menu',
            'Programs'
          );
          const category = path.join(programs, 'SnapSense');
          const target = fs.existsSync(category) ? category : programs;
          shell.openPath(target).then((errMsg) => {
            if (errMsg) log.warn('main', 'openPath Start Menu', { err: errMsg });
          });
        }
      });
    }
  }

  const menu = Menu.buildFromTemplate([
    {
      label: 'Capture region',
      click: () => startCaptureFlow()
    },
    {
      label: 'Installation',
      submenu: installationSubmenu
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit()
    }
  ]);
  tray.setContextMenu(menu);
  tray.on('click', () => {
    startCaptureFlow();
  });
}

function setupIpc() {
  ipcMain.on('capture-ready', (event) => {
    if (!captureWin || captureWin.isDestroyed() || event.sender !== captureWin.webContents) return;
    captureFrameReady = true;
    if (modeStripReady && modeStripWin && !modeStripWin.isDestroyed()) {
      modeStripWin.show();
    }
  });

  ipcMain.on('capture-mode-selected', (_evt, mode) => {
    if (mode === 'ai' || mode === 'text' || mode === 'lens' || mode === 'ocr') {
      captureSessionMode = mode === 'ocr' ? 'text' : mode;
      log.debug('main', 'Capture mode', { mode });
    }
  });

  ipcMain.handle('get-api-key-status', () => {
    return getAiKeyStatus();
  });

  ipcMain.handle('get-model-mode', () => getModelSettings());

  ipcMain.handle('set-model-mode', (_evt, { mode }) => ({ mode: setModelMode(mode) }));

  ipcMain.handle('save-model-config', (_evt, config) => {
    try {
      return { ok: true, settings: setModelConfig(config) };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('set-provider-api-key', (_evt, { provider, token }) => {
    try {
      return setProviderApiKey(provider, token);
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('list-models', (_evt, options) => listAvailableModels(options));

  async function handleExtractText(imageDataUrl) {
    if (!imageDataUrl) {
      return { error: 'Image payload missing for text extraction.' };
    }
    const messages = [
      {
        role: 'system',
        content: getPrompt('ocr')
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract text from this image only.' },
          { type: 'image_url', image_url: { url: imageDataUrl } }
        ]
      }
    ];
    const out = await requestAi(messages, 2200, log);
    if (out.error) {
      log.error('main', 'Text extraction via AI failed', { message: out.error });
      return { error: out.error };
    }
    return { text: (out.content || '').trim() };
  }

  ipcMain.handle('extract-text', async (_evt, { imageDataUrl }) => handleExtractText(imageDataUrl));

  ipcMain.handle('run-ocr', async (_evt, payload) => handleExtractText(payload?.imageDataUrl));

  ipcMain.handle('lens-upload', async (_evt, { imageDataUrl }) => {
    try {
      const url = await uploadImageToLens(imageDataUrl);
      return { url };
    } catch (e) {
      log.error('main', 'Lens upload failed', { message: e.message });
      return { error: e.message || 'Google Lens upload failed.' };
    }
  });

  ipcMain.handle('open-external', async (_evt, { url }) => {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      return { ok: false };
    }
    await shell.openExternal(url);
    return { ok: true };
  });

  /**
   * Google search URLs from our upload are tied to the in-app cookie jar; the system
   * browser won't have the same session. Copy the capture to the clipboard and open
   * Lens so the user can paste (Ctrl+V / ⌘V) once — same image as in the panel.
   */
  ipcMain.handle('open-lens-in-browser', async (_evt, { imageDataUrl }) => {
    let copied = false;
    try {
      if (panelWin && !panelWin.isDestroyed()) {
        panelWin.focus();
      }
    } catch {
      /* ignore */
    }

    try {
      if (typeof imageDataUrl === 'string' && imageDataUrl.startsWith('data:')) {
        const m = /^data:([^;]*);base64,(.+)$/s.exec(imageDataUrl);
        let ni = null;
        if (m && m[2]) {
          const buf = Buffer.from(m[2].replace(/\s+/g, ''), 'base64');
          if (buf.length) {
            ni = nativeImage.createFromBuffer(buf);
            if (ni.isEmpty()) {
              ni = null;
            }
          }
        }
        if (!ni || ni.isEmpty()) {
          ni = nativeImage.createFromDataURL(imageDataUrl);
        }
        if (!ni.isEmpty()) {
          const asPng = nativeImage.createFromBuffer(ni.toPNG());
          if (!asPng.isEmpty()) {
            clipboard.writeImage(asPng);
            copied = true;
          } else {
            clipboard.writeImage(ni);
            copied = true;
          }
        }
        if (!copied) {
          log.warn('main', 'Lens → browser: could not build image for clipboard');
        }
      }
    } catch (e) {
      log.warn('main', 'Lens → browser clipboard', { message: e.message });
    }

    try {
      await shell.openExternal('https://lens.google.com/');
    } catch (e) {
      log.error('main', 'Lens → browser openExternal', { message: e.message });
      return { ok: false, copied };
    }
    return { ok: true, copied };
  });

  ipcMain.handle('openai-chat', async (_evt, { messages }) => {
    const prompt = getPrompt('chat');
    const normalized = Array.isArray(messages) ? messages : [];
    const merged = prompt ? [{ role: 'system', content: prompt }, ...normalized] : normalized;
    return requestAi(merged, 4096, log);
  });

  const requestFollowUpCapture = async (via) => {
    log.info('main', 'IPC request-follow-up-capture', { via });
    await startFollowUpCaptureFlow();
    return { ok: true };
  };

  ipcMain.on('request-follow-up-capture', (_evt) => {
    log.info('main', 'IPC request-follow-up-capture received (on/send)', {
      senderId: _evt?.sender?.id
    });
    requestFollowUpCapture('send').catch((e) => {
      log.error('main', 'request-follow-up-capture (send) failed', { message: e?.message });
    });
  });

  ipcMain.handle('request-follow-up-capture', () => requestFollowUpCapture('invoke'));

  ipcMain.on('capture-result', (_evt, payload) => {
    log.info('main', 'Capture result', {
      hasImage: Boolean(payload?.imageDataUrl),
      mime: payload?.mime,
      followUp: followUpCapturePending
    });
    destroyCaptureWindow();
    if (!payload?.imageDataUrl) {
      log.warn('main', 'Empty capture result');
      if (followUpCapturePending) {
        followUpCapturePending = false;
        if (panelWin && !panelWin.isDestroyed()) {
          panelWin.show();
          panelWin.focus();
        }
      }
      return;
    }
    if (followUpCapturePending && panelWin && !panelWin.isDestroyed()) {
      followUpCapturePending = false;
      const targetPanel = panelWin;
      targetPanel.show();
      targetPanel.focus();
      setImmediate(() => {
        if (panelWin === targetPanel && !targetPanel.isDestroyed()) {
          const len = typeof payload.imageDataUrl === 'string' ? payload.imageDataUrl.length : 0;
          log.info('main', 'Sending follow-up-capture to panel', { mime: payload.mime || 'image/png', dataUrlChars: len });
          targetPanel.webContents.send('follow-up-capture', {
            imageDataUrl: payload.imageDataUrl,
            mime: payload.mime || 'image/png'
          });
        } else {
          log.warn('main', 'follow-up-capture: panel destroyed before send');
        }
      });
      return;
    }
    createPanelWindow({
      imageDataUrl: payload.imageDataUrl,
      mime: payload.mime || 'image/png',
      mode: captureSessionMode
    });
  });

  ipcMain.on('capture-cancel', () => {
    log.info('main', 'Capture cancelled', { followUpPending: followUpCapturePending });
    cancelCaptureFlow();
  });

  ipcMain.on('panel-close', () => {
    log.info('main', 'Panel close requested');
    destroyPanelWindow();
  });

  ipcMain.handle('get-stealth-mode', () => ({ enabled: getStealthMode() }));

  ipcMain.handle('set-stealth-mode', (_evt, { enabled }) => {
    applyStealthMode(Boolean(enabled));
    return { enabled: stealthActive };
  });
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    if (permission === 'media' || permission === 'display-capture') {
      callback(true);
    } else {
      callback(false);
    }
  });
  log.info('main', 'App ready', { version: app.getVersion() });
  logMissingUiAssets();
  requestMacAccessibilityTrust();
  setupIpc();
  buildTray();
  registerShortcut();
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
});

/** Tray app: keep running when capture/panel windows close */
app.on('window-all-closed', () => {});
