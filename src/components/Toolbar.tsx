import React from 'react';
import { 
  MousePointer2, 
  Move,
  RotateCw,
  ZoomIn,
  Wand2,
  Sparkles,
  Square, 
  Hexagon, 
  Spline, 
  Crosshair, 
  Circle, 
  Box,
  Share2,
  Tag,
  Brush,
  Hand, 
  Undo2, 
  Redo2, 
  Trash2,
  Maximize2,
  Download,
  Video,
  Plus,
  HelpCircle,
  Copy,
  ArrowRightCircle,
  CheckCircle2,
  GitMerge,
  Cpu
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
  onOpenAIModal?: () => void;
  onOpenAugmentationModal?: () => void;
  onAutoClassify?: () => void;
  onCopyAnnotations?: () => void;
  onPasteAnnotations?: () => void;
  onPropagateToNext?: () => void;
  onMergeSelected?: () => void;
  canMerge?: boolean;
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
  onOpenAIModal,
  onOpenAugmentationModal,
  onAutoClassify,
  onCopyAnnotations,
  onPasteAnnotations,
  onPropagateToNext,
  onMergeSelected,
  canMerge = false,
}) => {
  const tools: Array<{
    id: ToolType;
    label: string;
    shortcut: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'select',
      label: 'Selecionar / Editar Vértices',
      shortcut: 'V',
      icon: <MousePointer2 className="w-4 h-4" />,
    },
    {
      id: 'move',
      label: 'Mover / Transladar Objeto',
      shortcut: 'M',
      icon: <Move className="w-4 h-4" />,
    },
    {
      id: 'rotate',
      label: 'Girar / Rotacionar Geometria',
      shortcut: 'R',
      icon: <RotateCw className="w-4 h-4" />,
    },
    {
      id: 'zoom',
      label: 'Zoom / Lupa de Detalhes',
      shortcut: 'Z',
      icon: <ZoomIn className="w-4 h-4" />,
    },
    {
      id: 'magic_wand',
      label: 'Varinha Mágica / Auto-Segmentação',
      shortcut: 'W',
      icon: <Wand2 className="w-4 h-4 text-purple-400" />,
    },
    {
      id: 'bbox',
      label: 'Bounding Box (Caixa 2D)',
      shortcut: 'B',
      icon: <Square className="w-4 h-4 text-blue-400" />,
    },
    {
      id: 'polygon',
      label: 'Polígono / Segmentação Fina',
      shortcut: 'P',
      icon: <Hexagon className="w-4 h-4 text-indigo-400" />,
    },
    {
      id: 'polyline',
      label: 'Polyline / Traçado Contínuo',
      shortcut: 'L',
      icon: <Spline className="w-4 h-4 text-amber-400" />,
    },
    {
      id: 'keypoint',
      label: 'Keypoint / Ponto Anatômico',
      shortcut: 'K',
      icon: <Crosshair className="w-4 h-4 text-emerald-400" />,
    },
    {
      id: 'circle',
      label: 'Círculo / Elipse Delimitadora',
      shortcut: 'C',
      icon: <Circle className="w-4 h-4 text-pink-400" />,
    },
    {
      id: 'cuboid3d',
      label: 'Cubóide 3D / Caixa Orientada',
      shortcut: '3',
      icon: <Box className="w-4 h-4 text-cyan-400" />,
    },
    {
      id: 'skeleton',
      label: 'Esqueleto / Landmarks Pose',
      shortcut: 'S',
      icon: <Share2 className="w-4 h-4 text-teal-400" />,
    },
    {
      id: 'brush',
      label: 'Pincel / Máscara Pixel',
      shortcut: 'E',
      icon: <Brush className="w-4 h-4 text-orange-400" />,
    },
    {
      id: 'tag',
      label: 'Classificação / Tag de Imagem',
      shortcut: 'T',
      icon: <Tag className="w-4 h-4 text-yellow-400" />,
    },
    {
      id: 'pan',
      label: 'Navegar / Pan Canvas',
      shortcut: 'Espaço',
      icon: <Hand className="w-4 h-4 text-slate-400" />,
    },
  ];

  return (
    <div className="w-12 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-2 justify-between shrink-0 select-none z-20 overflow-y-auto scrollbar-none">
      {/* 1. History & Navigation Controls */}
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-2 rounded-lg transition-colors ${
            canUndo ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-700 cursor-not-allowed'
          }`}
          title="Desfazer (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-2 rounded-lg transition-colors ${
            canRedo ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-700 cursor-not-allowed'
          }`}
          title="Refazer (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-6 h-[1px] bg-slate-800 my-1" />

        {/* 2. Primary Annotation Tool Icons */}
        {tools.map((t) => {
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTool(t.id)}
              className={`p-2 rounded-lg relative group transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
              title={`${t.label} (${t.shortcut})`}
            >
              {t.icon}
              <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 border border-slate-700 text-white text-[11px] rounded shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                {t.label} <kbd className="text-slate-400 text-[10px]">({t.shortcut})</kbd>
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Bottom Utility Actions */}
      <div className="flex flex-col items-center gap-1 mt-2">
        <div className="w-6 h-[1px] bg-slate-800 my-1" />

        {/* Merge Button if 2+ selected */}
        {canMerge && onMergeSelected && (
          <button
            onClick={onMergeSelected}
            className="p-2 rounded-lg bg-blue-600/30 text-blue-400 hover:bg-blue-600 hover:text-white transition-colors group relative"
            title="Mesclar Anotações Selecionadas (M)"
          >
            <GitMerge className="w-4 h-4" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 border border-slate-700 text-white text-[11px] rounded shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Mesclar Selecionadas <kbd className="text-slate-400 text-[10px]">(M)</kbd>
            </span>
          </button>
        )}

        {/* AI Pre-Trained Models Auto-Annotation */}
        {onOpenAIModal && (
          <button
            onClick={onOpenAIModal}
            className="p-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 transition-colors group relative"
            title="Modelos IA Pré-Treinados & Auto-Anotação (YOLOv11, Seg, Pose)"
          >
            <Sparkles className="w-4 h-4" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 border border-slate-700 text-white text-[11px] rounded shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Modelos IA Pré-Treinados (YOLOv11/v8)
            </span>
          </button>
        )}

        {/* Data Augmentation Studio */}
        {onOpenAugmentationModal && (
          <button
            onClick={onOpenAugmentationModal}
            className="p-2 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white border border-purple-500/30 transition-colors group relative"
            title="Estúdio de Data Augmentation (Geometria, Cores, Ruído, Cutout)"
          >
            <Wand2 className="w-4 h-4" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 border border-slate-700 text-white text-[11px] rounded shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Data Augmentation Studio
            </span>
          </button>
        )}

        {/* Auto-Classify Tool */}
        {onAutoClassify && (
          <button
            onClick={onAutoClassify}
            className="p-2 rounded-lg text-amber-400 hover:bg-slate-800 hover:text-amber-300 transition-colors group relative"
            title="Auto-Classificar Anotações por Heurística"
          >
            <Cpu className="w-4 h-4" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 border border-slate-700 text-white text-[11px] rounded shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Auto-Classificar por Heurística
            </span>
          </button>
        )}

        {/* Copy / Propagate to Next Image */}
        {onPropagateToNext && (
          <button
            onClick={onPropagateToNext}
            className="p-2 rounded-lg text-emerald-400 hover:bg-slate-800 hover:text-emerald-300 transition-colors group relative"
            title="Copiar e Propagar Anotações para a Próxima Imagem (Shift+D)"
          >
            <ArrowRightCircle className="w-4 h-4" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 border border-slate-700 text-white text-[11px] rounded shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Propagar para Próxima Imagem <kbd className="text-slate-400 text-[10px]">(Shift+D)</kbd>
            </span>
          </button>
        )}

        {/* Fit Screen */}
        <button
          onClick={onFitScreen}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Ajustar Imagem à Tela (F)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Delete Selected */}
        {hasSelection && (
          <button
            onClick={onDeleteSelected}
            className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors"
            title="Excluir Anotação Selecionada (Del/Backspace)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Add Images */}
        {onOpenAddImages && (
          <button
            onClick={onOpenAddImages}
            className="p-2 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-slate-800 transition-colors"
            title="Adicionar Mais Imagens"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        {/* Video / Stream Studio */}
        {onOpenVideoStudio && (
          <button
            onClick={onOpenVideoStudio}
            className="p-2 rounded-lg text-purple-400 hover:text-purple-300 hover:bg-slate-800 transition-colors"
            title="Importar Vídeo / Webcam / RTSP"
          >
            <Video className="w-4 h-4" />
          </button>
        )}

        {/* Export Dataset */}
        {onOpenExportModal && (
          <button
            onClick={onOpenExportModal}
            className="p-2 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 transition-colors"
            title="Exportar Dataset (YOLO, Parquet, COCO, config.yaml)"
          >
            <Download className="w-4 h-4" />
          </button>
        )}

        {/* Keyboard Shortcuts */}
        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            title="Atalhos de Teclado (?)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
