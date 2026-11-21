const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { after, before, test } = require('node:test');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snapsense-model-test-'));
const originalLoad = Module._load;
const originalFetch = global.fetch;
let ai;
let credentials;

before(() => {
  Module._load = function load(request, parent, isMain) {
    if (request === 'electron') {
      return {
        app: { getPath: () => tempDir },
        safeStorage: {
          isEncryptionAvailable: () => true,
          encryptString: (value) => Buffer.from(`encrypted:${value}`),
          decryptString: (value) => value.toString().replace(/^encrypted:/, '')
        }
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  ai = require('../src/aiClient');
  credentials = require('../src/secureCredentials');
});

after(() => {
  Module._load = originalLoad;
  global.fetch = originalFetch;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('saves provider models independently and validates custom endpoints', () => {
  ai.setModelConfig({ provider: 'groq', model: 'qwen/qwen3.8-27b' });
  ai.setModelConfig({ provider: 'custom', model: 'local-vision', baseUrl: 'http://localhost:1234/v1/' });
  assert.deepEqual(ai.getModelSettings(), {
    mode: 'custom',
    models: { groq: 'qwen/qwen3.8-27b', openai: 'gpt-4o-mini', custom: 'local-vision' },
    customBaseUrl: 'http://localhost:1234/v1'
  });
  assert.throws(() => ai.setModelConfig({ provider: 'custom', model: 'm', baseUrl: 'http://example.com/v1' }), /HTTPS/);
  assert.throws(() => ai.setModelConfig({ provider: 'custom', model: 'm', baseUrl: 'https://user:pass@example.com/v1' }), /credentials/);
  assert.equal(ai.getModelSettings().models.custom, 'local-vision');
});

test('loads a provider model list and supports a keyless local endpoint', async () => {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => ({ data: [{ id: 'vision-b' }, { id: 'vision-a' }, { id: 'vision-a' }] }) };
  };
  assert.deepEqual(await ai.listAvailableModels({ provider: 'custom' }), { models: ['vision-a', 'vision-b'] });
  assert.equal(calls[0].url, 'http://localhost:1234/v1/models');
  assert.deepEqual(calls[0].options.headers, {});
  assert.equal((await ai.listAvailableModels({ provider: 'groq' })).error, 'Add a Groq API key first.');
});

test('saves keys separately and routes screenshot requests to the chosen model', async () => {
  credentials.setProviderApiKey('groq', 'gsk_test_key_with_enough_length');
  credentials.setProviderApiKey('openai', 'sk-test-key-with-enough-length');
  assert.equal(credentials.getProviderApiKeySync('groq'), 'gsk_test_key_with_enough_length');
  assert.equal(credentials.getProviderApiKeySync('openai'), 'sk-test-key-with-enough-length');
  ai.setModelMode('custom');
  global.fetch = async (url, options) => {
    assert.equal(url, 'http://localhost:1234/v1/chat/completions');
    assert.equal(JSON.parse(options.body).model, 'local-vision');
    assert.equal(options.headers.Authorization, undefined);
    return { ok: true, text: async () => JSON.stringify({ choices: [{ message: { content: 'Found a cat.' } }] }) };
  };
  assert.deepEqual(await ai.requestAi([{ role: 'user', content: 'What is in this image?' }]), { content: 'Found a cat.' });
  credentials.clearProviderApiKey('openai');
  assert.equal(credentials.getProviderApiKeySync('openai'), '');
  assert.equal(credentials.getProviderApiKeySync('groq'), 'gsk_test_key_with_enough_length');
});
