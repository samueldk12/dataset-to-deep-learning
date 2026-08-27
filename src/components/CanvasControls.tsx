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
  Layers 
} from 'lucide-react';
import { ImageFilters, CanvasTransform } from '../types/canvas';

interface CanvasControlsProps {
  transform: CanvasTransform;
  filters: ImageFilters;
  onTransformChange: (t: CanvasTransform) => void;
  onFiltersChange: (f: ImageFilters) => void;
  onFitScreen: () => void;
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({
  transform,
  filters,
  onTransformChange,
  onFiltersChange,
  onFitScreen,
}) => {
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);

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

      {/* Visual Adjustments Button & Popover */}
      <div className="relative">
        <button
          onClick={() => setShowFiltersMenu(!showFiltersMenu)}
          title="Ajustes Visuais e Filtros de Imagem"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border shadow-2xl backdrop-blur transition-colors ${
            showFiltersMenu || filters.invert || filters.brightness !== 100 || filters.contrast !== 100
              ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20'
              : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Visibilidade</span>
        </button>

        {showFiltersMenu && (
          <div className="absolute right-0 top-11 w-72 p-4 bg-slate-900/95 backdrop-blur border border-slate-800 rounded-2xl shadow-2xl flex flex-col gap-3.5 text-xs text-slate-300 z-50 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                Ajustes e Filtros do Canvas
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
                    annotationOpacity: 0.35,
                    strokeWidth: 2,
                    showLabels: true,
                    showPoints: true,
                  })
                }
                title="Restaurar padrão"
                className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Reset
              </button>
            </div>

            {/* Brightness */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Brilho</span>
                <span className="font-mono text-slate-400">{filters.brightness}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="250"
                value={filters.brightness}
                onChange={(e) => onFiltersChange({ ...filters, brightness: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Contrast */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Contraste</span>
                <span className="font-mono text-slate-400">{filters.contrast}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="250"
                value={filters.contrast}
                onChange={(e) => onFiltersChange({ ...filters, contrast: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Annotation Opacity */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Opacidade das Anotações</span>
                <span className="font-mono text-slate-400">{Math.round(filters.annotationOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(filters.annotationOpacity * 100)}
                onChange={(e) => onFiltersChange({ ...filters, annotationOpacity: Number(e.target.value) / 100 })}
                className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Stroke Width */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Espessura da Linha</span>
                <span className="font-mono text-slate-400">{filters.strokeWidth}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="6"
                value={filters.strokeWidth}
                onChange={(e) => onFiltersChange({ ...filters, strokeWidth: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="border-t border-slate-800 pt-2 grid grid-cols-2 gap-2">
              {/* Invert */}
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={filters.invert}
                  onChange={(e) => onFiltersChange({ ...filters, invert: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-blue-600"
                />
                <span>Inverter Cores</span>
              </label>

              {/* Show Labels */}
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={filters.showLabels}
                  onChange={(e) => onFiltersChange({ ...filters, showLabels: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-blue-600"
                />
                <span>Mostrar Nomes</span>
              </label>

              {/* Show Grid */}
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={filters.showGrid}
                  onChange={(e) => onFiltersChange({ ...filters, showGrid: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-blue-600"
                />
                <span className="flex items-center gap-1">
                  <Grid className="w-3 h-3 text-slate-500" />
                  Grade
                </span>
              </label>

              {/* Show Crosshair */}
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={filters.showCrosshair}
                  onChange={(e) => onFiltersChange({ ...filters, showCrosshair: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-blue-600"
                />
                <span className="flex items-center gap-1">
                  <Crosshair className="w-3 h-3 text-slate-500" />
                  Mira
                </span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
