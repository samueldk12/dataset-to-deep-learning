import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Tag, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  X, 
  Search,
  BookOpen,
  Highlighter
} from 'lucide-react';
import { TextDatasetItem, TextSpanAnnotation, DatasetClass } from '../../types/dataset';

interface TextWorkspaceProps {
  items: TextDatasetItem[];
  activeItemId: string | null;
  classes: DatasetClass[];
  activeClassId: string;
  onSelectItem: (id: string) => void;
  onAddItem: (item: TextDatasetItem) => void;
  onUpdateItem: (item: TextDatasetItem) => void;
  onDeleteItem: (id: string) => void;
}

export const TextWorkspace: React.FC<TextWorkspaceProps> = ({
  items,
  activeItemId,
  classes,
  activeClassId,
  onSelectItem,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  const textContainerRef = useRef<HTMLDivElement>(null);

  const activeItem = items.find((i) => i.id === activeItemId) || items[0] || null;
  const classMap = new Map<string, DatasetClass>(classes.map((c) => [c.id, c]));
  const activeClass = classes.find((c) => c.id === activeClassId) || classes[0];

  const handleCreateSubmit = () => {
    if (!newContent.trim()) return;
    const newItem: TextDatasetItem = {
      id: `txt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: newTitle.trim() || `Documento #${items.length + 1}`,
      content: newContent.trim(),
      annotations: [],
      tags: [],
      status: 'unannotated',
    };
    onAddItem(newItem);
    onSelectItem(newItem.id);
    setNewTitle('');
    setNewContent('');
    setIsCreating(false);
  };

  /* Handle Mouse Selection on Text to create NER Span */
  const handleTextMouseUp = () => {
    if (!activeItem) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return;

    const selectedStr = selection.toString().trim();
    const textNode = textContainerRef.current;
    if (!textNode) return;

    const content = activeItem.content;
    const range = selection.getRangeAt(0);

    // Calculate start index in plain text
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(textNode);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;
    const end = start + selectedStr.length;

    if (start >= 0 && end <= content.length && start < end) {
      const newSpan: TextSpanAnnotation = {
        id: `span_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        classId: activeClassId,
        start,
        end,
        text: selectedStr,
      };

      const updatedAnnotations = [...activeItem.annotations, newSpan].sort((a, b) => a.start - b.start);
      onUpdateItem({
        ...activeItem,
        annotations: updatedAnnotations,
        status: 'completed',
      });
      selection.removeAllRanges();
    }
  };

  const handleRemoveSpan = (spanId: string) => {
    if (!activeItem) return;
    const updated = activeItem.annotations.filter((s) => s.id !== spanId);
    onUpdateItem({
      ...activeItem,
      annotations: updated,
      status: updated.length > 0 ? 'completed' : 'unannotated',
    });
  };

  const handleAddTag = () => {
    if (!newTag.trim() || !activeItem) return;
    if (!activeItem.tags.includes(newTag.trim())) {
      onUpdateItem({
        ...activeItem,
        tags: [...activeItem.tags, newTag.trim()],
      });
    }
    setNewTag('');
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tag: string) => {
    if (!activeItem) return;
    onUpdateItem({
      ...activeItem,
      tags: activeItem.tags.filter((t) => t !== tag),
    });
  };

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.content.toLowerCase().includes(search.toLowerCase())
  );

  /* Render Highlighted Text Spans */
  const renderAnnotatedText = () => {
    if (!activeItem) return null;
    const content = activeItem.content;
    const spans = [...activeItem.annotations].sort((a, b) => a.start - b.start);

    if (spans.length === 0) {
      return <span>{content}</span>;
    }

    const segments: React.ReactNode[] = [];
    let lastIndex = 0;

    spans.forEach((span, idx) => {
      // Plain text before span
      if (span.start > lastIndex) {
        segments.push(
          <span key={`plain_${idx}_${lastIndex}`}>
            {content.substring(lastIndex, span.start)}
          </span>
        );
      }

      const cls = classMap.get(span.classId) || { name: 'Entidade', color: '#3b82f6' };

      // Span element
      segments.push(
        <mark
          key={span.id}
          style={{
            backgroundColor: `${cls.color}25`,
            borderBottom: `2px solid ${cls.color}`,
          }}
          className="group relative px-1 py-0.5 rounded text-white inline-flex items-center gap-1 mx-0.5"
        >
          <span className="font-medium">{content.substring(span.start, span.end)}</span>
          <span
            style={{ backgroundColor: cls.color }}
            className="text-[9px] font-mono text-white px-1 rounded-sm uppercase tracking-wide"
          >
            {cls.name}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveSpan(span.id);
            }}
            className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 transition-opacity"
            title="Remover anotação desta entidade"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </mark>
      );

      lastIndex = Math.max(lastIndex, span.end);
    });

    if (lastIndex < content.length) {
      segments.push(<span key={`plain_end`}>{content.substring(lastIndex)}</span>);
    }

    return segments;
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-[#0a0d14] select-none text-slate-100">
      {/* 1. Left Document List */}
      <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-xs text-slate-200">
              Textos & Documentos ({items.length})
            </span>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo</span>
          </button>
        </div>

        {/* Search */}
        <div className="p-2 border-b border-slate-800/60">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-950 rounded-lg border border-slate-800">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar documentos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none w-full"
            />
          </div>
        </div>

        {/* Document Items */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 scrollbar-thin">
          {filteredItems.map((item) => {
            const isSelected = item.id === activeItem?.id;
            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item.id)}
                className={`group p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-blue-600/15 border-blue-500 text-white shadow-md'
                    : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs truncate flex-1">{item.title}</span>
                  <div className="flex items-center gap-1">
                    {item.annotations.length > 0 ? (
                      <span className="flex items-center gap-0.5 text-[10px] font-mono text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        {item.annotations.length}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500">0</span>
                    )}
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
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-sans">
                  {item.content}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Main Annotation & Reading Viewport */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {isCreating ? (
          <div className="p-6 max-w-3xl flex flex-col gap-4 mx-auto w-full animate-fade-in">
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Adicionar Novo Documento de Texto para Anotação NER
            </h3>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Título / Identificador:</label>
              <input
                type="text"
                placeholder="Ex: Contrato_Prestacao_01, Prontuario_Paciente_42..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Conteúdo do Texto:</label>
              <textarea
                rows={12}
                placeholder="Cole aqui o texto completo a ser anotado..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateSubmit}
                disabled={!newContent.trim()}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold shadow-lg shadow-blue-500/25"
              >
                Salvar Documento
              </button>
            </div>
          </div>
        ) : activeItem ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Top Toolbar for Active Class / Instruction */}
            <div className="h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <Highlighter className="w-3.5 h-3.5 text-blue-400" />
                  Entidade Ativa:
                </span>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
                  <span
                    style={{ backgroundColor: activeClass?.color || '#3b82f6' }}
                    className="w-2.5 h-2.5 rounded-full"
                  />
                  <span className="font-semibold text-xs text-slate-200">
                    {activeClass?.name || 'Entidade'}
                  </span>
                </div>
                <span className="text-xs text-slate-500 hidden sm:inline ml-2">
                  (Selecione qualquer trecho com o mouse para rotular automaticamente)
                </span>
              </div>

              {/* Tags */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsAddingTag(!isAddingTag)}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Tag do Texto</span>
                </button>
                {isAddingTag && (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                      autoFocus
                      className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-2 py-0.5 rounded bg-blue-600 text-white text-xs"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Document Body & Highlights */}
            <div className="flex-1 p-8 overflow-y-auto bg-slate-950/30">
              <div className="max-w-3xl mx-auto bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-100">{activeItem.title}</h2>
                    <span className="text-xs text-slate-500 font-mono">
                      {activeItem.content.length} caracteres • {activeItem.annotations.length} entidades rotuladas
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {activeItem.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-300"
                      >
                        <span>{tag}</span>
                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-400">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Interactive Selectable Text */}
                <div
                  ref={textContainerRef}
                  onMouseUp={handleTextMouseUp}
                  className="text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap selection:bg-blue-500/40 select-text cursor-text"
                >
                  {renderAnnotatedText()}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 text-xs">
            Nenhum documento disponível. Clique em "+ Novo" para adicionar um texto.
          </div>
        )}
      </div>
    </div>
  );
};
