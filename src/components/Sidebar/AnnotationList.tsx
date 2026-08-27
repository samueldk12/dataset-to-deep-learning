import React, { useState } from 'react';
import { 
  Square, 
  Hexagon, 
  Crosshair, 
  Spline, 
  Circle, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff, 
  Tag, 
  Plus, 
  X,
  Layers,
  Sparkles,
  GitMerge,
  CheckSquare,
  Square as SquareOutline
} from 'lucide-react';
import { Annotation, DatasetClass, DatasetImage } from '../../types/dataset';
import { calculatePolygonArea, getBoundingBox } from '../../utils/geometry';

interface AnnotationListProps {
  image: DatasetImage | null;
  classes: DatasetClass[];
  selectedAnnotationId: string | null;
  selectedAnnotationIds?: string[];
  onSelectAnnotation: (id: string | null, multi?: boolean) => void;
  onUpdateAnnotation: (ann: Annotation) => void;
  onDeleteAnnotation: (id: string) => void;
  onAddAnnotation: (ann: Annotation) => void;
  onUpdateImageTags: (tags: string[]) => void;
  onMergeAnnotations?: (ids: string[], targetClassId?: string) => void;
}

export const AnnotationList: React.FC<AnnotationListProps> = ({
  image,
  classes,
  selectedAnnotationId,
  selectedAnnotationIds = [],
  onSelectAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onAddAnnotation,
  onUpdateImageTags,
  onMergeAnnotations,
}) => {
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [mergeTargetClassId, setMergeTargetClassId] = useState<string>('');

  if (!image) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-xs text-slate-500 italic">
        Nenhuma imagem selecionada.
      </div>
    );
  }

  const effectiveSelectedIds = selectedAnnotationIds.length > 0 
    ? selectedAnnotationIds 
    : (selectedAnnotationId ? [selectedAnnotationId] : []);

  const classMap = new Map<string, DatasetClass>(classes.map((c) => [c.id, c]));

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    const current = image.tags || [];
    if (!current.includes(newTag.trim())) {
      onUpdateImageTags([...current, newTag.trim()]);
    }
    setNewTag('');
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const current = image.tags || [];
    onUpdateImageTags(current.filter((t) => t !== tagToRemove));
  };

  const handleDuplicate = (ann: Annotation) => {
    const duplicated: Annotation = {
      ...ann,
      id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      points: ann.points.map((p) => ({ x: p.x + 15, y: p.y + 15 })),
      createdAt: Date.now(),
    };
    onAddAnnotation(duplicated);
    onSelectAnnotation(duplicated.id);
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'polygon': return <Hexagon className="w-3.5 h-3.5 text-indigo-400" />;
      case 'bbox': return <Square className="w-3.5 h-3.5 text-blue-400" />;
      case 'keypoint': return <Crosshair className="w-3.5 h-3.5 text-emerald-400" />;
      case 'polyline': return <Spline className="w-3.5 h-3.5 text-amber-400" />;
      case 'circle': return <Circle className="w-3.5 h-3.5 text-pink-400" />;
      default: return <Square className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const handleExecuteMerge = () => {
    if (effectiveSelectedIds.length < 2 || !onMergeAnnotations) return;
    const targetCls = mergeTargetClassId || undefined;
    onMergeAnnotations(effectiveSelectedIds, targetCls);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 select-none text-xs">
      {/* 1. Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800">
        <span className="font-semibold text-slate-200 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          Anotações ({image.annotations?.length || 0})
        </span>

        {image.annotations.length > 0 && (
          <span className="text-[10px] font-mono text-slate-500">
            {image.annotations.filter((a) => a.type === 'polygon').length} polígonos
          </span>
        )}
      </div>

      {/* 2. MERGE ACTION BANNER (When 2+ annotations are selected) */}
      {effectiveSelectedIds.length >= 2 && onMergeAnnotations && (
        <div className="p-2.5 bg-blue-950/60 border-b border-blue-800/80 flex flex-col gap-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-blue-300 text-xs flex items-center gap-1.5">
              <GitMerge className="w-3.5 h-3.5 text-blue-400" />
              {effectiveSelectedIds.length} Anotações Selecionadas
            </span>
            <button
              onClick={() => onSelectAnnotation(null)}
              className="text-[10px] text-slate-400 hover:text-slate-200"
            >
              Desmarcar
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Target Class Selection */}
            <select
              value={mergeTargetClassId || (effectiveSelectedIds[0] ? image.annotations.find(a => a.id === effectiveSelectedIds[0])?.classId : '')}
              onChange={(e) => setMergeTargetClassId(e.target.value)}
              className="flex-1 bg-slate-900 border border-blue-700/80 rounded px-2 py-1 text-xs text-white focus:outline-none"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Classe: {c.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleExecuteMerge}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded transition-colors flex items-center gap-1 shrink-0"
              title="Mesclar anotações selecionadas (Tecla M)"
            >
              <GitMerge className="w-3 h-3" />
              <span>Mesclar (M)</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Image Classification Tags Section */}
      <div className="p-2.5 bg-slate-950/40 border-b border-slate-800 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Tag className="w-3 h-3 text-amber-400" />
            Classificação da Imagem (Tags):
          </span>
          <button
            onClick={() => setIsAddingTag(!isAddingTag)}
            className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3" />
            <span>Tag</span>
          </button>
        </div>

        {isAddingTag && (
          <div className="flex items-center gap-1.5 my-1">
            <input
              type="text"
              placeholder="Ex: Noturno, Chuva, Interior..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              autoFocus
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleAddTag}
              className="px-2 py-0.5 rounded bg-blue-600 text-white text-[11px] font-medium"
            >
              Add
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          {image.tags && image.tags.length > 0 ? (
            image.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px]"
              >
                <span>{tag}</span>
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-400"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-[10px] text-slate-600 italic">Sem tags de classificação</span>
          )}
        </div>
      </div>

      {/* 4. Annotations List with Multi-Select Checkboxes */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
        {image.annotations && image.annotations.length > 0 ? (
          image.annotations.map((ann, index) => {
            const isSelected = effectiveSelectedIds.includes(ann.id);
            const cls = classMap.get(ann.classId) || { name: 'Desconhecido', color: '#3b82f6' };
            const box = getBoundingBox(ann.points, ann.type);

            return (
              <div
                key={ann.id}
                onClick={(e) => {
                  const multi = e.shiftKey || e.ctrlKey || e.metaKey;
                  onSelectAnnotation(ann.id, multi);
                }}
                className={`group flex flex-col p-2 rounded-xl cursor-pointer border transition-all ${
                  isSelected
                    ? 'bg-blue-600/15 border-blue-500/60 shadow-md ring-1 ring-blue-500/30'
                    : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  {/* Left: Multi-select Box, Icon, Color, Class Selector */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAnnotation(ann.id, true);
                      }}
                      className="text-slate-500 hover:text-blue-400 p-0.5"
                      title={isSelected ? "Desmarcar da seleção" : "Selecionar para mesclar (Shift/Ctrl+Click)"}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <SquareOutline className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                      )}
                    </button>

                    <span title={ann.type}>{getIconForType(ann.type)}</span>
                    <span
                      style={{ backgroundColor: cls.color }}
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                    />

                    {/* Class Selector Dropdown */}
                    <select
                      value={ann.classId}
                      onChange={(e) => {
                        e.stopPropagation();
                        onUpdateAnnotation({ ...ann, classId: e.target.value });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-transparent border-0 text-slate-200 font-medium text-xs focus:outline-none cursor-pointer truncate max-w-[120px]"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {/* Duplicate */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(ann);
                      }}
                      className="p-1 rounded text-slate-500 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Duplicar Anotação"
                    >
                      <Copy className="w-3 h-3" />
                    </button>

                    {/* Visibility */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateAnnotation({ ...ann, visible: ann.visible === false });
                      }}
                      className={`p-1 rounded transition-colors ${
                        ann.visible !== false ? 'text-slate-500 hover:text-slate-200' : 'text-amber-400'
                      }`}
                      title={ann.visible !== false ? 'Ocultar' : 'Mostrar'}
                    >
                      {ann.visible !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAnnotation(ann.id);
                      }}
                      className="p-1 rounded text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Excluir"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Annotation Detail Subtitle */}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-1 pt-1 border-t border-slate-800/40">
                  <span>
                    #{index + 1} • {ann.type.toUpperCase()}
                  </span>
                  <span>
                    {ann.type === 'polygon' && `${ann.points.length} nós • ${Math.round(calculatePolygonArea(ann.points))}px²`}
                    {ann.type === 'bbox' && `${Math.round(box.width)}×${Math.round(box.height)}px`}
                    {ann.type === 'keypoint' && `(${Math.round(ann.points[0]?.x || 0)}, ${Math.round(ann.points[0]?.y || 0)})`}
                    {ann.type === 'polyline' && `${ann.points.length} pontos`}
                    {ann.type === 'circle' && `Raio ${Math.round(box.width / 2)}px`}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 gap-2">
            <Sparkles className="w-6 h-6 text-slate-600" />
            <p className="text-xs">Nenhuma anotação nesta imagem.</p>
            <p className="text-[11px] text-slate-600">
              Selecione a ferramenta <b>Polígono (P)</b> ou <b>Bounding Box (B)</b> para começar a anotar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
