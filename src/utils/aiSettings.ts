/**
 * Universal AI Settings & API Keys Manager for AnnotateX Studio
 * Manages API keys, model selections, and connection test utilities for all supported AI providers.
 */

export interface AIProviderConfig {
  apiKey: string;
  defaultModel: string;
  baseUrl?: string;
  isCustomUrl?: boolean;
}

export interface UniversalAISettings {
  gemini: AIProviderConfig;
  openai: AIProviderConfig;
  anthropic: AIProviderConfig;
  groq: AIProviderConfig;
  huggingface: AIProviderConfig;
  ollama: {
    baseUrl: string;
    model: string;
  };
}

const DEFAULT_SETTINGS: UniversalAISettings = {
  gemini: {
    apiKey: '',
    defaultModel: 'gemini-2.5-flash-lite',
  },
  openai: {
    apiKey: '',
    defaultModel: 'gpt-4o-mini',
  },
  anthropic: {
    apiKey: '',
    defaultModel: 'claude-3-5-haiku-20241022',
  },
  groq: {
    apiKey: '',
    defaultModel: 'llama-3.3-70b-versatile',
  },
  huggingface: {
    apiKey: '',
    defaultModel: 'meta-llama/Llama-3.2-3B-Instruct',
  },
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'llama3.2',
  },
};

const STORAGE_KEY = 'annotatex_universal_ai_settings';

export function loadUniversalAISettings(): UniversalAISettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Initialize with legacy keys if present
      const geminiKey = localStorage.getItem('annotatex_gemini_api_key') || (import.meta.env.VITE_GEMINI_API_KEY || '');
      const initial = { ...DEFAULT_SETTINGS };
      if (geminiKey) initial.gemini.apiKey = geminiKey;
      return initial;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      gemini: { ...DEFAULT_SETTINGS.gemini, ...(parsed.gemini || {}) },
      openai: { ...DEFAULT_SETTINGS.openai, ...(parsed.openai || {}) },
      anthropic: { ...DEFAULT_SETTINGS.anthropic, ...(parsed.anthropic || {}) },
      groq: { ...DEFAULT_SETTINGS.groq, ...(parsed.groq || {}) },
      huggingface: { ...DEFAULT_SETTINGS.huggingface, ...(parsed.huggingface || {}) },
      ollama: { ...DEFAULT_SETTINGS.ollama, ...(parsed.ollama || {}) },
    };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveUniversalAISettings(settings: UniversalAISettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    if (settings.gemini.apiKey) {
      localStorage.setItem('annotatex_gemini_api_key', settings.gemini.apiKey);
    }
  } catch (e) {
    console.error('Failed to save AI settings:', e);
  }
}

export function getProviderApiKey(provider: keyof UniversalAISettings): string {
  const settings = loadUniversalAISettings();
  if (provider === 'gemini') {
    return settings.gemini.apiKey || (import.meta.env.VITE_GEMINI_API_KEY || '');
  }
  if (provider === 'ollama') return '';
  return (settings[provider] as AIProviderConfig)?.apiKey || '';
}

/**
 * Tests connection to a specific provider
 */
export async function testProviderConnection(
  provider: keyof UniversalAISettings,
  config: AIProviderConfig | { baseUrl: string; model: string }
): Promise<{ success: boolean; message: string }> {
  if (provider === 'gemini') {
    const apiKey = (config as AIProviderConfig).apiKey || getProviderApiKey('gemini');
    try {
      const res = await fetch('http://localhost:5000/api/gemini/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        return { success: true, message: `Google Gemini 2.5 Flash conectado com sucesso! Modelo: ${data.model}` };
      }
      return { success: false, message: data.error || 'Falha ao validar chave Gemini.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erro de conexão com o servidor local.' };
    }
  }

  if (provider === 'openai') {
    const apiKey = (config as AIProviderConfig).apiKey;
    if (!apiKey) return { success: false, message: 'Insira a chave da OpenAI (sk-...)' };
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        return { success: true, message: 'OpenAI API conectada com sucesso!' };
      }
      const err = await res.json();
      return { success: false, message: err.error?.message || 'Chave da OpenAI inválida.' };
    } catch (e: any) {
      return { success: false, message: 'Erro de rede ao conectar com OpenAI.' };
    }
  }

  if (provider === 'groq') {
    const apiKey = (config as AIProviderConfig).apiKey;
    if (!apiKey) return { success: false, message: 'Insira a chave da Groq (gsk_...)' };
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        return { success: true, message: 'Groq Cloud conectado com sucesso!' };
      }
      const err = await res.json();
      return { success: false, message: err.error?.message || 'Chave da Groq inválida.' };
    } catch (e: any) {
      return { success: false, message: 'Erro de rede ao conectar com Groq.' };
    }
  }

  if (provider === 'ollama') {
    const baseUrl = (config as { baseUrl: string }).baseUrl || 'http://localhost:11434';
    try {
      const res = await fetch(`${baseUrl}/api/tags`);
      if (res.ok) {
        const data = await res.json();
        const modelsCount = data.models?.length || 0;
        return { success: true, message: `Ollama Local conectado! ${modelsCount} modelos encontrados.` };
      }
      return { success: false, message: `Ollama respondeu com status ${res.status}` };
    } catch (e: any) {
      return { success: false, message: `Não foi possível conectar ao Ollama em ${baseUrl}. Verifique se o serviço está rodando.` };
    }
  }

  if (provider === 'mcp' as any) {
    try {
      const res = await fetch('http://localhost:5000/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      });
      if (res.ok) {
        const data = await res.json();
        const toolsCount = data.result?.tools?.length || 0;
        return { success: true, message: `MCP Server Online! ${toolsCount} ferramentas ativas via JSON-RPC.` };
      }
      return { success: false, message: `Servidor MCP respondeu com status ${res.status}` };
    } catch (e: any) {
      return { success: false, message: 'Servidor Python MCP offline na porta 5000. Inicie com python server/app.py' };
    }
  }

  return { success: true, message: `Configuração para ${provider} salva localmente.` };
}
