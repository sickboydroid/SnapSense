const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');

const TOKEN_FILES = {
  openai: 'openai-api.token',
  groq: 'groq-api.token',
  custom: 'custom-api.token'
};

function tokenFilePath(provider) {
  const name = TOKEN_FILES[provider];
  if (!name) throw new Error('Unknown AI provider.');
  return path.join(app.getPath('userData'), name);
}

/**
 * Persists a provider key using the OS secret store through Electron safeStorage.
 */
function setProviderApiKey(provider, plain) {
  const filePath = tokenFilePath(provider);
  const trimmed = typeof plain === 'string' ? plain.trim() : '';
  if (!trimmed) {
    clearProviderApiKey(provider);
    return { ok: true, cleared: true };
  }
  if (!safeStorage.isEncryptionAvailable()) {
    return {
      ok: false,
      error: 'OS encryption is not available; the API key cannot be stored securely.'
    };
  }
  try {
    const encrypted = safeStorage.encryptString(trimmed);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, encrypted, { mode: 0o600 });
    fs.chmodSync(filePath, 0o600);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Could not save API key.' };
  }
}

function getProviderApiKeySync(provider) {
  const p = tokenFilePath(provider);
  if (!fs.existsSync(p)) {
    return '';
  }
  if (!safeStorage.isEncryptionAvailable()) {
    return '';
  }
  try {
    const buf = fs.readFileSync(p);
    return safeStorage.decryptString(buf);
  } catch {
    return '';
  }
}

function clearProviderApiKey(provider) {
  const p = tokenFilePath(provider);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
  }
}

module.exports = {
  setProviderApiKey,
  getProviderApiKeySync,
  clearProviderApiKey,
  setOpenAiApiKey: (plain) => setProviderApiKey('openai', plain),
  getOpenAiApiKeySync: () => getProviderApiKeySync('openai')
};
