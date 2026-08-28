import React, { useState } from 'react';
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
  HelpCircle,
  GitMerge,
  Minus,
  Plus,
  Sliders
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
  onOpenShortcuts?: () => void;
  onMergeSelected?: () => void;
  canMerge?: boolean;

  // Tool parameter props
  wandTolerance?: number;
  onWandToleranceChange?: (val: number) => void;
  wandContiguous?: boolean;
  onWandContiguousChange?: (val: boolean) => void;
  brushSize?: number;
  onBrushSizeChange?: (val: number) => void;
  brushMode?: 'add' | 'erase';
  onBrushModeChange?: (val: 'add' | 'erase') => void;
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
  onOpenShortcuts,
  onMergeSelected,
  canMerge = false,
  wandTolerance = 32,
  onWandToleranceChange,
  wandContiguous = true,
  onWandContiguousChange,
  brushSize = 20,
  onBrushSizeChange,
  brushMode = 'add',
  onBrushModeChange,
}) => {
  const [activePopover, setActivePopover] = useState<ToolType | null>(null);

  const tools: Array<{
    id: ToolType;
    label: string;
    shortcut: string;
    icon: React.ReactNode;
    hasOptions?: boolean;
  }> = [
    {
      id: 'select',
      label: 'Selecionar / Editar Articulações & Vértices',
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
      label: 'Varinha Mágica (Clique no canto para opções)',
      shortcut: 'W',
      icon: <Wand2 className="w-4 h-4 text-purple-400" />,
      hasOptions: true,
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
      label: 'Esqueleto COCO (17 Landmarks Editáveis)',
      shortcut: 'S',
      icon: <Share2 className="w-4 h-4 text-teal-400" />,
    },
    {
      id: 'brush',
      label: 'Pincel / Máscara Pixel (Clique no canto para opções)',
      shortcut: 'E',
      icon: <Brush className="w-4 h-4 text-orange-400" />,
      hasOptions: true,
    },
    {
      id: 'tag',
      label: 'Classificação / Tag de Imagem',
      shortcut: 'T',
      icon: <Tag className="w-4 h-4 text-yellow-400" />,
    },
    {
      id: 'pan',
      label: 'Navegar / Pan (Espaço)',
      shortcut: 'H',
      icon: <Hand className="w-4 h-4 text-slate-400" />,
    },
  ];

  return (
    <div className="w-12 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-2 justify-between shrink-0 select-none z-30 relative">
      {/* 1. Top Action Icons: Undo / Redo */}
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-2 rounded-lg transition-colors ${
            canUndo
              ? 'text-slate-300 hover:text-white hover:bg-slate-800'
              : 'text-slate-700 cursor-not-allowed'
          }`}
          title="Desfazer (U ou Shift+Z ou Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-2 rounded-lg transition-colors ${
            canRedo
              ? 'text-slate-300 hover:text-white hover:bg-slate-800'
              : 'text-slate-700 cursor-not-allowed'
          }`}
          title="Refazer (Y ou Shift+Y ou Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-6 h-[1px] bg-slate-800 my-1" />

        {/* 2. Primary Annotation Tool Icons */}
        {tools.map((t) => {
          const isActive = activeTool === t.id;
          const isPopoverOpen = activePopover === t.id;

          return (
            <div key={t.id} className="relative">
              <button
                onClick={() => {
                  onSelectTool(t.id);
                  if (t.hasOptions) {
                    setActivePopover(isPopoverOpen ? null : t.id);
                  } else {
                    setActivePopover(null);
                  }
                }}
                className={`p-2 rounded-lg relative group transition-colors flex items-center justify-center ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
                title={`${t.label} (${t.shortcut})`}
              >
                {t.icon}

                {/* Photoshop Mini Corner Arrow for Tools with Options */}
                {t.hasOptions && (
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTool(t.id);
                      setActivePopover(isPopoverOpen ? null : t.id);
                    }}
                    title="Clique para abrir opções da ferramenta"
                    className="absolute bottom-0.5 right-0.5 text-slate-400 group-hover:text-white"
                  >
                    <svg className="w-1.5 h-1.5 fill-current" viewBox="0 0 6 6">
                      <polygon points="6,0 6,6 0,6" />
                    </svg>
                  </span>
                )}

                {/* Tooltip */}
                {!isPopoverOpen && (
                  <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 border border-slate-700 text-white text-[11px] rounded shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {t.label} <kbd className="text-slate-400 text-[10px]">({t.shortcut})</kbd>
                  </span>
                )}
              </button>

              {/* Photoshop Sub-Tool Floating Popover Menu */}
              {isPopoverOpen && t.id === 'magic_wand' && (
                <div className="absolute left-full ml-2 top-0 bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl z-50 w-52 text-xs space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between font-semibold text-purple-300 pb-1 border-b border-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Wand2 className="w-3.5 h-3.5" />
                      Opções da Varinha
                    </span>
                    <button onClick={() => setActivePopover(null)} className="text-slate-500 hover:text-white">✕</button>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Tolerância de Cor</span>
                      <span className="font-mono text-white">{wandTolerance}</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={wandTolerance}
                      onChange={(e) => onWandToleranceChange?.(Number(e.target.value))}
                      className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                    />
                  </div>
                  <label className="flex items-center justify-between cursor-pointer text-[11px] text-slate-300 hover:text-white">
                    <span>Apenas Pixels Contíguos</span>
                    <input
                      type="checkbox"
                      checked={wandContiguous}
                      onChange={(e) => onWandContiguousChange?.(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-0"
                    />
                  </label>
                </div>
              )}

              {isPopoverOpen && t.id === 'brush' && (
                <div className="absolute left-full ml-2 top-0 bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl z-50 w-52 text-xs space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between font-semibold text-orange-300 pb-1 border-b border-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Brush className="w-3.5 h-3.5" />
                      Opções do Pincel
                    </span>
                    <button onClick={() => setActivePopover(null)} className="text-slate-500 hover:text-white">✕</button>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Tamanho do Pincel</span>
                      <span className="font-mono text-white">{brushSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="100"
                      value={brushSize}
                      onChange={(e) => onBrushSizeChange?.(Number(e.target.value))}
                      className="w-full accent-orange-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                    />
                  </div>
                  <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => onBrushModeChange?.('add')}
                      className={`flex-1 py-1 rounded text-[10px] font-semibold transition-colors flex items-center justify-center gap-1 ${
                        brushMode === 'add' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                      Pintar
                    </button>
                    <button
                      onClick={() => onBrushModeChange?.('erase')}
                      className={`flex-1 py-1 rounded text-[10px] font-semibold transition-colors flex items-center justify-center gap-1 ${
                        brushMode === 'erase' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Minus className="w-3 h-3" />
                      Apagar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Bottom Utility Actions (Shortcuts & Selection Actions) */}
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

        {/* Delete Selected */}
        {hasSelection && (
          <button
            onClick={onDeleteSelected}
            className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors"
            title="Excluir Anotação Selecionada (Del/Backspace/X)"
          >
            <Trash2 className="w-4 h-4" />
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
