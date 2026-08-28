import { describe, it, expect } from 'vitest';
import { 
  loadUniversalAISettings, 
  saveUniversalAISettings, 
  getProviderApiKey,
  testProviderConnection 
} from '../utils/aiSettings';

describe('Universal AI Settings & API Keys Manager', () => {
  it('loads default settings with all supported providers', () => {
    const settings = loadUniversalAISettings();
    expect(settings.gemini).toBeDefined();
    expect(settings.openai).toBeDefined();
    expect(settings.anthropic).toBeDefined();
    expect(settings.groq).toBeDefined();
    expect(settings.ollama).toBeDefined();
    expect(settings.gemini.defaultModel).toBe('gemini-2.5-flash-lite');
  });

  it('saves and retrieves provider API keys securely in local storage', () => {
    const settings = loadUniversalAISettings();
    settings.openai.apiKey = 'sk-test-openai-12345';
    settings.groq.apiKey = 'gsk_test_groq_12345';
    saveUniversalAISettings(settings);

    expect(getProviderApiKey('openai')).toBe('sk-test-openai-12345');
    expect(getProviderApiKey('groq')).toBe('gsk_test_groq_12345');
  });

  it('validates provider connection error handling when key is missing', async () => {
    const res = await testProviderConnection('openai', { apiKey: '', defaultModel: 'gpt-4o' });
    expect(res.success).toBe(false);
    expect(res.message).toContain('Insira a chave da OpenAI');
  });
});
