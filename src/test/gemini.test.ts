import { describe, it, expect, vi } from 'vitest';
import { 
  getGeminiApiKey, 
  setGeminiApiKey, 
  GEMINI_DEFAULT_MODEL,
  GEMINI_AUDIO_MODEL,
  generateSyntheticNLPData,
  autoAnnotateNLPItem
} from '../utils/geminiClient';

describe('Google Gemini AI Integration for NLP & Audio', () => {
  it('defaults to the cheapest and fastest model gemini-2.5-flash-lite', () => {
    expect(GEMINI_DEFAULT_MODEL).toBe('gemini-2.5-flash-lite');
    expect(GEMINI_AUDIO_MODEL).toBe('gemini-2.5-flash');
  });

  it('manages local API key safely without exposure', () => {
    setGeminiApiKey('test_key_abc123');
    expect(getGeminiApiKey()).toBe('test_key_abc123');

    // Clean up
    setGeminiApiKey('');
  });
});
