import React from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  Layers, 
  Tag, 
  Hexagon, 
  Square, 
  Crosshair, 
  Spline, 
  Circle,
  Clock,
  PieChart,
  FileCheck
} from 'lucide-react';
import { DatasetProject } from '../../types/dataset';

interface DatasetStatsProps {
  project: DatasetProject;
  onClose: () => void;
}

export const DatasetStats: React.FC<DatasetStatsProps> = ({ project, onClose }) => {
  const totalImages = project.images.length;
  const annotatedImages = project.images.filter((img) => (img.annotations?.length || 0) > 0).length;
  const emptyImages = totalImages - annotatedImages;
  const completionPercent = totalImages > 0 ? Math.round((annotatedImages / totalImages) * 100) : 0;

  // Breakdown by annotation type
  let polyCount = 0;
  let bboxCount = 0;
  let keypointCount = 0;
  let lineCount = 0;
  let circleCount = 0;

  const classCountMap = new Map<string, number>();
  project.classes.forEach((c) => classCountMap.set(c.id, 0));

  let totalAnnotations = 0;
  project.images.forEach((img) => {
    img.annotations.forEach((ann) => {
      totalAnnotations++;
      classCountMap.set(ann.classId, (classCountMap.get(ann.classId) || 0) + 1);
      if (ann.type === 'polygon') polyCount++;
      else if (ann.type === 'bbox') bboxCount++;
      else if (ann.type === 'keypoint') keypointCount++;
      else if (ann.type === 'polyline') lineCount++;
      else if (ann.type === 'circle') circleCount++;
    });
  });

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 select-none text-xs overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800 shrink-0">
        <span className="font-semibold text-slate-200 flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
          Estatísticas do Dataset
        </span>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 text-[11px]"
        >
          Fechar
        </button>
      </div>

      <div className="p-3 flex flex-col gap-4">
        {/* Progress Card */}
        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-medium text-slate-300">Progresso de Anotação</span>
            <span className="font-bold text-blue-400 font-mono text-sm">{completionPercent}%</span>
          </div>

          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              style={{ width: `${completionPercent}%` }}
              className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              <span>{annotatedImages} anotadas</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <Clock className="w-3 h-3" />
              <span>{emptyImages} pendentes</span>
            </div>
          </div>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80 flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Total Imagens</span>
            <strong className="text-base text-slate-100 font-mono">{totalImages}</strong>
          </div>
          <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80 flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Total Anotações</span>
            <strong className="text-base text-emerald-400 font-mono">{totalAnnotations}</strong>
          </div>
        </div>

        {/* Breakdown by Type */}
        <div className="flex flex-col gap-2">
          <span className="font-medium text-slate-300 flex items-center gap-1.5">
            <PieChart className="w-3.5 h-3.5 text-indigo-400" />
            Tipos de Anotações:
          </span>

          <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/80 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <Hexagon className="w-3 h-3 text-indigo-400" />
                Polígonos / Segmentação
              </span>
              <strong className="font-mono text-slate-200">{polyCount}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <Square className="w-3 h-3 text-blue-400" />
                Bounding Boxes
              </span>
              <strong className="font-mono text-slate-200">{bboxCount}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <Crosshair className="w-3 h-3 text-emerald-400" />
                Keypoints
              </span>
              <strong className="font-mono text-slate-200">{keypointCount}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <Spline className="w-3 h-3 text-amber-400" />
                Polylines / Linhas
              </span>
              <strong className="font-mono text-slate-200">{lineCount}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <Circle className="w-3 h-3 text-pink-400" />
                Círculos / Elipses
              </span>
              <strong className="font-mono text-slate-200">{circleCount}</strong>
            </div>
          </div>
        </div>

        {/* Class Distribution Bars */}
        <div className="flex flex-col gap-2">
          <span className="font-medium text-slate-300 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-blue-400" />
            Distribuição por Classe:
          </span>

          <div className="flex flex-col gap-2">
            {project.classes.map((cls) => {
              const count = classCountMap.get(cls.id) || 0;
              const percent = totalAnnotations > 0 ? Math.round((count / totalAnnotations) * 100) : 0;

              return (
                <div key={cls.id} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        style={{ backgroundColor: cls.color }}
                        className="w-2 h-2 rounded-full shrink-0"
                      />
                      <span className="text-slate-300 truncate">{cls.name}</span>
                    </div>
                    <span className="font-mono text-slate-400">
                      {count} ({percent}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${percent}%`,
                        backgroundColor: cls.color,
                      }}
                      className="h-full rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
