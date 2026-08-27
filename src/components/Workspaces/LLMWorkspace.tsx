import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Bot, 
  User, 
  Sparkles, 
  CheckCircle2, 
  Scale, 
  FileCode, 
  Layers, 
  MessageSquare,
  ArrowRight,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { LLMDatasetItem, LLMMessage } from '../../types/dataset';

interface LLMWorkspaceProps {
  items: LLMDatasetItem[];
  activeItemId: string | null;
  onSelectItem: (id: string) => void;
  onAddItem: (item: LLMDatasetItem) => void;
  onUpdateItem: (item: LLMDatasetItem) => void;
  onDeleteItem: (id: string) => void;
}

export const LLMWorkspace: React.FC<LLMWorkspaceProps> = ({
  items,
  activeItemId,
  onSelectItem,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}) => {
  const [activeTab, setActiveTab] = useState<'sft' | 'dpo'>('sft');
  const [search, setSearch] = useState('');

  const activeItem = items.find((i) => i.id === activeItemId) || items[0] || null;

  const handleAddMessage = (role: LLMMessage['role']) => {
    if (!activeItem) return;
    const newMsg: LLMMessage = {
      role,
      content: '',
    };
    onUpdateItem({
      ...activeItem,
      messages: [...activeItem.messages, newMsg],
    });
  };

  const handleUpdateMessage = (index: number, content: string) => {
    if (!activeItem) return;
    const updated = [...activeItem.messages];
    updated[index] = { ...updated[index], content };
    onUpdateItem({
      ...activeItem,
      messages: updated,
    });
  };

  const handleRemoveMessage = (index: number) => {
    if (!activeItem) return;
    const updated = activeItem.messages.filter((_, idx) => idx !== index);
    onUpdateItem({
      ...activeItem,
      messages: updated,
    });
  };

  const handleAddNewItem = () => {
    const newItem: LLMDatasetItem = {
      id: `llm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: `Instrução #${items.length + 1}`,
      systemPrompt: 'Você é um assistente de IA prestativo, claro e objetivo.',
      messages: [
        { role: 'user', content: '' },
        { role: 'assistant', content: '' },
      ],
      chosen: '',
      rejected: '',
      tags: ['SFT'],
      status: 'unannotated',
    };
    onAddItem(newItem);
    onSelectItem(newItem.id);
  };

  const calculateTotalWords = (item: LLMDatasetItem): number => {
    let text = (item.systemPrompt || '') + ' ' + (item.chosen || '') + ' ' + (item.rejected || '');
    item.messages.forEach((m) => { text += ' ' + m.content; });
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-[#0a0d14] select-none text-slate-100">
      {/* 1. Left Instruction List Sidebar */}
      <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-400" />
            <span className="font-semibold text-xs text-slate-200">
              Instruções & Conversas ({items.length})
            </span>
          </div>

          <button
            onClick={handleAddNewItem}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova</span>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 scrollbar-thin">
          {items.map((item) => {
            const isSelected = item.id === activeItem?.id;
            const words = calculateTotalWords(item);

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item.id)}
                className={`group p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-purple-600/15 border-purple-500 text-white shadow-md'
                    : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs truncate flex-1">{item.title}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-purple-400">
                      ~{Math.round(words * 1.3)} tokens
                    </span>
                    {items.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteItem(item.id);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {item.messages[0]?.content || item.systemPrompt || 'Sem conteúdo...'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Main Editor Viewport */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {activeItem ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header Tabs: SFT vs DPO */}
            <div className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('sft')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeTab === 'sft'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Supervised Fine-Tuning (SFT / Chat)</span>
                </button>

                <button
                  onClick={() => setActiveTab('dpo')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeTab === 'dpo'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>DPO / RLHF (Chosen vs Rejected)</span>
                </button>
              </div>

              <span className="text-xs font-mono text-slate-400">
                {calculateTotalWords(activeItem)} palavras • ~{Math.round(calculateTotalWords(activeItem) * 1.3)} tokens estimados
              </span>
            </div>

            {/* Editor Body */}
            <div className="flex-1 p-6 overflow-y-auto scrollbar-thin bg-slate-950/30">
              <div className="max-w-4xl mx-auto flex flex-col gap-5">
                {/* Title and System Prompt */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-300">Identificador da Amostra:</label>
                    <input
                      type="text"
                      value={activeItem.title}
                      onChange={(e) => onUpdateItem({ ...activeItem, title: e.target.value })}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      System Prompt (Instrução do Sistema):
                    </label>
                    <textarea
                      rows={2}
                      value={activeItem.systemPrompt || ''}
                      onChange={(e) => onUpdateItem({ ...activeItem, systemPrompt: e.target.value })}
                      placeholder="Defina a persona, diretrizes de segurança ou regras da IA..."
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-sans"
                    />
                  </div>
                </div>

                {/* SFT Conversation View */}
                {activeTab === 'sft' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Mensagens da Conversa ({activeItem.messages.length} turnos):
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAddMessage('user')}
                          className="px-2.5 py-1 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 text-xs font-medium flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Turno Usuário</span>
                        </button>
                        <button
                          onClick={() => handleAddMessage('assistant')}
                          className="px-2.5 py-1 rounded-lg bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:bg-purple-600/30 text-xs font-medium flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Turno Assistente</span>
                        </button>
                      </div>
                    </div>

                    {activeItem.messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`rounded-2xl border p-4 flex flex-col gap-2 ${
                          msg.role === 'user'
                            ? 'bg-blue-950/20 border-blue-800/50'
                            : 'bg-purple-950/20 border-purple-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {msg.role === 'user' ? (
                              <User className="w-4 h-4 text-blue-400" />
                            ) : (
                              <Bot className="w-4 h-4 text-purple-400" />
                            )}
                            <span className="font-semibold text-xs uppercase tracking-wide text-slate-200">
                              {msg.role === 'user' ? 'Usuário (Human / Input)' : 'Assistente (Model / Target)'}
                            </span>
                          </div>

                          <button
                            onClick={() => handleRemoveMessage(idx)}
                            className="p-1 rounded text-slate-500 hover:text-red-400"
                            title="Remover turno"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <textarea
                          rows={4}
                          value={msg.content}
                          onChange={(e) => handleUpdateMessage(idx, e.target.value)}
                          placeholder={`Digite a resposta para o ${msg.role}...`}
                          className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-purple-500 leading-relaxed font-sans"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* DPO / RLHF Chosen vs Rejected View */}
                {activeTab === 'dpo' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Chosen Response */}
                    <div className="bg-emerald-950/20 border border-emerald-800/60 rounded-2xl p-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase">
                        <ThumbsUp className="w-4 h-4" />
                        <span>Resposta Escolhida (Chosen / Preferida)</span>
                      </div>
                      <textarea
                        rows={8}
                        value={activeItem.chosen || ''}
                        onChange={(e) => onUpdateItem({ ...activeItem, chosen: e.target.value })}
                        placeholder="Digite a resposta correta, detalhada, concisa e alinhada..."
                        className="bg-slate-950/90 border border-emerald-900/50 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
                      />
                    </div>

                    {/* Rejected Response */}
                    <div className="bg-rose-950/20 border border-rose-800/60 rounded-2xl p-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs uppercase">
                        <ThumbsDown className="w-4 h-4" />
                        <span>Resposta Rejeitada (Rejected / Alucinação / Ruim)</span>
                      </div>
                      <textarea
                        rows={8}
                        value={activeItem.rejected || ''}
                        onChange={(e) => onUpdateItem({ ...activeItem, rejected: e.target.value })}
                        placeholder="Digite a resposta com erro, alucinação ou recusa incorreta..."
                        className="bg-slate-950/90 border border-rose-900/50 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-rose-500 font-sans leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 text-xs">
            Nenhuma instrução selecionada.
          </div>
        )}
      </div>
    </div>
  );
};
