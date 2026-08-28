import React from 'react';
import { 
  Wand2, 
  Brush, 
  Share2, 
  Sliders, 
  Minus, 
  Plus, 
  Check, 
  Move, 
  Maximize2 
} from 'lucide-react';
import { ToolType } from '../../types/canvas';

interface ToolOptionsBarProps {
  activeTool: ToolType;
  wandTolerance: number;
  onWandToleranceChange: (val: number) => void;
  wandContiguous: boolean;
  onWandContiguousChange: (val: boolean) => void;
  brushSize: number;
  onBrushSizeChange: (val: number) => void;
  brushMode: 'add' | 'erase';
  onBrushModeChange: (val: 'add' | 'erase') => void;
}

export const ToolOptionsBar: React.FC<ToolOptionsBarProps> = ({
  activeTool,
  wandTolerance,
  onWandToleranceChange,
  wandContiguous,
  onWandContiguousChange,
  brushSize,
  onBrushSizeChange,
  brushMode,
  onBrushModeChange,
}) => {
  if (activeTool !== 'magic_wand' && activeTool !== 'brush' && activeTool !== 'skeleton') {
    return null;
  }

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 shadow-2xl backdrop-blur-md text-xs select-none animate-fade-in">
      {/* 1. MAGIC WAND OPTIONS */}
      {activeTool === 'magic_wand' && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-purple-300">
            <Wand2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Varinha Mágica</span>
          </div>

          <div className="w-[1px] h-4 bg-slate-800" />

          {/* Tolerance Slider */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Tolerância:</span>
            <input
              type="range"
              min="5"
              max="100"
              value={wandTolerance}
              onChange={(e) => onWandToleranceChange(Number(e.target.value))}
              className="w-20 accent-purple-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
            />
            <span className="font-mono text-purple-300 text-[11px] w-6">{wandTolerance}</span>
          </div>

          <div className="w-[1px] h-4 bg-slate-800" />

          {/* Contiguous Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={wandContiguous}
              onChange={(e) => onWandContiguousChange(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-purple-500 focus:ring-0 cursor-pointer"
            />
            <span>Contíguo</span>
          </label>
        </div>
      )}

      {/* 2. BRUSH OPTIONS */}
      {activeTool === 'brush' && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-orange-300">
            <Brush className="w-3.5 h-3.5 text-orange-400" />
            <span>Pincel de Máscara</span>
          </div>

          <div className="w-[1px] h-4 bg-slate-800" />

          {/* Brush Size */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Tamanho:</span>
            <input
              type="range"
              min="4"
              max="100"
              value={brushSize}
              onChange={(e) => onBrushSizeChange(Number(e.target.value))}
              className="w-24 accent-orange-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
            />
            <span className="font-mono text-orange-300 text-[11px] w-8">{brushSize}px</span>
          </div>

          <div className="w-[1px] h-4 bg-slate-800" />

          {/* Brush Mode (Add vs Erase) */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => onBrushModeChange('add')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors flex items-center gap-1 ${
                brushMode === 'add' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-2.5 h-2.5" />
              Pintar
            </button>
            <button
              onClick={() => onBrushModeChange('erase')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors flex items-center gap-1 ${
                brushMode === 'erase' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Minus className="w-2.5 h-2.5" />
              Apagar
            </button>
          </div>
        </div>
      )}

      {/* 3. SKELETON / POSE OPTIONS */}
      {activeTool === 'skeleton' && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-teal-300">
            <Share2 className="w-3.5 h-3.5 text-teal-400" />
            <span>Esqueleto Humano (17 Pontos Anatômicos COCO)</span>
          </div>

          <div className="w-[1px] h-4 bg-slate-800" />

          <span className="text-slate-400 text-[11px]">
            Clique na imagem para inserir ou <b>arraste qualquer articulação</b> para ajustar pose
          </span>
        </div>
      )}
    </div>
  );
};
