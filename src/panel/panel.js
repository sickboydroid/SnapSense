/* global snapsense */

const chatEl = document.getElementById('chat');
const chatJumpBottomBtn = document.getElementById('chat-jump-bottom');
const shotText = document.getElementById('shot-text');
const msgEl = document.getElementById('msg');
const sendBtn = document.getElementById('send');
const typingEl = document.getElementById('typing');
const bannerEl = document.getElementById('banner');
const btnClose = document.getElementById('btn-close');
const sectionAi = document.getElementById('section-ai');
const sectionText = document.getElementById('section-text');
const sectionLens = document.getElementById('section-lens');
const modeLabel = document.getElementById('mode-label');
const appWrap = document.getElementById('app-wrap');
const textChatEl = document.getElementById('text-chat');
const textStatusEl = document.getElementById('text-status');
const textOutputEl = document.getElementById('text-output');
const textCopyBtn = document.getElementById('text-copy');
const textLoadingEl = document.getElementById('text-loading');
const textResultEl = document.getElementById('text-result');
const textErrorEl = document.getElementById('text-error');
const textRetryBtn = document.getElementById('text-retry');
const lensWebview = document.getElementById('lens-view');
const lensOpenExternalBtn = document.getElementById('lens-open-browser');
const lensLoadingEl = document.getElementById('lens-loading');
const lensErrorEl = document.getElementById('lens-error');
const modelModeSelect = document.getElementById('ai-model-mode');
const modelSelectWrap = document.querySelector('.model-select-wrap');
const modelSettingsToggle = document.getElementById('model-settings-toggle');
const modelSettingsEl = document.getElementById('model-settings');
const modelCatalogEl = document.getElementById('model-catalog');
const modelListLoadBtn = document.getElementById('model-list-load');
const modelIdInput = document.getElementById('model-id');
const customBaseUrlField = document.getElementById('custom-base-url-field');
const customBaseUrlInput = document.getElementById('custom-base-url');
const providerKeyLabel = document.getElementById('provider-key-label');
const providerApiKeyInput = document.getElementById('provider-api-key');
const modelSettingsSaveBtn = document.getElementById('model-settings-save');
const modelKeyClearBtn = document.getElementById('model-key-clear');
const modelSettingsStatus = document.getElementById('model-settings-status');
const voiceToggleBtn = document.getElementById('voice-toggle');
const stealthToggleBtn = document.getElementById('stealth-toggle');
const followUpPreviewEl = document.getElementById('follow-up-preview');
const followUpThumbEl = document.getElementById('follow-up-thumb');
const followUpRemoveBtn = document.getElementById('follow-up-remove');
const followUpAttachBtn = document.getElementById('follow-up-attach');
const PLACEHOLDER_IDLE = 'Optional follow-up text…';

let imageDataUrl = '';
let messages = [];
let busy = false;
let activeLensUrl = 'https://lens.google.com/';
let aiLoadingEl = null;
let modelSettingsOpen = false;
/** Until first real http(s) page finishes loading after assigning Lens URL */
let lensSessionPending = false;
/** While main process is uploading — ignore webview load events from the previous page. */
let lensUploadPhase = false;
/** Open default browser once if embedded Lens cannot load (Google often blocks webviews). */
let lensEmbedFallbackOpened = false;

/** Plain text for Copy (OCR may include markdown-style text we render as HTML). */
let lastExtractedPlainText = '';

/** Pending follow-up screenshot (data URL) for the next user message; text may be empty. */
let followUpImageDataUrl = '';

function syncSendButtonState() {
  if (!sendBtn) return;
  if (busy) {
    sendBtn.disabled = true;
    return;
  }
  const hasText = Boolean(msgEl && msgEl.value.trim().length);
  const hasImg = Boolean(followUpImageDataUrl);
  sendBtn.disabled = !hasText && !hasImg;
}

function setSendChromeDisabled(disabled) {
  if (!sendBtn) return;
  if (disabled) {
    sendBtn.disabled = true;
  } else {
    syncSendButtonState();
  }
}

function clearFollowUpAttachment() {
  followUpImageDataUrl = '';
  if (followUpThumbEl) {
    followUpThumbEl.removeAttribute('src');
  }
  if (followUpPreviewEl) {
    followUpPreviewEl.hidden = true;
  }
  syncSendButtonState();
}

function setFollowUpImageFromDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
    return;
  }
  followUpImageDataUrl = dataUrl;
  if (followUpThumbEl) {
    followUpThumbEl.src = dataUrl;
  }
  if (followUpPreviewEl) {
    followUpPreviewEl.hidden = false;
  }
  syncSendButtonState();
}

function setStealthButtonState(enabled) {
  if (!stealthToggleBtn) return;
  stealthToggleBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  stealthToggleBtn.title = enabled
    ? 'Stealth ON — invisible to screen sharing. Click to disable.'
    : 'Stealth mode — hide from screen sharing & taskbar';
  stealthToggleBtn.setAttribute(
    'aria-label',
    enabled ? 'Disable stealth mode' : 'Enable stealth mode'
  );
}

async function initStealthToggle() {
  if (!stealthToggleBtn) return;
  try {
    const res = await window.snapsense.getStealthMode();
    setStealthButtonState(Boolean(res?.enabled));
  } catch (err) {
    console.warn('[SnapSense panel] getStealthMode failed', err);
  }

  stealthToggleBtn.addEventListener('click', async () => {
    const current = stealthToggleBtn.getAttribute('aria-pressed') === 'true';
    const next = !current;
    stealthToggleBtn.disabled = true;
    try {
      await window.snapsense.setStealthMode(next);
      setStealthButtonState(next);
    } catch (err) {
      console.error('[SnapSense panel] setStealthMode failed', err);
    } finally {
      stealthToggleBtn.disabled = false;
    }
  });

  if (typeof window.snapsense.onStealthModeChange === 'function') {
    window.snapsense.onStealthModeChange((payload) => {
      setStealthButtonState(Boolean(payload?.enabled));
    });
  }
}

function initFollowUpAttachment() {
  if (voiceToggleBtn) {
    voiceToggleBtn.disabled = true;
    voiceToggleBtn.title = 'Coming soon';
    voiceToggleBtn.setAttribute('aria-label', 'Voice input coming soon');
  }

  if (followUpAttachBtn) {
    followUpAttachBtn.disabled = false;
    followUpAttachBtn.title = 'Capture region (same as Win+Alt+S)';
    followUpAttachBtn.setAttribute('aria-label', 'Capture follow-up region');
    followUpAttachBtn.addEventListener('click', () => {
      console.info('[SnapSense panel] follow-up-attach click');
      if (!window.snapsense) {
        console.error('[SnapSense panel] follow-up-attach: window.snapsense missing (preload not loaded?)');
        return;
      }
      if (typeof window.snapsense.requestFollowUpCapture !== 'function') {
        console.error('[SnapSense panel] follow-up-attach: requestFollowUpCapture not exposed');
        return;
      }
      try {
        window.snapsense.requestFollowUpCapture();
        console.info('[SnapSense panel] follow-up-attach: ipc send dispatched');
      } catch (err) {
        console.error('[SnapSense panel] follow-up-attach: send failed', err);
      }
    });
  } else {
    console.warn('[SnapSense panel] follow-up-attach: #follow-up-attach not found in DOM');
  }

  if (followUpRemoveBtn) {
    followUpRemoveBtn.addEventListener('click', () => clearFollowUpAttachment());
  }
  if (msgEl) {
    msgEl.addEventListener('input', () => syncSendButtonState());
  }
  syncSendButtonState();
}

const mdEngine = window.marked;
if (mdEngine && mdEngine.setOptions) {
  mdEngine.setOptions({
    gfm: true,
    breaks: true
  });
}

function toPrettyText(value) {
  if (typeof value !== 'string') {
    return String(value || '');
  }
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const parsed = JSON.parse(trimmed);
    return `\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``;
  } catch {
    return value;
  }
}

function renderMarkdown(text) {
  const source = toPrettyText(text);
  const rawHtml = mdEngine ? mdEngine.parse(source) : source;
  return window.DOMPurify.sanitize(rawHtml);
}

/** Pixels from bottom to treat as "following" live stream (auto-scroll only then). */
const CHAT_STICKY_THRESHOLD_PX = 72;

function isChatNearBottom(el) {
  if (!el) return true;
  const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
  return dist <= CHAT_STICKY_THRESHOLD_PX;
}

function syncChatJumpButton() {
  if (!chatJumpBottomBtn || !chatEl) return;
  const overflow = chatEl.scrollHeight - chatEl.clientHeight > 8;
  chatJumpBottomBtn.hidden = !overflow || isChatNearBottom(chatEl);
}

function scrollChatToBottomIfPinned(behavior = 'auto') {
  if (!chatEl) return;
  if (isChatNearBottom(chatEl)) {
    chatEl.scrollTo({ top: chatEl.scrollHeight, behavior });
  }
  syncChatJumpButton();
}

function forceScrollChatToBottom(behavior = 'auto') {
  if (!chatEl) return;
  chatEl.scrollTo({ top: chatEl.scrollHeight, behavior });
  syncChatJumpButton();
}

/** Approximate typing speed for assistant replies (characters per second). */
const ASSISTANT_STREAM_CPS = 82;
/** Text-extract result reveal speed (rendered markdown in a div). */
const TEXT_EXTRACT_STREAM_CPS = 95;

/**
 * Reveal markdown progressively: each frame re-parses the prefix so lists/formatting
 * update continuously (not raw `**` syntax).
 */
function streamMarkdownReveal(el, fullText, cps, scrollEl) {
  const text = typeof fullText === 'string' ? fullText : String(fullText ?? '');
  return new Promise((resolve) => {
    el.innerHTML = '';
    if (!text.length) {
      if (scrollEl === chatEl) syncChatJumpButton();
      resolve();
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.innerHTML = renderMarkdown(text);
      if (scrollEl === chatEl) syncChatJumpButton();
      resolve();
      return;
    }

    const durationMs = Math.min((text.length / cps) * 1000, 2500);
    const t0 = performance.now();
    let lastFrame = 0;
    function tick(now) {
      if (now - lastFrame < 40 && now - t0 < durationMs) {
        requestAnimationFrame(tick);
        return;
      }
      lastFrame = now;
      const n = Math.min(text.length, Math.floor(((now - t0) / durationMs) * text.length));
      const pinned = scrollEl && isChatNearBottom(scrollEl);
      el.innerHTML = renderMarkdown(text.slice(0, n));
      if (pinned) {
        scrollEl.scrollTop = scrollEl.scrollHeight;
      }
      if (scrollEl === chatEl) {
        syncChatJumpButton();
      }
      if (n < text.length) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(tick);
  });
}

/**
 * Reveal assistant reply as markdown during streaming; keeps chat scrolled to bottom.
 */
function streamAssistantReply(fullText) {
  const text = typeof fullText === 'string' ? fullText : String(fullText ?? '');
  clearAiLoadingSkeleton();

  const wrap = document.createElement('div');
  wrap.className = 'bubble assistant';
  const body = document.createElement('div');
  body.className = 'bubble-body';
  wrap.appendChild(body);
  chatEl.appendChild(wrap);

  if (!text.length) {
    body.innerHTML = renderMarkdown('');
    scrollChatToBottomIfPinned('auto');
    return Promise.resolve();
  }

  return streamMarkdownReveal(body, text, ASSISTANT_STREAM_CPS, chatEl).then(() => {
    scrollChatToBottomIfPinned('smooth');
  });
}

function appendBubble(role, text, extraClass) {
  const wrap = document.createElement('div');
  wrap.className = `bubble ${role}${extraClass ? ` ${extraClass}` : ''}`;
  const body = document.createElement('div');
  body.className = 'bubble-body';
  if (role === 'assistant' && !extraClass) {
    body.innerHTML = renderMarkdown(text);
  } else {
    body.textContent = text;
  }
  wrap.appendChild(body);
  chatEl.appendChild(wrap);
  scrollChatToBottomIfPinned('auto');
}

/** Follow-up user turn: optional text plus optional image (API may use placeholder text if only image). */
function appendUserFollowUpBubble(text, imgDataUrl) {
  const wrap = document.createElement('div');
  wrap.className = 'bubble user';
  const body = document.createElement('div');
  body.className = 'bubble-body user-capture-msg user-follow-up';
  if (imgDataUrl) {
    const img = document.createElement('img');
    img.className = 'chat-inline-capture chat-follow-thumb';
    img.src = imgDataUrl;
    img.alt = '';
    body.appendChild(img);
  }
  const t = (text || '').trim();
  if (t) {
    const line = document.createElement('div');
    line.className = 'user-follow-text';
    line.textContent = t;
    body.appendChild(line);
  }
  wrap.appendChild(body);
  chatEl.appendChild(wrap);
  scrollChatToBottomIfPinned('auto');
}

/** User message with screenshot only (prompt text is sent to the API but not shown). */
function appendUserCaptureInChat(imageDataUrl) {
  const wrap = document.createElement('div');
  wrap.className = 'bubble user';
  const body = document.createElement('div');
  body.className = 'bubble-body user-capture-msg user-capture-img-only';
  const img = document.createElement('img');
  img.className = 'chat-inline-capture';
  img.src = imageDataUrl;
  img.alt = '';
  body.appendChild(img);
  wrap.appendChild(body);
  chatEl.appendChild(wrap);
  forceScrollChatToBottom('auto');
}

function aiLoadingSkeletonHtml() {
  return `
    <div class="bubble-body shimmer-bubble-inner shimmer-text-only">
      <div class="shimmer-line shimmer-title w-35"></div>
      <div class="shimmer-line w-100 d1"></div>
      <div class="shimmer-line w-94 d2"></div>
      <div class="shimmer-line w-88 d3"></div>
      <div class="shimmer-line w-76 d4"></div>
      <div class="shimmer-line w-90 d5"></div>
    </div>
  `;
}

function addAiLoadingSkeleton() {
  if (aiLoadingEl) {
    aiLoadingEl.remove();
  }
  aiLoadingEl = document.createElement('div');
  aiLoadingEl.className = 'bubble assistant loading';
  aiLoadingEl.innerHTML = aiLoadingSkeletonHtml();
  chatEl.appendChild(aiLoadingEl);
  scrollChatToBottomIfPinned('auto');
}

function clearAiLoadingSkeleton() {
  if (aiLoadingEl) {
    aiLoadingEl.remove();
    aiLoadingEl = null;
  }
}

function setTyping(on) {
  typingEl.hidden = !on;
}

function updateModelSettingsVisibility() {
  if (!modelSettingsEl || !appWrap) return;
  const usesAi = appWrap.dataset.mode !== 'lens';
  modelSettingsEl.hidden = !(usesAi && modelSettingsOpen);
  modelSettingsToggle.hidden = !usesAi;
  modelSettingsToggle.setAttribute('aria-expanded', String(usesAi && modelSettingsOpen));
}

function setModelSettingsOpen(open) {
  modelSettingsOpen = Boolean(open);
  updateModelSettingsVisibility();
}

function setModelSettingsStatus(message, error = false) {
  modelSettingsStatus.textContent = message;
  modelSettingsStatus.classList.toggle('error', error);
}

function renderModelSettings(settings) {
  const provider = modelModeSelect.value;
  modelIdInput.value = settings?.models?.[provider] || '';
  customBaseUrlInput.value = settings?.customBaseUrl || '';
  customBaseUrlField.hidden = provider !== 'custom';
  providerKeyLabel.textContent = provider === 'custom'
    ? 'API key (optional)'
    : `${provider === 'groq' ? 'Groq' : 'OpenAI'} API key`;
  providerApiKeyInput.value = '';
  modelCatalogEl.replaceChildren(new Option('Load models from this provider', ''));
}

async function syncModelSelectFromMain() {
  if (!modelModeSelect) return;
  try {
    const r = await window.snapsense.getModelMode();
    const mode = r?.mode || 'groq';
    if (mode === 'groq' || mode === 'openai' || mode === 'custom') {
      modelModeSelect.value = mode;
    }
    renderModelSettings(r);
    updateModelSettingsVisibility();
  } catch {
    /* ignore */
  }
}

async function refreshApiBanner() {
  try {
    const r = await window.snapsense.getModelMode();
    const mode = r?.mode || 'groq';
    const s = await window.snapsense.getApiKeyStatus();
    if (s.isDummy || !s.configured) {
      bannerEl.textContent = mode === 'custom'
        ? 'Set a custom base URL and model ID.'
        : `${mode === 'openai' ? 'OpenAI' : 'Groq'} API key is missing or invalid.`;
      bannerEl.classList.add('visible');
    } else {
      bannerEl.classList.remove('visible');
    }
  } catch {
    bannerEl.classList.remove('visible');
  }
}

function textModeSkeletonHtml() {
  return `
    <div class="bubble assistant loading text-extract-loading">
      <div class="bubble-body shimmer-bubble-inner shimmer-text-only">
        <div class="shimmer-line shimmer-title w-45"></div>
        <div class="shimmer-para">
          <div class="shimmer-line w-100"></div>
          <div class="shimmer-line w-96 d1"></div>
          <div class="shimmer-line w-90 d2"></div>
          <div class="shimmer-line w-94 d3"></div>
          <div class="shimmer-line w-85 d4"></div>
        </div>
        <div class="shimmer-line w-72 d5"></div>
      </div>
    </div>
  `;
}

function scrollTextChat() {
  if (textChatEl) {
    textChatEl.scrollTop = textChatEl.scrollHeight;
  }
}

async function runTextExtractFlow() {
  textRetryBtn.hidden = true;
  if (textResultEl) textResultEl.hidden = true;
  if (textErrorEl) {
    textErrorEl.hidden = true;
    textErrorEl.textContent = '';
  }
  textStatusEl.textContent = 'Reading text from image…';
  lastExtractedPlainText = '';
  textOutputEl.innerHTML = '';
  textCopyBtn.disabled = true;
  textLoadingEl.hidden = false;
  textLoadingEl.innerHTML = textModeSkeletonHtml();

  try {
    const { text } = await window.snapsense.extractText(imageDataUrl);
    const finalText = text || '';
    textLoadingEl.hidden = true;
    textLoadingEl.innerHTML = '';

    if (!finalText.trim()) {
      textStatusEl.textContent = 'No readable text found in this capture.';
      if (textResultEl) textResultEl.hidden = true;
      return;
    }

    if (textResultEl) textResultEl.hidden = false;
    textStatusEl.textContent = `Done · ${finalText.length} characters`;
    lastExtractedPlainText = finalText;
    await streamMarkdownReveal(textOutputEl, finalText, TEXT_EXTRACT_STREAM_CPS, textChatEl);
    textCopyBtn.disabled = false;
    scrollTextChat();
  } catch (e) {
    textLoadingEl.hidden = true;
    textLoadingEl.innerHTML = '';
    textStatusEl.textContent = '';
    if (textResultEl) textResultEl.hidden = true;
    if (textErrorEl) {
      textErrorEl.hidden = false;
      textErrorEl.textContent = e?.message || 'Could not extract text.';
    }
    textRetryBtn.hidden = false;
  }
}

function getLensWebviewUrl() {
  try {
    return lensWebview.getURL();
  } catch {
    return lensWebview.src || '';
  }
}

/** Layout reference width (px). Larger ⇒ stronger zoom-out for narrow panels (~420px). */
const LENS_ZOOM_REFERENCE_PX = 720;

function applyLensWebviewZoom() {
  if (!lensWebview) return;
  try {
    const w = window.innerWidth || 420;
    const factor = Math.min(1, Math.max(0.48, w / LENS_ZOOM_REFERENCE_PX));
    if (typeof lensWebview.setZoomFactor === 'function') {
      lensWebview.setZoomFactor(factor);
    }
  } catch {
    /* ignore */
  }
}

/** Reduce horizontal scroll inside Google pages; keep width tied to host. */
function clampLensGuestToHostWidth() {
  if (!lensWebview || typeof lensWebview.executeJavaScript !== 'function') return;
  lensWebview
    .executeJavaScript(
      `(()=>{try{var d=document.documentElement,b=document.body;if(d){d.style.overflowX='hidden';d.style.width='100%';d.style.maxWidth='100%';}if(b){b.style.overflowX='hidden';b.style.width='100%';b.style.maxWidth='100%';b.style.boxSizing='border-box';}}catch(_){}})();`,
      false
    )
    .catch(() => {});
}

function syncLensWebviewPresentation() {
  clampLensGuestToHostWidth();
  applyLensWebviewZoom();
}

async function runLensFlow() {
  lensSessionPending = true;
  lensUploadPhase = true;
  lensEmbedFallbackOpened = false;
  if (lensErrorEl) {
    lensErrorEl.hidden = true;
    lensErrorEl.textContent = '';
  }
  activeLensUrl = 'https://lens.google.com/';
  lensLoadingEl.hidden = false;

  try {
    if (typeof lensWebview.stop === 'function') {
      lensWebview.stop();
    }
  } catch {
    /* ignore */
  }

  try {
    const result = await window.snapsense.createLensSession(imageDataUrl);
    const url = result?.url || 'https://lens.google.com/';
    activeLensUrl = url;
    lensUploadPhase = false;
    lensWebview.src = url;
  } catch (e) {
    lensUploadPhase = false;
    lensSessionPending = false;
    lensLoadingEl.hidden = true;
    if (lensErrorEl) {
      lensErrorEl.hidden = false;
      lensErrorEl.textContent =
        e?.message || 'Could not reach Google Lens. Try “Open in browser”.';
    }
    lensWebview.src = 'https://lens.google.com/';
  }
}

async function sendUserMessage() {
  const trimmed = msgEl.value.trim();
  const img = followUpImageDataUrl;
  if ((!trimmed && !img) || busy) return;

  const textForApi = trimmed || (img ? 'Follow-up screenshot.' : '');
  let userContent;
  if (img) {
    userContent = [
      { type: 'text', text: textForApi },
      { type: 'image_url', image_url: { url: img } }
    ];
  } else {
    userContent = trimmed;
  }

  busy = true;
  setSendChromeDisabled(true);
  msgEl.value = '';
  clearFollowUpAttachment();

  messages.push({ role: 'user', content: userContent });
  if (img) {
    appendUserFollowUpBubble(trimmed, img);
  } else {
    appendBubble('user', trimmed);
  }
  setTyping(true);
  addAiLoadingSkeleton();
  try {
    const res = await window.snapsense.panelChat(messages);
    const reply = res.content;
    messages.push({ role: 'assistant', content: reply });
    await streamAssistantReply(reply);
  } catch (e) {
    clearAiLoadingSkeleton();
    const msg =
      e && e.message
        ? e.message
        : 'Something went wrong. Check your connection and API credentials.';
    appendBubble('assistant', msg, 'error');
    console.error('[SnapSense panel]', e);
  } finally {
    setTyping(false);
    busy = false;
    setSendChromeDisabled(false);
    msgEl.focus();
  }
}

function applyMode(mode) {
  const normalized = mode === 'ocr' ? 'text' : mode;
  const m = normalized === 'text' || normalized === 'lens' ? normalized : 'ai';
  sectionAi.hidden = m !== 'ai';
  sectionText.hidden = m !== 'text';
  sectionLens.hidden = m !== 'lens';
  modeLabel.textContent = m === 'ai' ? 'AI' : m === 'text' ? 'Text' : 'Lens';
  if (appWrap) {
    appWrap.dataset.mode = m;
  }
  bannerEl.hidden = m !== 'ai';
  if (modelSelectWrap) {
    modelSelectWrap.hidden = m === 'lens';
  }
  if (m !== 'ai') {
    bannerEl.classList.remove('visible');
  }
  updateModelSettingsVisibility();
  return m;
}

function onOpen(payload) {
  imageDataUrl = payload.imageDataUrl || '';
  const mode = applyMode(payload.mode);

  shotText.src = imageDataUrl;

  if (mode === 'text') {
    syncModelSelectFromMain();
    runTextExtractFlow();
    bannerEl.classList.remove('visible');
    return;
  }

  if (mode === 'lens') {
    runLensFlow();
    bannerEl.classList.remove('visible');
    return;
  }

  chatEl.innerHTML = '';
  clearFollowUpAttachment();
  syncChatJumpButton();
  messages = [];
  const intro =
    'Describe this screenshot and help me with anything visible in it. If you see text, summarize key points.';
  appendUserCaptureInChat(imageDataUrl);
  messages.push({
    role: 'user',
    content: [
      { type: 'text', text: intro },
      { type: 'image_url', image_url: { url: imageDataUrl } }
    ]
  });
  busy = true;
  setSendChromeDisabled(true);
  setTyping(true);
  addAiLoadingSkeleton();
  window.snapsense
    .panelChat(messages)
    .then(async (res) => {
      messages.push({ role: 'assistant', content: res.content });
      await streamAssistantReply(res.content);
    })
    .catch((e) => {
      clearAiLoadingSkeleton();
      const msg =
        e && e.message
          ? e.message
          : 'Could not reach the AI API. Check your network and account limits.';
      appendBubble('assistant', msg, 'error');
      console.error('[SnapSense panel] initial', e);
    })
    .finally(() => {
      busy = false;
      setSendChromeDisabled(false);
      setTyping(false);
      msgEl.focus();
    });
  syncModelSelectFromMain();
  refreshApiBanner();
}

sendBtn.addEventListener('click', () => sendUserMessage());
msgEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendUserMessage();
  }
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    if (modelSettingsOpen) setModelSettingsOpen(false);
    else window.snapsense.closePanel();
  }
});
btnClose.addEventListener('click', () => window.snapsense.closePanel());
textCopyBtn.addEventListener('click', async () => {
  const text = (lastExtractedPlainText || textOutputEl.textContent || '').trim();
  if (!text) return;
  await navigator.clipboard.writeText(text);
});
lensOpenExternalBtn.addEventListener('click', async () => {
  if (!imageDataUrl || !imageDataUrl.startsWith('data:')) {
    return;
  }
  try {
    const r = await window.snapsense.openLensInBrowser(imageDataUrl);
    if (r && r.ok === false && lensErrorEl) {
      lensErrorEl.hidden = false;
      lensErrorEl.textContent =
        'Could not open your default browser. Set a default browser in system settings and try again.';
    } else if (r && r.ok && !r.copied && lensErrorEl) {
      lensErrorEl.hidden = false;
      lensErrorEl.textContent =
        'Clipboard copy failed — open Lens, then use the capture from the SnapSense preview (right‑click image → Copy) or take a new capture.';
    } else if (r && r.ok && r.copied && lensErrorEl) {
      lensErrorEl.hidden = true;
      lensErrorEl.textContent = '';
    }
  } catch (e) {
    console.error('[SnapSense] openLensInBrowser', e);
    if (lensErrorEl) {
      lensErrorEl.hidden = false;
      lensErrorEl.textContent = e?.message || 'Could not open browser.';
    }
  }
});

lensWebview.addEventListener('dom-ready', () => {
  syncLensWebviewPresentation();
});

lensWebview.addEventListener('did-navigate', (e) => {
  if (e.url && /^https?:\/\//i.test(e.url)) {
    activeLensUrl = e.url;
  }
});

lensWebview.addEventListener('did-navigate-in-page', (e) => {
  if (e.url && /^https?:\/\//i.test(e.url)) {
    activeLensUrl = e.url;
  }
});

lensWebview.addEventListener('did-stop-loading', () => {
  if (lensUploadPhase) {
    return;
  }
  const u = getLensWebviewUrl();
  if (lensSessionPending) {
    if (u && u.startsWith('http')) {
      lensLoadingEl.hidden = true;
      lensSessionPending = false;
      if (lensErrorEl) {
        lensErrorEl.hidden = true;
      }
      syncLensWebviewPresentation();
    }
    return;
  }
  if (u && u.startsWith('http')) {
    lensLoadingEl.hidden = true;
    syncLensWebviewPresentation();
  }
});

lensWebview.addEventListener('did-fail-load', (e) => {
  const v = e.validatedURL || '';
  if (!v || v.startsWith('about:')) {
    return;
  }
  lensSessionPending = false;
  lensLoadingEl.hidden = true;
  if (lensErrorEl) {
    lensErrorEl.hidden = false;
    lensErrorEl.textContent =
      'Google Lens often cannot run inside this window. Opening results in your browser…';
  }
  if (!lensEmbedFallbackOpened && imageDataUrl && imageDataUrl.startsWith('data:')) {
    lensEmbedFallbackOpened = true;
    window.snapsense.openLensInBrowser(imageDataUrl);
  }
});

if (modelModeSelect) {
  modelModeSelect.addEventListener('change', async () => {
    const provider = modelModeSelect.value;
    try {
      await window.snapsense.setModelMode(provider);
      await syncModelSelectFromMain();
      if (provider === 'custom') setModelSettingsOpen(true);
      setModelSettingsStatus('Choose a model from the list or enter its ID.');
      await refreshApiBanner();
    } catch (e) {
      console.error('[SnapSense panel] setModelMode', e);
      setModelSettingsStatus(e?.message || 'Could not switch provider.', true);
    }
  });
}

modelSettingsToggle.addEventListener('click', () => {
  setModelSettingsOpen(!modelSettingsOpen);
});

modelCatalogEl.addEventListener('change', () => {
  if (modelCatalogEl.value) modelIdInput.value = modelCatalogEl.value;
});

modelListLoadBtn.addEventListener('click', async () => {
  const provider = modelModeSelect.value;
  modelListLoadBtn.disabled = true;
  setModelSettingsStatus('Loading available models…');
  try {
    const result = await window.snapsense.listModels({
      provider,
      baseUrl: customBaseUrlInput.value,
      apiKey: providerApiKeyInput.value
    });
    if (provider !== modelModeSelect.value) return;
    if (result?.error) throw new Error(result.error);
    const models = result?.models || [];
    modelCatalogEl.replaceChildren(new Option('Choose a model', ''));
    for (const id of models) modelCatalogEl.add(new Option(id, id));
    modelCatalogEl.value = models.includes(modelIdInput.value) ? modelIdInput.value : '';
    setModelSettingsStatus(models.length
      ? `Loaded ${models.length} models. Choose one that accepts images.`
      : 'No models were returned. You can still enter a model ID manually.');
  } catch (error) {
    setModelSettingsStatus(error?.message || 'Could not load models.', true);
  } finally {
    modelListLoadBtn.disabled = false;
  }
});

modelSettingsSaveBtn.addEventListener('click', async () => {
  const provider = modelModeSelect.value;
  modelSettingsSaveBtn.disabled = true;
  setModelSettingsStatus('Saving model…');
  try {
    const result = await window.snapsense.saveModelConfig({
      provider,
      model: modelIdInput.value,
      baseUrl: customBaseUrlInput.value
    });
    if (!result?.ok) throw new Error(result?.error || 'Could not save model.');
    const key = providerApiKeyInput.value.trim();
    if (key) {
      const saved = await window.snapsense.setProviderApiKey(provider, key);
      if (!saved?.ok) throw new Error(saved?.error || 'Could not save API key.');
      providerApiKeyInput.value = '';
    }
    await refreshApiBanner();
    setModelSettingsStatus('Model settings saved. New requests will use this model.');
    if (appWrap.dataset.mode === 'text' && !textRetryBtn.hidden) runTextExtractFlow();
  } catch (error) {
    setModelSettingsStatus(error?.message || 'Could not save model settings.', true);
  } finally {
    modelSettingsSaveBtn.disabled = false;
  }
});

textRetryBtn.addEventListener('click', runTextExtractFlow);

modelKeyClearBtn.addEventListener('click', async () => {
  modelKeyClearBtn.disabled = true;
  try {
    const result = await window.snapsense.setProviderApiKey(modelModeSelect.value, '');
    if (!result?.ok) throw new Error(result?.error || 'Could not forget the key.');
    providerApiKeyInput.value = '';
    await refreshApiBanner();
    setModelSettingsStatus('Saved key removed. An environment key may still be used.');
  } catch (error) {
    setModelSettingsStatus(error?.message || 'Could not forget the key.', true);
  } finally {
    modelKeyClearBtn.disabled = false;
  }
});

const off = window.snapsense.onPanelOpen((payload) => onOpen(payload));
const offFollowUp =
  typeof window.snapsense.onFollowUpCapture === 'function'
    ? window.snapsense.onFollowUpCapture((payload) => {
        console.info('[SnapSense panel] follow-up-capture ipc received', {
          hasUrl: Boolean(payload?.imageDataUrl),
          mime: payload?.mime
        });
        if (payload && payload.imageDataUrl) {
          setFollowUpImageFromDataUrl(payload.imageDataUrl);
        }
      })
    : null;
if (!offFollowUp) {
  console.warn('[SnapSense panel] onFollowUpCapture not available');
}
initFollowUpAttachment();
initStealthToggle().catch((e) => console.warn('[SnapSense panel] initStealthToggle', e));
syncModelSelectFromMain();
if (chatEl) {
  chatEl.addEventListener('scroll', () => syncChatJumpButton(), { passive: true });
  try {
    const ro = new ResizeObserver(() => syncChatJumpButton());
    ro.observe(chatEl);
  } catch {
    /* ignore */
  }
}
if (chatJumpBottomBtn) {
  chatJumpBottomBtn.addEventListener('click', () => forceScrollChatToBottom('smooth'));
}
window.addEventListener('resize', () => {
  syncChatJumpButton();
  if (appWrap && appWrap.dataset.mode === 'lens') {
    applyLensWebviewZoom();
  }
});
window.addEventListener('beforeunload', () => {
  if (typeof off === 'function') off();
  if (typeof offFollowUp === 'function') offFollowUp();
});
// feat: create panel window base @ 14:32:00
// feat: create panel window base @ 14:32:00
// ui: scroll improvements @ 18:25:00
// feat: google lens upload flow @ 18:50:00
// fix: lens upload + redirect handling @ 19:10:00
// ui: responsive panel sizing @ 19:50:00
// fix: lens width + overflow @ 20:10:00
// ui: floating open-in-browser button @ 20:25:00
// refactor: stabilize panel interactions @ 20:55:00
// feat: create panel window base @ 14:29:00
// ui: scroll + container cleanup @ 18:24:00
// feat: google lens upload flow @ 18:49:00
// fix: lens upload + redirect handling @ 19:11:00
// ui: responsive panel sizing improvements @ 19:47:00
// fix: lens width + remove horizontal scroll @ 20:08:00
// ui: floating open-in-browser button @ 20:23:00
// refactor: stabilize panel interactions + cleanup @ 20:56:00
// feat: create panel window base @ 14:29:00
// ui: scroll + container cleanup @ 18:24:00
// feat: google lens upload flow @ 18:49:00
// fix: lens upload + redirect handling @ 19:11:00
// ui: responsive panel sizing improvements @ 19:47:00
// fix: lens width + remove horizontal scroll @ 20:08:00
// ui: floating open-in-browser button @ 20:23:00
// refactor: stabilize panel interactions + cleanup @ 20:56:00
// feat: create panel window base @ 14:29:00
// ui: scroll + container cleanup @ 18:24:00
// feat: google lens upload flow @ 18:49:00
// fix: lens upload + redirect handling @ 19:11:00
// ui: responsive panel sizing improvements @ 19:47:00
// fix: lens width + remove horizontal scroll @ 20:08:00
// ui: floating open-in-browser button @ 20:23:00
// refactor: stabilize panel interactions + cleanup @ 20:56:00
