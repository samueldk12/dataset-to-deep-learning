import React, { useState } from 'react';
import { 
  Sparkles, 
  ChevronDown, 
  Wand2, 
  Cpu, 
  ArrowRightCircle, 
  Maximize2, 
  Plus, 
  Video, 
  Download,
  Copy
} from 'lucide-react';
import { AIModelType } from '../../types/aiModel';

interface SidebarActionFooterProps {
  currentModelId?: AIModelType;
  onRunDefaultAI: () => void;
  onOpenAIConfigModal: () => void;
  onOpenAugmentationModal: () => void;
  onAutoClassify: () => void;
  onCloneFromPrevious: () => void;
  onFitScreen: () => void;
  onOpenAddImages: () => void;
  onOpenVideoStudio: () => void;
  onOpenExportModal: () => void;
}

export const SidebarActionFooter: React.FC<SidebarActionFooterProps> = ({
  currentModelId = 'yolov11n',
  onRunDefaultAI,
  onOpenAIConfigModal,
  onOpenAugmentationModal,
  onAutoClassify,
  onCloneFromPrevious,
  onFitScreen,
  onOpenAddImages,
  onOpenVideoStudio,
  onOpenExportModal,
}) => {
  const modelLabels: Record<string, string> = {
    yolov11n: 'YOLOv11n',
    yolov11s: 'YOLOv11s',
    'yolov11-seg': 'YOLOv11-Seg',
    'yolov11-pose': 'YOLOv11-Pose',
    yolov8n: 'YOLOv8n',
    'yolov8-seg': 'YOLOv8-Seg',
    'mobilenet-v3': 'MobileNetV3',
    'heuristic-local': 'Heurístico',
  };

  const currentLabel = modelLabels[currentModelId] || 'YOLOv11n';

  return (
    <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex flex-col gap-2 shrink-0 select-none">
      {/* 1. Split Button: Auto IA Execution & Model Configuration */}
      <div className="flex items-center gap-0.5 rounded-lg overflow-hidden border border-blue-500/40 bg-blue-950/40 shadow-md">
        <button
          onClick={onRunDefaultAI}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors"
          title={`Executar Auto IA imediatamente com ${currentLabel} (Atalho: I)`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Auto IA ({currentLabel})</span>
        </button>

        <button
          onClick={onOpenAIConfigModal}
          className="py-2 px-2 bg-blue-700 hover:bg-blue-600 text-blue-100 border-l border-blue-500/50 transition-colors"
          title="Alterar modelo de IA, sensibilidade ou executar em lote"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Secondary AI & Transform Tools Grid */}
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        {/* Data Augmentation */}
        <button
          onClick={onOpenAugmentationModal}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-purple-950/40 hover:bg-purple-900/40 text-purple-300 border border-purple-800/60 font-medium transition-colors truncate"
          title="Estúdio de Data Augmentation"
        >
          <Wand2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="truncate">Augmentation</span>
        </button>

        {/* Heuristic Auto-Classify */}
        <button
          onClick={onAutoClassify}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-amber-950/30 hover:bg-amber-900/30 text-amber-300 border border-amber-800/50 font-medium transition-colors truncate"
          title="Auto-Classificar por contornos e geometria"
        >
          <Cpu className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">Heurística</span>
        </button>

        {/* Clone from Previous Image */}
        <button
          onClick={onCloneFromPrevious}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-950/30 hover:bg-emerald-900/30 text-emerald-300 border border-emerald-800/50 font-medium transition-colors truncate"
          title="Clonar anotações da imagem anterior (Shift+A ou Shift+D)"
        >
          <ArrowRightCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">Clonar Anterior</span>
        </button>

        {/* Fit Screen */}
        <button
          onClick={onFitScreen}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-medium transition-colors truncate"
          title="Ajustar imagem à tela (Atalho: F)"
        >
          <Maximize2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">Ajustar Tela (F)</span>
        </button>
      </div>

      {/* 3. Utility Actions Row */}
      <div className="grid grid-cols-3 gap-1 text-[10px]">
        <button
          onClick={onOpenAddImages}
          className="flex items-center justify-center gap-1 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
          title="Adicionar novas imagens"
        >
          <Plus className="w-3 h-3 text-blue-400" />
          <span>+ Imagens</span>
        </button>

        <button
          onClick={onOpenVideoStudio}
          className="flex items-center justify-center gap-1 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
          title="Importar de Vídeo ou Câmera"
        >
          <Video className="w-3 h-3 text-purple-400" />
          <span>Vídeo</span>
        </button>

        <button
          onClick={onOpenExportModal}
          className="flex items-center justify-center gap-1 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-800 transition-colors"
          title="Exportar Dataset (YOLO, COCO, Pascal, etc.)"
        >
          <Download className="w-3 h-3 text-emerald-400" />
          <span>Exportar</span>
        </button>
      </div>
    </div>
  );
};
