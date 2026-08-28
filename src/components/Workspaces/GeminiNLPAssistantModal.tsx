import React, { useState } from 'react';
import { 
  Sparkles, 
  Cpu, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Play, 
  RefreshCw, 
  Plus, 
  Database, 
  MessageSquare, 
  Code, 
  Brain, 
  Wrench,
  HelpCircle
} from 'lucide-react';
import { DatasetProject, ExtractiveQAItem, TextToSQLItem, ChainOfThoughtItem, ToolCallItem, RAGRetrievalItem } from '../../types/dataset';
import { generateSyntheticNLPData, GEMINI_DEFAULT_MODEL } from '../../utils/geminiClient';

interface GeminiNLPAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: DatasetProject;
  activeTaskType: string;
  onApplyGeneratedData: (taskType: string, newItems: any[]) => void;
}

export const GeminiNLPAssistantModal: React.FC<GeminiNLPAssistantModalProps> = ({
  isOpen,
  onClose,
  project,
  activeTaskType,
  onApplyGeneratedData,
}) => {
  const [taskType, setTaskType] = useState(activeTaskType || 'extractive_qa');
  const [domain, setDomain] = useState('Atendimento ao Cliente & SAC');
  const [count, setCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const results = await generateSyntheticNLPData(
        taskType,
        domain,
        count,
        project.classes.map((c) => c.name)
      );
      setGeneratedItems(results);
    } catch (err: any) {
      setError(err.message || 'Falha ao gerar dados sintéticos com Gemini.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsertIntoDataset = () => {
    if (!generatedItems.length) return;

    if (taskType === 'extractive_qa') {
      const formatted: ExtractiveQAItem[] = generatedItems.map((item, idx) => {
        const ctx = item.context || '';
        const ans = item.answerText || '';
        const start = ctx.indexOf(ans);
        return {
          id: `qa_gemini_${Date.now()}_${idx}`,
          context: ctx,
          question: item.question || 'Pergunta',
          answerText: ans,
          answerStart: start >= 0 ? start : 0,
          answerEnd: start >= 0 ? start + ans.length : ans.length,
        };
      });
      onApplyGeneratedData(taskType, formatted);
    } else if (taskType === 'text_to_sql') {
      const formatted: TextToSQLItem[] = generatedItems.map((item, idx) => ({
        id: `sql_gemini_${Date.now()}_${idx}`,
        question: item.naturalPrompt || item.question || 'Consulta',
        sql: item.sqlQuery || item.sql || 'SELECT * FROM table;',
        databaseSchema: item.schemaContext || item.databaseSchema || 'CREATE TABLE dados (id INT);',
      }));
      onApplyGeneratedData(taskType, formatted);
    } else if (taskType === 'chain_of_thought') {
      const formatted: ChainOfThoughtItem[] = generatedItems.map((item, idx) => ({
        id: `cot_gemini_${Date.now()}_${idx}`,
        prompt: item.question || item.prompt || 'Problema',
        thought: Array.isArray(item.reasoningSteps) ? item.reasoningSteps.join('\n') : (item.thought || ''),
        response: item.finalAnswer || item.response || 'Resposta',
        difficulty: 'medium',
      }));
      onApplyGeneratedData(taskType, formatted);
    } else if (taskType === 'function_calling') {
      const formatted: ToolCallItem[] = generatedItems.map((item, idx) => ({
        id: `tool_gemini_${Date.now()}_${idx}`,
        prompt: item.userPrompt || item.prompt || 'Comando',
        availableTools: [
          {
            name: item.toolName || 'execute_action',
            description: 'Executa a ação solicitada pelo usuário.',
            parameters: { type: 'object', properties: {} },
          },
        ],
        chosenToolCall: {
          name: item.toolName || item.name || 'execute_action',
          arguments: item.parameters || item.arguments || {},
        },
        finalResponse: item.finalResponse || item.response || 'Ação executada com sucesso pelo assistente.',
      }));
      onApplyGeneratedData(taskType, formatted);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Gemini Flash • Gerador de Dataset NLP Sintético
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Ultra-Econômico
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Gere dezenas de exemplos estruturados com raciocínio e anotação instantânea
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300">
          {/* 1. Task Type Selector */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-200">Formato / Tarefa de NLP:</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { id: 'extractive_qa', label: 'SQuAD Q&A', icon: <MessageSquare className="w-3.5 h-3.5 text-blue-400" /> },
                { id: 'text_to_sql', label: 'Text-to-SQL', icon: <Code className="w-3.5 h-3.5 text-emerald-400" /> },
                { id: 'chain_of_thought', label: 'Chain-of-Thought', icon: <Brain className="w-3.5 h-3.5 text-purple-400" /> },
                { id: 'function_calling', label: 'Tool Calling', icon: <Wrench className="w-3.5 h-3.5 text-amber-400" /> },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTaskType(t.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                    taskType === t.id
                      ? 'bg-purple-600/20 border-purple-500 text-white font-semibold shadow-md'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Domain & Quantity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1.5">
              <label className="font-semibold text-slate-200">Tema / Domínio de Conhecimento:</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Ex: Suporte E-commerce, Jurídico Trabalhista, Finanças..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-200">Quantidade de Exemplos:</label>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value={3}>3 exemplos</option>
                <option value={5}>5 exemplos</option>
                <option value={10}>10 exemplos</option>
                <option value={20}>20 exemplos</option>
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !domain.trim()}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Gerando dados com Gemini 2.5 Flash Lite...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Gerar {count} Exemplos Sintéticos</span>
              </>
            )}
          </button>

          {/* Error display */}
          {error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Generated Preview */}
          {generatedItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 text-xs">
                  Pré-visualização dos {generatedItems.length} itens gerados:
                </span>
                <span className="text-[11px] text-emerald-400 font-mono">Prontos para inserção</span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 border border-slate-800 rounded-xl p-3 bg-slate-950/80">
                {generatedItems.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-[11px] space-y-1">
                    <div className="font-semibold text-purple-300">
                      #{idx + 1}: {item.question || item.naturalPrompt || item.userPrompt || item.prompt || 'Exemplo'}
                    </div>
                    {item.context && <p className="text-slate-400 line-clamp-2">Contexto: {item.context}</p>}
                    {item.answerText && <p className="text-emerald-400 font-medium">Resposta: {item.answerText}</p>}
                    {item.sqlQuery && <pre className="font-mono text-cyan-300 bg-slate-950 p-1 rounded">{item.sqlQuery}</pre>}
                    {item.finalAnswer && <p className="text-emerald-400">Solução: {item.finalAnswer}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Powered by Google Gemini Flash Lite
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
            >
              Fechar
            </button>

            {generatedItems.length > 0 && (
              <button
                onClick={handleInsertIntoDataset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar ao Dataset (+{generatedItems.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
