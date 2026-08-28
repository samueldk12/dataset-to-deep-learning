import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ExternalLink, 
  Cpu, 
  Zap, 
  ShieldCheck, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Server, 
  Flame, 
  Bot,
  Layers,
  Sliders
} from 'lucide-react';
import { 
  UniversalAISettings, 
  loadUniversalAISettings, 
  saveUniversalAISettings, 
  testProviderConnection 
} from '../../utils/aiSettings';
import { setGeminiApiKey } from '../../utils/geminiClient';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProvider?: 'gemini' | 'openai' | 'anthropic' | 'groq' | 'huggingface' | 'ollama';
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  initialProvider = 'gemini',
}) => {
  const [settings, setSettings] = useState<UniversalAISettings>(loadUniversalAISettings());
  const [activeTab, setActiveTab] = useState<'gemini' | 'openai' | 'anthropic' | 'groq' | 'huggingface' | 'ollama'>(initialProvider);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string } | null>>({});

  useEffect(() => {
    if (isOpen) {
      setSettings(loadUniversalAISettings());
      setTestResults({});
      if (initialProvider) setActiveTab(initialProvider);
    }
  }, [isOpen, initialProvider]);

  if (!isOpen) return null;

  const toggleShowKey = (provider: string) => {
    setShowKey((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleSave = () => {
    saveUniversalAISettings(settings);
    if (settings.gemini.apiKey) {
      setGeminiApiKey(settings.gemini.apiKey);
    }
    onClose();
  };

  const handleTestConnection = async (provider: 'gemini' | 'openai' | 'anthropic' | 'groq' | 'huggingface' | 'ollama') => {
    setIsTesting(true);
    setTestResults((prev) => ({ ...prev, [provider]: null }));
    try {
      const config = settings[provider];
      const res = await testProviderConnection(provider, config);
      setTestResults((prev) => ({ ...prev, [provider]: res }));
      if (res.success && provider === 'gemini' && settings.gemini.apiKey) {
        setGeminiApiKey(settings.gemini.apiKey);
      }
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [provider]: { success: false, message: err.message || 'Erro ao testar conexão.' },
      }));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Configurações de IA & Chaves de API
                <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
                  Multimodal & LLMs
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Configure suas chaves de API dos provedores de Inteligência Artificial para auto-anotação e síntese
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Provider Tabs Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2 gap-1 overflow-x-auto scrollbar-none text-xs">
          {[
            { id: 'gemini', label: 'Google Gemini', icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />, badge: 'Padrão' },
            { id: 'openai', label: 'OpenAI (GPT / Whisper)', icon: <Bot className="w-3.5 h-3.5 text-emerald-400" /> },
            { id: 'anthropic', label: 'Anthropic (Claude)', icon: <Cpu className="w-3.5 h-3.5 text-amber-400" /> },
            { id: 'groq', label: 'Groq Cloud', icon: <Zap className="w-3.5 h-3.5 text-orange-400" />, badge: 'Rápido' },
            { id: 'huggingface', label: 'Hugging Face', icon: <Layers className="w-3.5 h-3.5 text-yellow-400" /> },
            { id: 'ollama', label: 'Ollama Local', icon: <Server className="w-3.5 h-3.5 text-cyan-400" /> },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-t-xl font-semibold border-b-2 transition-all shrink-0 ${
                  isSelected
                    ? 'border-purple-500 text-white bg-slate-900 shadow-sm'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-mono">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300">
          {/* TAB 1: GOOGLE GEMINI */}
          {activeTab === 'gemini' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/40 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-purple-200">
                    Google Gemini 2.5 Flash Lite • O Modelo Mais Econômico do Mercado
                  </p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Utilizado no AnnotateX Studio para sintetizar datasets de NLP (SQuAD, Text-to-SQL, Chain-of-Thought, Tool Calling) e transcrever áudios com diarização e acústica. Custo de apenas <b>$0.075 por 1 Milhão de tokens</b>.
                  </p>
                </div>
              </div>

              {/* Gemini API Key Input */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-yellow-400" />
                    Chave de API do Google Gemini (API Key)
                  </span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    Gerar Chave no Google AI Studio <ExternalLink className="w-3 h-3" />
                  </a>
                </label>

                <div className="relative">
                  <input
                    type={showKey.gemini ? 'text' : 'password'}
                    value={settings.gemini.apiKey}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        gemini: { ...prev.gemini, apiKey: e.target.value },
                      }))
                    }
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-10 py-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('gemini')}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showKey.gemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Model Choice */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Modelo Padrão do Gemini:</label>
                <select
                  value={settings.gemini.defaultModel}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      gemini: { ...prev.gemini, defaultModel: e.target.value },
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite (Recomendado • $0.075/1M tokens)</option>
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Alta Precisão Multimodal)</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro (Raciocínio Complexo Extremo)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 2: OPENAI */}
          {activeTab === 'openai' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex items-start gap-3">
                <Bot className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-emerald-200">OpenAI API (GPT-4o, GPT-4o-mini & Whisper)</p>
                  <p className="text-slate-400 text-[11px]">
                    Permite utilizar modelos da OpenAI para gerar dados sintéticos, embeddings e transcrições Whisper.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-yellow-400" />
                    OpenAI API Key
                  </span>
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    Obter Chave OpenAI <ExternalLink className="w-3 h-3" />
                  </a>
                </label>

                <div className="relative">
                  <input
                    type={showKey.openai ? 'text' : 'password'}
                    value={settings.openai.apiKey}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        openai: { ...prev.openai, apiKey: e.target.value },
                      }))
                    }
                    placeholder="sk-proj-..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-10 py-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('openai')}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showKey.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Modelo Padrão OpenAI:</label>
                <select
                  value={settings.openai.defaultModel}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      openai: { ...prev.openai, defaultModel: e.target.value },
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="gpt-4o-mini">gpt-4o-mini (Econômico e Rápido)</option>
                  <option value="gpt-4o">gpt-4o (Omni Multimodal)</option>
                  <option value="whisper-1">whisper-1 (Áudio STT)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 3: ANTHROPIC */}
          {activeTab === 'anthropic' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 flex items-start gap-3">
                <Cpu className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-200">Anthropic Claude API (Claude 3.5 Sonnet / Haiku)</p>
                  <p className="text-slate-400 text-[11px]">
                    Excelente para geração de raciocínio de código Text-to-SQL e Function Calling complexo.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-yellow-400" />
                    Anthropic API Key
                  </span>
                  <a
                    href="https://console.anthropic.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    Console Anthropic <ExternalLink className="w-3 h-3" />
                  </a>
                </label>

                <div className="relative">
                  <input
                    type={showKey.anthropic ? 'text' : 'password'}
                    value={settings.anthropic.apiKey}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        anthropic: { ...prev.anthropic, apiKey: e.target.value },
                      }))
                    }
                    placeholder="sk-ant-api..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-10 py-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('anthropic')}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showKey.anthropic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Modelo Claude:</label>
                <select
                  value={settings.anthropic.defaultModel}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      anthropic: { ...prev.anthropic, defaultModel: e.target.value },
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="claude-3-5-haiku-20241022">claude-3-5-haiku (Rápido e Barato)</option>
                  <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet (Estado da Arte em Raciocínio)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 4: GROQ */}
          {activeTab === 'groq' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-xl bg-orange-950/30 border border-orange-800/40 flex items-start gap-3">
                <Zap className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-orange-200">Groq Cloud (LPU Ultra-Fast Inference)</p>
                  <p className="text-slate-400 text-[11px]">
                    Inferência ultrarrápida com centenas de tokens por segundo em Llama 3.3 e Whisper.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-yellow-400" />
                    Groq API Key
                  </span>
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    Console Groq <ExternalLink className="w-3 h-3" />
                  </a>
                </label>

                <div className="relative">
                  <input
                    type={showKey.groq ? 'text' : 'password'}
                    value={settings.groq.apiKey}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        groq: { ...prev.groq, apiKey: e.target.value },
                      }))
                    }
                    placeholder="gsk_..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-10 py-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('groq')}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showKey.groq ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: OLLAMA LOCAL */}
          {activeTab === 'ollama' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 flex items-start gap-3">
                <Server className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-cyan-200">Ollama / Servidor Local de LLMs (100% Offline & Grátis)</p>
                  <p className="text-slate-400 text-[11px]">
                    Execute modelos locais diretamente no seu computador sem enviar dados para a nuvem.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-200">Base URL do Ollama:</label>
                  <input
                    type="text"
                    value={settings.ollama.baseUrl}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        ollama: { ...prev.ollama, baseUrl: e.target.value },
                      }))
                    }
                    placeholder="http://localhost:11434"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-200">Nome do Modelo (ex: llama3.2, mistral):</label>
                  <input
                    type="text"
                    value={settings.ollama.model}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        ollama: { ...prev.ollama, model: e.target.value },
                      }))
                    }
                    placeholder="llama3.2"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Connection Test Result Box */}
          {testResults[activeTab] && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs animate-fade-in ${
                testResults[activeTab]?.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/40 border-red-500/40 text-red-300'
              }`}
            >
              {testResults[activeTab]?.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{testResults[activeTab]?.message}</span>
            </div>
          )}

          {/* Privacy & Security Note */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Suas chaves são mantidas no armazenamento local do seu navegador (`localStorage`) e no `.env` da sua máquina, e são protegidas contra commits no Git.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={() => handleTestConnection(activeTab)}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Testando...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <span>Testar Conexão</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Salvar Todas as Chaves</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
