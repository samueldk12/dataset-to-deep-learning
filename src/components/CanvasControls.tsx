import React, { useState } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize, 
  Sliders, 
  Eye, 
  Grid, 
  Crosshair, 
  Layers,
  Palette,
  EyeOff,
  Sparkles,
  GitMerge,
  ChevronDown
} from 'lucide-react';
import { ImageFilters, CanvasTransform } from '../types/canvas';

interface CanvasControlsProps {
  transform: CanvasTransform;
  filters: ImageFilters;
  onTransformChange: (t: CanvasTransform) => void;
  onFiltersChange: (f: ImageFilters) => void;
  onFitScreen: () => void;
  canMerge?: boolean;
  onMergeSelected?: () => void;
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({
  transform,
  filters,
  onTransformChange,
  onFiltersChange,
  onFitScreen,
  canMerge = false,
  onMergeSelected,
}) => {
  const [showAppearanceMenu, setShowAppearanceMenu] = useState(false);

  const handleZoomIn = () => {
    onTransformChange({
      ...transform,
      scale: Math.min(25, transform.scale * 1.25),
    });
  };

  const handleZoomOut = () => {
    onTransformChange({
      ...transform,
      scale: Math.max(0.1, transform.scale * 0.8),
    });
  };

  const handleResetZoom = () => {
    onTransformChange({
      ...transform,
      scale: 1,
    });
  };

  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 select-none">
      {/* Quick Merge Action (When 2+ selected) */}
      {canMerge && onMergeSelected && (
        <button
          onClick={onMergeSelected}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-xl animate-fade-in transition-colors"
          title="Mesclar Anotações Selecionadas (M)"
        >
          <GitMerge className="w-3.5 h-3.5" />
          <span>Mesclar (M)</span>
        </button>
      )}

      {/* Zoom controls */}
      <div className="flex items-center bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-1 shadow-2xl">
        <button
          onClick={handleZoomOut}
          title="Diminuir Zoom (-)"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={handleResetZoom}
          title="Zoom 100%"
          className="px-2 py-1 text-xs font-mono font-medium text-slate-300 hover:text-white transition-colors"
        >
          {Math.round(transform.scale * 100)}%
        </button>

        <button
          onClick={handleZoomIn}
          title="Aumentar Zoom (+)"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-slate-800 mx-1" />

        <button
          onClick={onFitScreen}
          title="Ajustar à Tela (F)"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      {/* Appearance / Filters Button & Popover (As in CVAT reference) */}
      <div className="relative">
        <button
          onClick={() => setShowAppearanceMenu(!showAppearanceMenu)}
          title="Aparência & Visualização de Anotações"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border shadow-2xl backdrop-blur transition-colors ${
            showAppearanceMenu
              ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20'
              : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span className="hidden sm:inline">Appearance</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {showAppearanceMenu && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col gap-3.5 z-50 text-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-semibold text-xs text-white flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-blue-400" />
                Appearance
              </span>
              <button
                onClick={() =>
                  onFiltersChange({
                    brightness: 100,
                    contrast: 100,
                    saturation: 100,
                    invert: false,
                    showGrid: false,
                    showCrosshair: true,
                    colorBy: 'label',
                    annotationOpacity: 0.35,
                    selectedOpacity: 0.65,
                    outlinedBorders: true,
                    strokeWidth: 2,
                    showBitmap: false,
                    showProjections: false,
                    showLabels: true,
                    showPoints: true,
                  })
                }
                title="Restaurar padrão"
                className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* 1. Color by: [Label | Instance | Group] */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-slate-400">Color by</span>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {(['label', 'instance', 'group'] as const).map((mode) => {
                  const isSelected = filters.colorBy === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => onFiltersChange({ ...filters, colorBy: mode })}
                      className={`py-1 rounded text-xs font-medium capitalize transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Opacity Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Opacity</span>
                <span className="font-mono text-slate-300">{Math.round(filters.annotationOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(filters.annotationOpacity * 100)}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    annotationOpacity: Number(e.target.value) / 100,
                  })
                }
                className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* 3. Selected Opacity Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Selected opacity</span>
                <span className="font-mono text-slate-300">{Math.round(filters.selectedOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(filters.selectedOpacity * 100)}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    selectedOpacity: Number(e.target.value) / 100,
                  })
                }
                className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* 4. Toggles / Checkboxes: Outlined borders, Show bitmap, Show projections */}
            <div className="flex flex-col gap-2 pt-1 border-t border-slate-800/80 text-xs">
              <label className="flex items-center justify-between cursor-pointer text-slate-300">
                <span className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={filters.outlinedBorders}
                    onChange={(e) =>
                      onFiltersChange({ ...filters, outlinedBorders: e.target.checked })
                    }
                    className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span>Outlined borders</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Bordas nítidas</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={filters.showBitmap}
                    onChange={(e) =>
                      onFiltersChange({ ...filters, showBitmap: e.target.checked })
                    }
                    className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span>Show bitmap</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={filters.showProjections}
                    onChange={(e) =>
                      onFiltersChange({ ...filters, showProjections: e.target.checked })
                    }
                    className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span>Show projections</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={filters.showGrid}
                    onChange={(e) =>
                      onFiltersChange({ ...filters, showGrid: e.target.checked })
                    }
                    className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span>Grade Pixel</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={filters.showCrosshair}
                    onChange={(e) =>
                      onFiltersChange({ ...filters, showCrosshair: e.target.checked })
                    }
                    className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span>Mira Retícula</span>
                </label>
              </div>
            </div>

            {/* 5. Image Processing Filters (Brightness / Contrast / Saturation) */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Filtros de Imagem
              </span>

              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Brilho</span>
                <span className="font-mono text-slate-300">{filters.brightness}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="200"
                value={filters.brightness}
                onChange={(e) =>
                  onFiltersChange({ ...filters, brightness: Number(e.target.value) })
                }
                className="w-full accent-blue-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
              />

              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Contraste</span>
                <span className="font-mono text-slate-300">{filters.contrast}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="200"
                value={filters.contrast}
                onChange={(e) =>
                  onFiltersChange({ ...filters, contrast: Number(e.target.value) })
                }
                className="w-full accent-blue-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
