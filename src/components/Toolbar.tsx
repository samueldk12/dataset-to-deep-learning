import React from 'react';
import { 
  MousePointer2, 
  Square, 
  Hexagon, 
  Spline, 
  Crosshair, 
  Circle, 
  Hand, 
  Undo2, 
  Redo2, 
  Sparkles, 
  Trash2,
  Maximize2,
  Download,
  Video,
  Plus,
  HelpCircle
} from 'lucide-react';
import { ToolType } from '../types/canvas';

interface ToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  hasSelection: boolean;
  onDeleteSelected: () => void;
  onConvexHull: () => void;
  onFitScreen: () => void;
  onOpenExportModal?: () => void;
  onOpenVideoStudio?: () => void;
  onOpenAddImages?: () => void;
  onOpenShortcuts?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onSelectTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  hasSelection,
  onDeleteSelected,
  onConvexHull,
  onFitScreen,
  onOpenExportModal,
  onOpenVideoStudio,
  onOpenAddImages,
  onOpenShortcuts,
}) => {
  const tools: Array<{
    id: ToolType;
    label: string;
    shortcut: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'select',
      label: 'Selecionar e Mover Vértices/Nós',
      shortcut: 'V',
      icon: <MousePointer2 className="w-4 h-4" />,
    },
    {
      id: 'polygon',
      label: 'Polígono / Segmentação por Pontos',
      shortcut: 'P',
      icon: <Hexagon className="w-4 h-4" />,
    },
    {
      id: 'bbox',
      label: 'Bounding Box (Caixa Delimitadora)',
      shortcut: 'B',
      icon: <Square className="w-4 h-4" />,
    },
    {
      id: 'polyline',
      label: 'Polyline / Traçado Linear',
      shortcut: 'L',
      icon: <Spline className="w-4 h-4" />,
    },
    {
      id: 'keypoint',
      label: 'Keypoint / Ponto Anatômico',
      shortcut: 'K',
      icon: <Crosshair className="w-4 h-4" />,
    },
    {
      id: 'circle',
      label: 'Círculo Delimitador',
      shortcut: 'C',
      icon: <Circle className="w-4 h-4" />,
    },
    {
      id: 'pan',
      label: 'Navegar / Pan Canvas',
      shortcut: 'Espaço',
      icon: <Hand className="w-4 h-4" />,
    },
  ];

  return (
    <div className="w-14 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-3 select-none z-20 shrink-0 justify-between">
      {/* 1. Top Section: Annotation Tools */}
      <div className="flex flex-col gap-1.5 w-full px-2">
        {tools.map((t) => {
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTool(t.id)}
              title={`${t.label} (${t.shortcut})`}
              className={`group relative flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
              }`}
            >
              {t.icon}
              <div className="absolute left-14 px-2.5 py-1 rounded-md bg-slate-950 text-slate-100 text-xs font-medium whitespace-nowrap border border-slate-800 shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                {t.label} <span className="text-slate-400">({t.shortcut})</span>
              </div>
            </button>
          );
        })}

        <div className="w-8 h-px bg-slate-800 my-1 mx-auto" />

        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Desfazer (Ctrl+Z)"
          className="group relative flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
          <Undo2 className="w-4 h-4" />
          <div className="absolute left-14 px-2.5 py-1 rounded-md bg-slate-950 text-slate-100 text-xs font-medium whitespace-nowrap border border-slate-800 shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Desfazer <span className="text-slate-400">(Ctrl+Z)</span>
          </div>
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Refazer (Ctrl+Y)"
          className="group relative flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
          <Redo2 className="w-4 h-4" />
          <div className="absolute left-14 px-2.5 py-1 rounded-md bg-slate-950 text-slate-100 text-xs font-medium whitespace-nowrap border border-slate-800 shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Refazer <span className="text-slate-400">(Ctrl+Y)</span>
          </div>
        </button>

        {/* Convex Hull */}
        <button
          onClick={onConvexHull}
          disabled={!hasSelection}
          title="Converter Polígono em Envoltória Convexa (Alt+C)"
          className="group relative flex items-center justify-center w-10 h-10 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <div className="absolute left-14 px-2.5 py-1 rounded-md bg-slate-950 text-slate-100 text-xs font-medium whitespace-nowrap border border-slate-800 shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Convex Hull <span className="text-slate-400">(Alt+C)</span>
          </div>
        </button>

        {/* Delete */}
        <button
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          title="Excluir Anotação Selecionada (Del / Backspace)"
          className="group relative flex items-center justify-center w-10 h-10 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
          <Trash2 className="w-4 h-4" />
          <div className="absolute left-14 px-2.5 py-1 rounded-md bg-slate-950 text-slate-100 text-xs font-medium whitespace-nowrap border border-slate-800 shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Excluir <span className="text-slate-400">(Delete)</span>
          </div>
        </button>
      </div>

      {/* 2. Bottom Section: Dataset Ingestion & Export Controls */}
      <div className="flex flex-col gap-1.5 w-full px-2 border-t border-slate-800 pt-2">
        {/* Ingest Video / Webcam */}
        {onOpenVideoStudio && (
          <button
            onClick={onOpenVideoStudio}
            title="Importar Vídeo ou Gravar Webcam para este Dataset"
            className="group relative flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 transition-all"
          >
            <Video className="w-4 h-4" />
            <div className="absolute left-14 px-2.5 py-1 rounded-md bg-slate-950 text-slate-100 text-xs font-medium whitespace-nowrap border border-slate-800 shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
              Vídeo / Webcam
            </div>
          </button>
        )}

        {/* Add Images */}
        {onOpenAddImages && (
          <button
            onClick={onOpenAddImages}
            title="Adicionar Imagens ao Dataset"
            className="group relative flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
          >
            <Plus className="w-4 h-4" />
            <div className="absolute left-14 px-2.5 py-1 rounded-md bg-slate-950 text-slate-100 text-xs font-medium whitespace-nowrap border border-slate-800 shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
              Adicionar Imagens
            </div>
          </button>
        )}

        {/* Export Dataset Button */}
        {onOpenExportModal && (
          <button
            onClick={onOpenExportModal}
            title="Exportar Este Dataset (YOLO, COCO, Parquet, VOC)"
            className="group relative flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 shadow-md shadow-emerald-500/20 transition-all"
          >
            <Download className="w-4 h-4" />
            <div className="absolute left-14 px-2.5 py-1 rounded-md bg-slate-950 text-slate-100 text-xs font-medium whitespace-nowrap border border-slate-800 shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
              Exportar Dataset
            </div>
          </button>
        )}

        {/* Fit to screen */}
        <button
          onClick={onFitScreen}
          title="Ajustar Imagem à Tela (F)"
          className="group relative flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-all"
        >
          <Maximize2 className="w-4 h-4" />
          <div className="absolute left-14 px-2.5 py-1 rounded-md bg-slate-950 text-slate-100 text-xs font-medium whitespace-nowrap border border-slate-800 shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Ajustar à Tela <span className="text-slate-400">(F)</span>
          </div>
        </button>
      </div>
    </div>
  );
};
