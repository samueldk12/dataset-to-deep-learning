import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Tag, 
  FileText, 
  CheckCircle2, 
  Sparkles, 
  X, 
  Search,
  Code,
  Brain,
  Wrench,
  Layers,
  Database,
  Terminal,
  Scale,
  Highlighter,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  Split,
  Download
} from 'lucide-react';
import { 
  DatasetProject, 
  DatasetClass, 
  ExtractiveQAItem, 
  TextToSQLItem, 
  ChainOfThoughtItem, 
  ToolCallItem, 
  RAGRetrievalItem,
  TextDatasetItem,
  TextSpanAnnotation,
  SentencePairItem,
  LLMDatasetItem
} from '../../types/dataset';
import { GeminiNLPAssistantModal } from './GeminiNLPAssistantModal';

interface NLPWorkspaceProps {
  project: DatasetProject;
  activeClassId: string;
  onUpdateProject: (updated: DatasetProject) => void;
  onOpenExportModal?: () => void;
}

export const NLPWorkspace: React.FC<NLPWorkspaceProps> = ({
  project,
  activeClassId,
  onUpdateProject,
  onOpenExportModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<string>(project.taskType || 'extractive_qa');
  const [search, setSearch] = useState('');

  // 1. EXTRACTIVE QA STATE
  const [activeQAId, setActiveQAId] = useState<string | null>(project.qaItems?.[0]?.id || null);
  const qaContainerRef = useRef<HTMLDivElement>(null);

  // 2. TEXT-TO-SQL STATE
  const [activeSQLId, setActiveSQLId] = useState<string | null>(project.sqlItems?.[0]?.id || null);

  // 3. CHAIN-OF-THOUGHT STATE
  const [activeCoTId, setActiveCoTId] = useState<string | null>(project.cotItems?.[0]?.id || null);

  // 4. FUNCTION CALLING STATE
  const [activeToolId, setActiveToolId] = useState<string | null>(project.toolCallItems?.[0]?.id || null);

  // 5. RAG RETRIEVAL STATE
  const [activeRAGId, setActiveRAGId] = useState<string | null>(project.ragItems?.[0]?.id || null);

  // 6. GEMINI ASSISTANT MODAL STATE
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);

  const handleApplyGeneratedData = (tType: string, newItems: any[]) => {
    if (!newItems.length) return;
    if (tType === 'extractive_qa') {
      const updated = [...(project.qaItems || []), ...newItems];
      onUpdateProject({ ...project, qaItems: updated });
      if (newItems[0]?.id) setActiveQAId(newItems[0].id);
    } else if (tType === 'text_to_sql') {
      const updated = [...(project.sqlItems || []), ...newItems];
      onUpdateProject({ ...project, sqlItems: updated });
      if (newItems[0]?.id) setActiveSQLId(newItems[0].id);
    } else if (tType === 'chain_of_thought') {
      const updated = [...(project.cotItems || []), ...newItems];
      onUpdateProject({ ...project, cotItems: updated });
      if (newItems[0]?.id) setActiveCoTId(newItems[0].id);
    } else if (tType === 'function_calling') {
      const updated = [...(project.toolCallItems || []), ...newItems];
      onUpdateProject({ ...project, toolCallItems: updated });
      if (newItems[0]?.id) setActiveToolId(newItems[0].id);
    }
  };

  const activeClass = project.classes.find((c) => c.id === activeClassId) || project.classes[0];

  /* ==========================================================================
     EXTRACTIVE QA HANDLERS (SQuAD Style)
     ========================================================================== */
  const qaItems = project.qaItems || [];
  const activeQA = qaItems.find((q) => q.id === activeQAId) || qaItems[0] || null;

  const handleAddQA = () => {
    const newItem: ExtractiveQAItem = {
      id: `qa_${Date.now()}`,
      context: 'A inteligência artificial generativa utiliza redes neurais profundas como Transformers para criar textos e imagens a partir de prompts.',
      question: 'Qual arquitetura de rede neural é utilizada?',
      answerStart: 77,
      answerEnd: 89,
      answerText: 'Transformers',
    };
    const updated = [...qaItems, newItem];
    onUpdateProject({ ...project, qaItems: updated });
    setActiveQAId(newItem.id);
  };

  const handleUpdateQA = (item: ExtractiveQAItem) => {
    const updated = qaItems.map((q) => (q.id === item.id ? item : q));
    onUpdateProject({ ...project, qaItems: updated });
  };

  const handleDeleteQA = (id: string) => {
    const updated = qaItems.filter((q) => q.id !== id);
    onUpdateProject({ ...project, qaItems: updated });
  };

  const handleContextMouseUp = () => {
    if (!activeQA) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) return;

    const answerText = sel.toString().trim();
    const node = qaContainerRef.current;
    if (!node) return;

    const range = sel.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(node);
    preRange.setEnd(range.startContainer, range.startOffset);
    const start = preRange.toString().length;
    const end = start + answerText.length;

    handleUpdateQA({
      ...activeQA,
      answerStart: start,
      answerEnd: end,
      answerText,
    });
    sel.removeAllRanges();
  };

  /* ==========================================================================
     TEXT-TO-SQL HANDLERS
     ========================================================================== */
  const sqlItems = project.sqlItems || [];
  const activeSQL = sqlItems.find((s) => s.id === activeSQLId) || sqlItems[0] || null;

  const handleAddSQL = () => {
    const newItem: TextToSQLItem = {
      id: `sql_${Date.now()}`,
      question: 'Qual o faturamento total da categoria Eletrônicos no último mês?',
      databaseSchema: 'CREATE TABLE vendas (\n  id INT PRIMARY KEY,\n  categoria VARCHAR(50),\n  valor DECIMAL(10,2),\n  data_venda DATE\n);',
      sql: 'SELECT SUM(valor) AS faturamento_total\nFROM vendas\nWHERE categoria = \'Eletrônicos\'\n  AND data_venda >= DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH);',
    };
    const updated = [...sqlItems, newItem];
    onUpdateProject({ ...project, sqlItems: updated });
    setActiveSQLId(newItem.id);
  };

  const handleUpdateSQL = (item: TextToSQLItem) => {
    const updated = sqlItems.map((s) => (s.id === item.id ? item : s));
    onUpdateProject({ ...project, sqlItems: updated });
  };

  /* ==========================================================================
     CHAIN-OF-THOUGHT (CoT) HANDLERS
     ========================================================================== */
  const cotItems = project.cotItems || [];
  const activeCoT = cotItems.find((c) => c.id === activeCoTId) || cotItems[0] || null;

  const handleAddCoT = () => {
    const newItem: ChainOfThoughtItem = {
      id: `cot_${Date.now()}`,
      prompt: 'Um trem percorre 180 km em 2 horas e depois 120 km em 1 hora. Qual a velocidade média em todo o trajeto?',
      thought: '1. Calculo a distância total percorrida: 180 km + 120 km = 300 km.\n2. Calculo o tempo total decorrido: 2h + 1h = 3h.\n3. Aplico a fórmula de velocidade média (Vm = D_total / T_total): 300 km / 3h = 100 km/h.',
      response: 'A velocidade média em todo o trajeto foi de 100 km/h.',
      difficulty: 'medium',
    };
    const updated = [...cotItems, newItem];
    onUpdateProject({ ...project, cotItems: updated });
    setActiveCoTId(newItem.id);
  };

  const handleUpdateCoT = (item: ChainOfThoughtItem) => {
    const updated = cotItems.map((c) => (c.id === item.id ? item : c));
    onUpdateProject({ ...project, cotItems: updated });
  };

  /* ==========================================================================
     TOOL CALLING / FUNCTION CALLING HANDLERS
     ========================================================================== */
  const toolCallItems = project.toolCallItems || [];
  const activeToolCall = toolCallItems.find((t) => t.id === activeToolId) || toolCallItems[0] || null;

  const handleAddToolCall = () => {
    const newItem: ToolCallItem = {
      id: `tool_${Date.now()}`,
      prompt: 'Verifique a previsão do tempo para São Paulo amanhã.',
      availableTools: [
        {
          name: 'get_weather_forecast',
          description: 'Obtém a previsão do tempo para uma cidade e data especificada.',
          parameters: {
            type: 'object',
            properties: {
              city: { type: 'string', description: 'Nome da cidade' },
              days: { type: 'number', description: 'Número de dias à frente' },
            },
            required: ['city'],
          },
        },
      ],
      chosenToolCall: {
        name: 'get_weather_forecast',
        arguments: { city: 'São Paulo', days: 1 },
      },
      finalResponse: 'A previsão para São Paulo amanhã indica sol com máxima de 28°C e sem probabilidade de chuva.',
    };
    const updated = [...toolCallItems, newItem];
    onUpdateProject({ ...project, toolCallItems: updated });
    setActiveToolId(newItem.id);
  };

  /* ==========================================================================
     RAG RETRIEVAL HANDLERS
     ========================================================================== */
  const ragItems = project.ragItems || [];
  const activeRAG = ragItems.find((r) => r.id === activeRAGId) || ragItems[0] || null;

  const handleAddRAG = () => {
    const newItem: RAGRetrievalItem = {
      id: `rag_${Date.now()}`,
      query: 'O que são embeddings no contexto de LLMs?',
      positivePassage: 'Embeddings são representações vetoriais densas de palavras ou sentenças em um espaço multidimensional, onde conceitos semanticamente similares ficam geometricamente próximos.',
      negativePassages: [
        'O processador é a unidade central de processamento responsável por executar instruções de máquina.',
        'A memória RAM é volátil e armazena temporariamente os dados dos programas em execução.',
      ],
    };
    const updated = [...ragItems, newItem];
    onUpdateProject({ ...project, ragItems: updated });
    setActiveRAGId(newItem.id);
  };

  const handleUpdateRAG = (item: RAGRetrievalItem) => {
    const updated = ragItems.map((r) => (r.id === item.id ? item : r));
    onUpdateProject({ ...project, ragItems: updated });
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-[#0a0d14] text-slate-100 select-none">
      {/* 1. Left Paradigm Mode Sidebar */}
      <div className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 justify-between">
        <div>
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-300" />
              <span className="font-semibold text-xs text-slate-200">Processamento de Texto</span>
            </div>
          </div>

          {/* Paradigm Subtabs */}
          <div className="p-2 flex flex-col gap-1 text-xs">
            {[
              { id: 'extractive_qa', label: 'Extractive QA (SQuAD)', icon: Highlighter, count: qaItems.length },
              { id: 'text_to_sql', label: 'Text-to-SQL / Código', icon: Terminal, count: sqlItems.length },
              { id: 'chain_of_thought', label: 'Raciocínio & CoT', icon: Brain, count: cotItems.length },
              { id: 'function_calling', label: 'Tool Use / Agentes', icon: Wrench, count: toolCallItems.length },
              { id: 'rag_retrieval', label: 'RAG Triplet Retrieval', icon: Database, count: ragItems.length },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`p-2 rounded-lg text-left font-medium flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'hover:bg-slate-800/60 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.2 rounded">
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Gemini AI Synthesis Button */}
          <div className="px-2 pt-2">
            <button
              onClick={() => setIsGeminiModalOpen(true)}
              className="w-full p-2.5 rounded-xl bg-gradient-to-r from-purple-600/30 to-blue-600/30 hover:from-purple-600/40 hover:to-blue-600/40 border border-purple-500/40 text-purple-300 font-semibold flex items-center justify-between text-xs transition-all shadow-md"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Gemini Flash IA</span>
              </div>
              <span className="text-[9px] bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded font-mono">
                Sintetizar
              </span>
            </button>
          </div>
        </div>

        {/* Export Button */}
        {onOpenExportModal && (
          <div className="p-3 border-t border-slate-800 bg-slate-950/60">
            <button
              onClick={onOpenExportModal}
              className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Exportar Dataset</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Main Studio Viewport */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* PARADIGM 1: EXTRACTIVE QA (SQuAD) */}
        {activeSubTab === 'extractive_qa' && (
          <div className="flex flex-1 h-full overflow-hidden">
            {/* List */}
            <div className="w-72 bg-slate-950/60 border-r border-slate-800 flex flex-col shrink-0">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Amostras SQuAD ({qaItems.length})</span>
                <button
                  onClick={handleAddQA}
                  className="px-2.5 py-1 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-500 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova QA</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 scrollbar-thin">
                {qaItems.map((qa) => (
                  <div
                    key={qa.id}
                    onClick={() => setActiveQAId(qa.id)}
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition-all ${
                      qa.id === activeQA?.id
                        ? 'bg-purple-600/15 border-purple-500 text-white shadow-md'
                        : 'bg-slate-900 border-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-semibold text-xs text-slate-200 truncate">{qa.question}</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Resposta: {qa.answerText || 'Sem resposta'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Editor */}
            {activeQA && (
              <div className="flex-1 p-6 overflow-y-auto bg-slate-950/30 flex flex-col gap-4 max-w-4xl mx-auto w-full">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      <Highlighter className="w-4 h-4 text-purple-400" />
                      Extractive Question Answering (SQuAD 2.0 Benchmark)
                    </h3>
                    <span className="text-xs font-mono text-slate-400">
                      Índices: [{activeQA.answerStart} : {activeQA.answerEnd}]
                    </span>
                  </div>

                  {/* Question */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-300">Pergunta (Question):</label>
                    <input
                      type="text"
                      value={activeQA.question}
                      onChange={(e) => handleUpdateQA({ ...activeQA, question: e.target.value })}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Context */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Texto de Contexto (Context):</span>
                      <span className="text-[11px] text-purple-400 font-normal">
                        (Selecione qualquer trecho no texto com o mouse para marcar a resposta)
                      </span>
                    </label>
                    <div
                      ref={qaContainerRef}
                      onMouseUp={handleContextMouseUp}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-200 leading-relaxed font-sans select-text cursor-text min-h-[100px]"
                    >
                      {activeQA.context}
                    </div>
                  </div>

                  {/* Extracted Answer Card */}
                  <div className="p-3.5 rounded-xl bg-emerald-950/25 border border-emerald-800/60 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-emerald-400">
                        Resposta Extraída (answer_text):
                      </span>
                      <span className="text-sm font-semibold text-white mt-0.5">
                        "{activeQA.answerText || 'Nenhuma resposta selecionada ainda'}"
                      </span>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2 py-1 rounded-lg border border-emerald-800">
                      start: {activeQA.answerStart} • end: {activeQA.answerEnd}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PARADIGM 2: TEXT-TO-SQL */}
        {activeSubTab === 'text_to_sql' && (
          <div className="flex flex-1 h-full overflow-hidden">
            {/* List */}
            <div className="w-72 bg-slate-950/60 border-r border-slate-800 flex flex-col shrink-0">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Pares Text-to-SQL ({sqlItems.length})</span>
                <button
                  onClick={handleAddSQL}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo SQL</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 scrollbar-thin">
                {sqlItems.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setActiveSQLId(s.id)}
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 ${
                      s.id === activeSQL?.id ? 'bg-blue-600/15 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="font-semibold text-xs text-slate-200 truncate">{s.question}</span>
                    <span className="text-[10px] text-blue-400 font-mono truncate">{s.sql}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Editor */}
            {activeSQL && (
              <div className="flex-1 p-6 overflow-y-auto bg-slate-950/30 flex flex-col gap-4 max-w-4xl mx-auto w-full">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Terminal className="w-4 h-4 text-blue-400" />
                    Text-to-SQL & Code Generation Pair
                  </h3>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-300">Pergunta do Usuário (Linguagem Natural):</label>
                    <input
                      type="text"
                      value={activeSQL.question}
                      onChange={(e) => handleUpdateSQL({ ...activeSQL, question: e.target.value })}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-300">Schema do Banco de Dados (DDL):</label>
                    <textarea
                      rows={4}
                      value={activeSQL.databaseSchema || ''}
                      onChange={(e) => handleUpdateSQL({ ...activeSQL, databaseSchema: e.target.value })}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-blue-300 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-300">Consulta SQL de Saída (Ground Truth):</label>
                    <textarea
                      rows={5}
                      value={activeSQL.sql}
                      onChange={(e) => handleUpdateSQL({ ...activeSQL, sql: e.target.value })}
                      className="bg-slate-950 border border-emerald-900/60 rounded-xl p-3 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PARADIGM 3: CHAIN-OF-THOUGHT (CoT) */}
        {activeSubTab === 'chain_of_thought' && (
          <div className="flex flex-1 h-full overflow-hidden">
            {/* List */}
            <div className="w-72 bg-slate-950/60 border-r border-slate-800 flex flex-col shrink-0">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Exemplos CoT ({cotItems.length})</span>
                <button
                  onClick={handleAddCoT}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo CoT</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 scrollbar-thin">
                {cotItems.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setActiveCoTId(c.id)}
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 ${
                      c.id === activeCoT?.id ? 'bg-indigo-600/15 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="font-semibold text-xs text-slate-200 truncate">{c.prompt}</span>
                    <span className="text-[10px] text-indigo-400 font-mono truncate">{c.response}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Editor */}
            {activeCoT && (
              <div className="flex-1 p-6 overflow-y-auto bg-slate-950/30 flex flex-col gap-4 max-w-4xl mx-auto w-full">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Brain className="w-4 h-4 text-indigo-400" />
                    Reasoning & Chain-of-Thought (Raciocínio Passo a Passo)
                  </h3>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-300">Enunciado / Prompt:</label>
                    <textarea
                      rows={3}
                      value={activeCoT.prompt}
                      onChange={(e) => handleUpdateCoT({ ...activeCoT, prompt: e.target.value })}
                      className="bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Processo de Raciocínio & Dedução (thought):
                    </label>
                    <textarea
                      rows={6}
                      value={activeCoT.thought}
                      onChange={(e) => handleUpdateCoT({ ...activeCoT, thought: e.target.value })}
                      placeholder="Descreva o passo a passo de raciocínio lógico que o modelo deve gerar antes da resposta..."
                      className="bg-slate-950 border border-indigo-900/60 rounded-xl p-3 text-xs text-indigo-200 font-mono focus:outline-none focus:border-indigo-500 leading-relaxed"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-emerald-400">Resposta Final (response):</label>
                    <textarea
                      rows={3}
                      value={activeCoT.response}
                      onChange={(e) => handleUpdateCoT({ ...activeCoT, response: e.target.value })}
                      className="bg-slate-950 border border-emerald-900/60 rounded-xl p-3 text-xs text-emerald-300 font-semibold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PARADIGM 4: FUNCTION CALLING */}
        {activeSubTab === 'function_calling' && (
          <div className="flex flex-1 h-full overflow-hidden">
            <div className="flex-1 p-6 overflow-y-auto bg-slate-950/30 flex flex-col gap-4 max-w-4xl mx-auto w-full">
              {activeToolCall ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Wrench className="w-4 h-4 text-amber-400" />
                    Tool Use & Function Calling Dataset
                  </h3>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-300">Prompt do Usuário:</label>
                    <input
                      type="text"
                      value={activeToolCall.prompt}
                      onChange={(e) => {
                        const updated = toolCallItems.map((t) => (t.id === activeToolCall.id ? { ...t, prompt: e.target.value } : t));
                        onUpdateProject({ ...project, toolCallItems: updated });
                      }}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-amber-400">Chamada de Ferramenta JSON Gerada (tool_call):</label>
                    <textarea
                      rows={5}
                      value={JSON.stringify(activeToolCall.chosenToolCall, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          const updated = toolCallItems.map((t) => (t.id === activeToolCall.id ? { ...t, chosenToolCall: parsed } : t));
                          onUpdateProject({ ...project, toolCallItems: updated });
                        } catch {}
                      }}
                      className="bg-slate-950 border border-amber-900/60 rounded-xl p-3 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-300">Resposta Final ao Usuário:</label>
                    <textarea
                      rows={3}
                      value={activeToolCall.finalResponse}
                      onChange={(e) => {
                        const updated = toolCallItems.map((t) => (t.id === activeToolCall.id ? { ...t, finalResponse: e.target.value } : t));
                        onUpdateProject({ ...project, toolCallItems: updated });
                      }}
                      className="bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <button onClick={handleAddToolCall} className="px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-semibold">
                    + Criar Exemplo de Function Calling
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PARADIGM 5: RAG RETRIEVAL */}
        {activeSubTab === 'rag_retrieval' && (
          <div className="flex flex-1 h-full overflow-hidden">
            <div className="flex-1 p-6 overflow-y-auto bg-slate-950/30 flex flex-col gap-4 max-w-4xl mx-auto w-full">
              {activeRAG ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Database className="w-4 h-4 text-emerald-400" />
                    RAG Triplet Retrieval (Query + Positive + Hard Negatives)
                  </h3>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-300">Consulta de Busca (Query):</label>
                    <input
                      type="text"
                      value={activeRAG.query}
                      onChange={(e) => handleUpdateRAG({ ...activeRAG, query: e.target.value })}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-emerald-400">Passagem Positiva Relevante (Positive Passage):</label>
                    <textarea
                      rows={4}
                      value={activeRAG.positivePassage}
                      onChange={(e) => handleUpdateRAG({ ...activeRAG, positivePassage: e.target.value })}
                      className="bg-slate-950 border border-emerald-900/60 rounded-xl p-3 text-xs text-emerald-300 font-sans focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-rose-400">Exemplos Negativos (Hard Negatives):</label>
                    {activeRAG.negativePassages.map((neg, idx) => (
                      <textarea
                        key={idx}
                        rows={2}
                        value={neg}
                        onChange={(e) => {
                          const updatedNegs = [...activeRAG.negativePassages];
                          updatedNegs[idx] = e.target.value;
                          handleUpdateRAG({ ...activeRAG, negativePassages: updatedNegs });
                        }}
                        className="bg-slate-950 border border-rose-950 rounded-xl p-2.5 text-xs text-slate-300 font-sans focus:outline-none focus:border-rose-500"
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <button onClick={handleAddRAG} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold">
                    + Criar Exemplo RAG
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Gemini AI Synthesis Modal */}
      <GeminiNLPAssistantModal
        isOpen={isGeminiModalOpen}
        onClose={() => setIsGeminiModalOpen(false)}
        project={project}
        activeTaskType={activeSubTab}
        onApplyGeneratedData={handleApplyGeneratedData}
      />
    </div>
  );
};
