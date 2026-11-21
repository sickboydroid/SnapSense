const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { getProviderApiKeySync } = require('./secureCredentials');

const DUMMY_GROQ_KEY = 'groq-dummy-replace-with-your-key';
const DEFAULT_GROQ_MODEL = 'qwen/qwen3.8-27b';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const BASE_URLS = {
  groq: 'https://api.groq.com/openai/v1',
  openai: 'https://api.openai.com/v1'
};
const PROMPTS_PATH = path.join(__dirname, '..', 'config', 'ai-prompts.json');

/**
 * Settings are stored in the OS user-data directory so they survive asar packaging
 * and can be written to in production builds (the asar archive is read-only).
 * Falls back to the repo config/ folder in development for convenience.
 */
function getSettingsPath() {
  try {
    const userData = app.getPath('userData');
    return path.join(userData, 'ai-settings.json');
  } catch {
    // app not ready yet (unit-test context) – fall back to dev path
    return path.join(__dirname, '..', 'config', 'ai-settings.json');
  }
}

function getSettingsPathFallback() {
  return path.join(__dirname, '..', 'config', 'ai-settings.json');
}

function getGroqKey() {
  const saved = getProviderApiKeySync('groq');
  if (saved) return saved;
  const env = (process.env.GROQ_KEY || '').trim();
  if (env) return env;
  return DUMMY_GROQ_KEY;
}

function hasUsableGroqKey(key) {
  return Boolean(key && key.length >= 20 && key !== DUMMY_GROQ_KEY && !/^your[_-]/i.test(key));
}

function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Read settings: try userData first, fall back to bundled config/ for initial defaults.
 */
function readSettings() {
  const primary = getSettingsPath();
  const settings = readJsonSafe(primary, null);
  if (settings !== null) return settings;
  // First run in production: seed from bundled defaults if available
  const fallback = readJsonSafe(getSettingsPathFallback(), {});
  return fallback;
}

function writeSettings(settings) {
  const filePath = getSettingsPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
}

function getModelMode() {
  const settings = readSettings();
  if (settings.modelMode === 'openai' || settings.modelMode === 'custom') return settings.modelMode;
  return 'groq';
}

function setModelMode(mode) {
  if (!['groq', 'openai', 'custom'].includes(mode)) throw new Error('Unknown AI provider.');
  const settings = readSettings();
  settings.modelMode = mode;
  writeSettings(settings);
  return mode;
}

function getGroqModel() {
  const settings = readSettings();
  return String(settings.groqModel || process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL).trim();
}

function getOpenAiModel() {
  const settings = readSettings();
  const fromFile = (settings.openaiModel || '').trim();
  if (fromFile) return fromFile;
  const env = (process.env.OPENAI_MODEL || '').trim();
  return env || DEFAULT_OPENAI_MODEL;
}

function getModelSettings() {
  const settings = readSettings();
  return {
    mode: getModelMode(),
    models: {
      groq: getGroqModel(),
      openai: getOpenAiModel(),
      custom: String(settings.customModel || '').trim()
    },
    customBaseUrl: String(settings.customBaseUrl || '').trim()
  };
}

function normalizeCustomBaseUrl(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) throw new Error('Enter a base URL, such as http://localhost:1234/v1.');
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Enter a valid base URL.');
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new Error('Use HTTPS, or HTTP on localhost.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('The base URL cannot contain credentials, a query, or a fragment.');
  }
  return url.href.replace(/\/+$/, '');
}

function setModelConfig({ provider, model, baseUrl }) {
  if (!['groq', 'openai', 'custom'].includes(provider)) throw new Error('Unknown AI provider.');
  const id = typeof model === 'string' ? model.trim() : '';
  if (!id || id.length > 200 || /[\x00-\x1f]/.test(id)) throw new Error('Enter a valid model ID.');
  const settings = readSettings();
  const field = { groq: 'groqModel', openai: 'openaiModel', custom: 'customModel' }[provider];
  settings[field] = id;
  if (provider === 'custom') settings.customBaseUrl = normalizeCustomBaseUrl(baseUrl);
  settings.modelMode = provider;
  writeSettings(settings);
  return getModelSettings();
}

function getStealthMode() {
  const settings = readSettings();
  return Boolean(settings.stealthMode);
}

function setStealthMode(enabled) {
  const value = Boolean(enabled);
  const settings = readSettings();
  settings.stealthMode = value;
  writeSettings(settings);
  return value;
}

function getOpenAiKey() {
  const saved = getProviderApiKeySync('openai');
  if (saved) return saved;
  const env = (process.env.OPENAI_API_KEY || '').trim();
  return env;
}

function getCustomKey() {
  return getProviderApiKeySync('custom') || (process.env.SNAPSENSE_CUSTOM_API_KEY || '').trim();
}

function getPrompt(name) {
  const defaults = {
    chatSystemPrompt:
      'You are SnapSense AI assistant. Give direct, practical answers about the screenshot. If output is JSON, format it in markdown code blocks.',
    ocrSystemPrompt:
      'You are an OCR extractor. Extract all visible text exactly as seen. Do not explain. Do not summarize. Preserve line breaks and order. Return only plain text.'
  };
  const prompts = readJsonSafe(PROMPTS_PATH, defaults);
  if (name === 'ocr') return String(prompts.ocrSystemPrompt || defaults.ocrSystemPrompt);
  return String(prompts.chatSystemPrompt || defaults.chatSystemPrompt);
}

function getAiKeyStatus() {
  const mode = getModelMode();
  if (mode === 'custom') {
    const settings = getModelSettings();
    const configured = Boolean(settings.models.custom && settings.customBaseUrl);
    return { configured, isDummy: !configured, provider: 'custom' };
  }
  if (mode === 'openai') {
    const key = getOpenAiKey();
    const isDummy = !key || key.length < 20;
    return {
      configured: Boolean(key && !isDummy),
      isDummy,
      provider: 'openai'
    };
  }
  const key = getGroqKey();
  const isDummy = !hasUsableGroqKey(key);
  return { configured: !isDummy, isDummy, provider: 'groq' };
}

async function listAvailableModels({ provider, baseUrl, apiKey } = {}) {
  if (!['groq', 'openai', 'custom'].includes(provider)) return { error: 'Choose a provider.' };
  let endpoint;
  try {
    endpoint = provider === 'custom'
      ? normalizeCustomBaseUrl(baseUrl || getModelSettings().customBaseUrl)
      : BASE_URLS[provider];
  } catch (error) {
    return { error: error.message };
  }
  const key = typeof apiKey === 'string' && apiKey.trim()
    ? apiKey.trim()
    : provider === 'groq' ? getGroqKey() : provider === 'openai' ? getOpenAiKey() : getCustomKey();
  if (provider === 'groq' && !hasUsableGroqKey(key)) return { error: 'Add a Groq API key first.' };
  if (provider === 'openai' && (!key || key.length < 20)) return { error: 'Add an OpenAI API key first.' };

  try {
    const response = await fetch(`${endpoint}/models`, {
      headers: key ? { Authorization: `Bearer ${key}` } : {},
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) return { error: `Could not load models (HTTP ${response.status}).` };
    const data = await response.json();
    if (!Array.isArray(data?.data)) return { error: 'This endpoint did not return a model list.' };
    const models = [...new Set(data.data.map((item) => item?.id).filter((id) =>
      typeof id === 'string' && id.length > 0 && id.length <= 200
    ))].sort((a, b) => a.localeCompare(b));
    return { models };
  } catch (error) {
    return { error: error?.message || 'Could not load models.' };
  }
}

async function requestGroq(messages, maxTokens = 4096, logger = null) {
  const apiKey = getGroqKey();
  if (!hasUsableGroqKey(apiKey)) {
    return {
      error: 'Groq API key is not configured.'
    };
  }
  const model = getGroqModel();
  if (logger?.debug) {
    const userMessageCount = Array.isArray(messages)
      ? messages.filter((m) => m && m.role === 'user').length
      : 0;
    logger.debug('aiClient', 'Groq request', { userMessageCount });
  }

  const body = {
    model,
    messages,
    max_tokens: maxTokens
  };
  let res;
  try {
    res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
    });
  } catch (e) {
    if (logger?.error) {
      logger.error('aiClient', 'Groq fetch failed', { message: e.message, model });
    }
    return { error: e.message || 'Network error - check your connection.' };
  }

  const text = await res.text();
  if (!res.ok) {
    if (logger?.error) {
      logger.error('aiClient', 'Groq HTTP error', { status: res.status, body: text.slice(0, 500), model });
    }
    return { error: `Groq error ${res.status}: ${text.slice(0, 240)}` };
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    if (logger?.error) {
      logger.error('aiClient', 'Groq parse error', e);
    }
    return { error: 'Invalid response from Groq.' };
  }
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    if (logger?.error) {
      logger.error('aiClient', 'Groq unexpected shape', data);
    }
    return { error: 'Unexpected Groq response.' };
  }

  if (logger?.info) {
    logger.info('aiClient', 'Model resolved', { model });
  }
  return { content };
}

async function requestOpenAi(messages, maxTokens = 4096, logger = null, custom = false) {
  const apiKey = custom ? getCustomKey() : getOpenAiKey();
  if (!custom && (!apiKey || apiKey.length < 20)) {
    return { error: 'OpenAI API key is not configured.' };
  }
  const settings = custom ? getModelSettings() : null;
  const model = custom ? settings.models.custom : getOpenAiModel();
  let baseUrl;
  try {
    baseUrl = custom ? normalizeCustomBaseUrl(settings.customBaseUrl) : BASE_URLS.openai;
  } catch (error) {
    return { error: error.message };
  }
  if (!model) return { error: 'Choose a model ID first.' };
  const provider = custom ? 'Custom API' : 'OpenAI';
  if (logger?.debug) {
    const userMessageCount = Array.isArray(messages)
      ? messages.filter((m) => m && m.role === 'user').length
      : 0;
    logger.debug('aiClient', `${provider} request`, { userMessageCount, model });
  }

  const body = {
    model,
    messages,
    max_tokens: maxTokens
  };
  let res;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
    });
  } catch (e) {
    if (logger?.error) {
      logger.error('aiClient', `${provider} fetch failed`, { message: e.message, model });
    }
    return { error: e.message || 'Network error - check your connection.' };
  }

  const text = await res.text();
  if (!res.ok) {
    if (logger?.error) {
      logger.error('aiClient', `${provider} HTTP error`, {
        status: res.status,
        body: text.slice(0, 500),
        model
      });
    }
    return { error: `${provider} error ${res.status}: ${text.slice(0, 240)}` };
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    if (logger?.error) {
      logger.error('aiClient', `${provider} parse error`, e);
    }
    return { error: `Invalid response from ${provider}.` };
  }
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    if (logger?.error) {
      logger.error('aiClient', `${provider} unexpected shape`, data);
    }
    return { error: `Unexpected ${provider} response.` };
  }

  if (logger?.info) {
    logger.info('aiClient', 'Model resolved', { model, provider: custom ? 'custom' : 'openai' });
  }
  return { content };
}

async function requestAi(messages, maxTokens = 4096, logger = null) {
  const modelMode = getModelMode();
  if (modelMode === 'custom') {
    return requestOpenAi(messages, maxTokens, logger, true);
  }
  if (modelMode === 'openai') {
    return requestOpenAi(messages, maxTokens, logger);
  }
  return requestGroq(messages, maxTokens, logger);
}

module.exports = {
  getAiKeyStatus,
  getModelMode,
  setModelMode,
  getOpenAiModel,
  getModelSettings,
  setModelConfig,
  listAvailableModels,
  getStealthMode,
  setStealthMode,
  getPrompt,
  requestAi
};
