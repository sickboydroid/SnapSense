/* global snapsense */

const MIN_W = 24;
const MIN_H = 24;

const bg = document.getElementById('bg');
const sel = document.getElementById('sel');
const ctxBg = bg.getContext('2d');
const ctxSel = sel.getContext('2d');

let sourceId = null;
let dragging = false;
let startX = 0;
let startY = 0;
let curX = 0;
let curY = 0;
let ready = false;

function mapMouse(e) {
  const rect = bg.getBoundingClientRect();
  const sx = bg.width / rect.width;
  const sy = bg.height / rect.height;
  return {
    x: Math.max(0, Math.min(bg.width, (e.clientX - rect.left) * sx)),
    y: Math.max(0, Math.min(bg.height, (e.clientY - rect.top) * sy))
  };
}

function resizeSelCanvas() {
  sel.width = window.innerWidth;
  sel.height = window.innerHeight;
}

function drawSelection() {
  ctxSel.clearRect(0, 0, sel.width, sel.height);
  if (!ready) return;
  ctxSel.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctxSel.fillRect(0, 0, sel.width, sel.height);
  if (!dragging) return;
  const rect = bg.getBoundingClientRect();
  const scaleX = rect.width / bg.width;
  const scaleY = rect.height / bg.height;
  const x1 = Math.min(startX, curX);
  const y1 = Math.min(startY, curY);
  const x2 = Math.max(startX, curX);
  const y2 = Math.max(startY, curY);
  const rx = rect.left + x1 * scaleX;
  const ry = rect.top + y1 * scaleY;
  const rw = (x2 - x1) * scaleX;
  const rh = (y2 - y1) * scaleY;
  ctxSel.clearRect(rx, ry, rw, rh);
  ctxSel.strokeStyle = 'rgba(138, 180, 255, 0.95)';
  ctxSel.lineWidth = 2;
  ctxSel.shadowColor = 'rgba(100, 149, 255, 0.7)';
  ctxSel.shadowBlur = 12;
  ctxSel.strokeRect(rx + 0.5, ry + 0.5, Math.max(0, rw - 1), Math.max(0, rh - 1));
  ctxSel.shadowBlur = 0;
}

async function getDesktopStream() {
  const hi = {
    audio: false,
    video: {
      cursor: 'never',
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: sourceId,
        maxWidth: 7680,
        maxHeight: 4320,
        minWidth: 1,
        minHeight: 1,
        maxFrameRate: 60,
        googCaptureMouseCursor: false
      }
    }
  };
  const lo = {
    audio: false,
    video: {
      cursor: 'never',
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: sourceId,
        googCaptureMouseCursor: false
      }
    }
  };
  try {
    return await navigator.mediaDevices.getUserMedia(hi);
  } catch (e) {
    return navigator.mediaDevices.getUserMedia(lo);
  }
}

async function freezeFrame() {
  let stream;
  let video;
  try {
    stream = await getDesktopStream();
    video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    if (video.readyState < 2) {
      await new Promise((resolve) => video.addEventListener('loadeddata', resolve, { once: true }));
    }
    const { videoWidth: width, videoHeight: height } = video;
    if (width < 2 || height < 2) throw new Error('Invalid screen dimensions');

    // Keep the stream's native resolution so the cropped image remains sharp.
    bg.width = width;
    bg.height = height;
    ctxBg.imageSmoothingEnabled = true;
    ctxBg.imageSmoothingQuality = 'high';
    ctxBg.drawImage(video, 0, 0, width, height);
    ready = true;
    drawSelection();
    window.snapsense.sendCaptureReady();
  } catch (error) {
    console.error('[SnapSense capture] Could not freeze screen', error);
    window.snapsense.sendCaptureCancel();
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
    if (video) video.srcObject = null;
  }
}

function cropSelection() {
  const x1 = Math.min(startX, curX);
  const y1 = Math.min(startY, curY);
  const x2 = Math.max(startX, curX);
  const y2 = Math.max(startY, curY);
  let w = Math.round(x2 - x1);
  let h = Math.round(y2 - y1);
  if (w < MIN_W || h < MIN_H) {
    return null;
  }
  const sx = Math.round(x1);
  const sy = Math.round(y1);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const cctx = c.getContext('2d');
  cctx.imageSmoothingEnabled = true;
  cctx.imageSmoothingQuality = 'high';
  cctx.drawImage(bg, sx, sy, w, h, 0, 0, w, h);
  return c.toDataURL('image/png');
}

function onDown(e) {
  if (!ready || e.button !== 0) return;
  dragging = true;
  const p = mapMouse(e);
  startX = p.x;
  startY = p.y;
  curX = p.x;
  curY = p.y;
  drawSelection();
}

function onMove(e) {
  if (!dragging) return;
  const p = mapMouse(e);
  curX = p.x;
  curY = p.y;
  drawSelection();
}

function onUp(e) {
  if (!dragging) return;
  const p = mapMouse(e);
  curX = p.x;
  curY = p.y;
  dragging = false;
  const dataUrl = cropSelection();
  drawSelection();
  if (!dataUrl) {
    document.getElementById('hint').textContent =
      'Selection too small — try a larger area (Esc to cancel)';
    return;
  }
  window.snapsense.sendCaptureResult({ imageDataUrl: dataUrl, mime: 'image/png' });
}

function cancel() {
  window.snapsense.sendCaptureCancel();
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    cancel();
  }
});

window.addEventListener('mousedown', onDown);
window.addEventListener('mousemove', onMove);
window.addEventListener('mouseup', onUp);

window.addEventListener('resize', () => {
  resizeSelCanvas();
  drawSelection();
});

const unsub = window.snapsense.onCaptureInit((payload) => {
  sourceId = payload.sourceId;
  resizeSelCanvas();
  requestAnimationFrame(() => {
    freezeFrame().catch((err) => {
      console.error('[SnapSense capture] freezeFrame', err);
      cancel();
    });
  });
});

window.addEventListener('beforeunload', () => {
  if (typeof unsub === 'function') unsub();
});
