import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  FlipHorizontal, 
  RotateCw, 
  Sun, 
  Contrast, 
  Grid, 
  Layers, 
  Download, 
  PlusCircle, 
  X, 
  RefreshCw, 
  Sliders, 
  Eye, 
  Wand2,
  Maximize2
} from 'lucide-react';
import { DatasetImage, DatasetProject } from '../../types/dataset';
import { AugmentationPipelineConfig } from '../../types/augmentation';
import { AUGMENTATION_PRESETS, generateAugmentedImage } from '../../utils/augmentationEngine';
import { downloadDatasetZip } from '../../utils/zipHandler';

interface AugmentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: DatasetProject;
  activeImage: DatasetImage | null;
  onApplyAugmentedImages: (newImages: DatasetImage[]) => void;
}

export const AugmentationModal: React.FC<AugmentationModalProps> = ({
  isOpen,
  onClose,
  project,
  activeImage,
  onApplyAugmentedImages,
}) => {
  const [config, setConfig] = useState<AugmentationPipelineConfig>(AUGMENTATION_PRESETS.medium);
  const [activeTab, setActiveTab] = useState<'geometric' | 'photometric' | 'regularization'>('geometric');
  const [previewAugmentedImage, setPreviewAugmentedImage] = useState<DatasetImage | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  // Generate live preview when config or active image changes
  useEffect(() => {
    if (isOpen && activeImage) {
      updateLivePreview();
    }
  }, [isOpen, activeImage?.id, config]);

  const updateLivePreview = async () => {
    if (!activeImage) return;
    setIsGeneratingPreview(true);
    try {
      const aug = await generateAugmentedImage(activeImage, config, 1);
      setPreviewAugmentedImage(aug);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleSelectPreset = (presetKey: 'light' | 'medium' | 'aggressive') => {
    setConfig({ ...AUGMENTATION_PRESETS[presetKey] });
  };

  const handleApplyToProject = async () => {
    setIsBatchGenerating(true);
    setBatchProgress(0);
    const newImages: DatasetImage[] = [];

    const totalToGenerate = project.images.length * config.multiplier;
    let count = 0;

    for (const srcImg of project.images) {
      for (let v = 1; v <= config.multiplier; v++) {
        const aug = await generateAugmentedImage(srcImg, config, v);
        if (aug) newImages.push(aug);
        count++;
        setBatchProgress(Math.round((count / totalToGenerate) * 100));
      }
    }

    onApplyAugmentedImages(newImages);
    setIsBatchGenerating(false);
    onClose();
  };

  const handleExportZip = async () => {
    setIsBatchGenerating(true);
    setBatchProgress(0);
    const augmentedImages: DatasetImage[] = config.preserveOriginals ? [...project.images] : [];

    const totalToGenerate = project.images.length * config.multiplier;
    let count = 0;

    for (const srcImg of project.images) {
      for (let v = 1; v <= config.multiplier; v++) {
        const aug = await generateAugmentedImage(srcImg, config, v);
        if (aug) augmentedImages.push(aug);
        count++;
        setBatchProgress(Math.round((count / totalToGenerate) * 100));
      }
    }

    const expandedProject: DatasetProject = {
      ...project,
      images: augmentedImages,
    };

    await downloadDatasetZip(expandedProject, { format: 'yolo' });
    setIsBatchGenerating(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Data Augmentation Studio
                <span className="text-[10px] font-semibold bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/30">
                  Deep Learning & YOLO
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Transformações geométricas e fotométricas com recálculo matemático de BBoxes e Polígonos.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left: Configuration Sliders & Presets (5 cols) */}
          <div className="lg:col-span-6 p-5 border-r border-slate-800 overflow-y-auto space-y-4 bg-slate-900/50">
            {/* Presets */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Presets de Aumento
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['light', 'medium', 'aggressive'] as const).map((preset) => {
                  const isSelected = config.presetName === preset;
                  return (
                    <button
                      key={preset}
                      onClick={() => handleSelectPreset(preset)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize transition-all ${
                        isSelected
                          ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-md shadow-purple-500/10'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {preset === 'light' ? 'Suave' : preset === 'medium' ? 'Equilibrado' : 'Agressivo'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex border-b border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('geometric')}
                className={`py-2 px-3 font-semibold border-b-2 transition-colors ${
                  activeTab === 'geometric'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Geometria & Rotação
              </button>
              <button
                onClick={() => setActiveTab('photometric')}
                className={`py-2 px-3 font-semibold border-b-2 transition-colors ${
                  activeTab === 'photometric'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Cor & Fotometria
              </button>
              <button
                onClick={() => setActiveTab('regularization')}
                className={`py-2 px-3 font-semibold border-b-2 transition-colors ${
                  activeTab === 'regularization'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Ruído & Cutout
              </button>
            </div>

            {/* Tab 1: Geometric */}
            {activeTab === 'geometric' && (
              <div className="space-y-3.5 text-xs">
                {/* Flips */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.geometric.horizontalFlip}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          presetName: 'custom',
                          geometric: { ...config.geometric, horizontalFlip: e.target.checked },
                        })
                      }
                      className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
                    />
                    <span>Flip Horizontal (50%)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.geometric.verticalFlip}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          presetName: 'custom',
                          geometric: { ...config.geometric, verticalFlip: e.target.checked },
                        })
                      }
                      className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
                    />
                    <span>Flip Vertical (50%)</span>
                  </label>
                </div>

                {/* Rotation */}
                <div className="space-y-1 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Faixa de Rotação (Ângulo)</span>
                    <span className="font-mono text-purple-400">
                      {config.geometric.rotationMinDeg}° a {config.geometric.rotationMaxDeg}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    value={config.geometric.rotationMaxDeg}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setConfig({
                        ...config,
                        presetName: 'custom',
                        geometric: {
                          ...config.geometric,
                          rotation: val > 0,
                          rotationMinDeg: -val,
                          rotationMaxDeg: val,
                        },
                      });
                    }}
                    className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Scale / Zoom */}
                <div className="space-y-1 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Zoom / Escala Aleatória</span>
                    <span className="font-mono text-purple-400">
                      {config.geometric.scaleMin.toFixed(2)}x a {config.geometric.scaleMax.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={Math.round((config.geometric.scaleMax - 1) * 100)}
                    onChange={(e) => {
                      const delta = Number(e.target.value) / 100;
                      setConfig({
                        ...config,
                        presetName: 'custom',
                        geometric: {
                          ...config.geometric,
                          scale: delta > 0,
                          scaleMin: Math.max(0.5, 1 - delta),
                          scaleMax: 1 + delta,
                        },
                      });
                    }}
                    className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Shear */}
                <div className="space-y-1 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Cisalhamento / Perspectiva (Shear)</span>
                    <span className="font-mono text-purple-400">±{config.geometric.shearMaxDeg}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={config.geometric.shearMaxDeg}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setConfig({
                        ...config,
                        presetName: 'custom',
                        geometric: { ...config.geometric, shear: val > 0, shearMaxDeg: val },
                      });
                    }}
                    className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Tab 2: Photometric */}
            {activeTab === 'photometric' && (
              <div className="space-y-3.5 text-xs">
                {/* Brightness */}
                <div className="space-y-1 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Jitter de Brilho</span>
                    <span className="font-mono text-purple-400">±{config.photometric.brightnessJitter}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={config.photometric.brightnessJitter}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        presetName: 'custom',
                        photometric: {
                          ...config.photometric,
                          brightness: Number(e.target.value) > 0,
                          brightnessJitter: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-1 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Jitter de Contraste</span>
                    <span className="font-mono text-purple-400">±{config.photometric.contrastJitter}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={config.photometric.contrastJitter}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        presetName: 'custom',
                        photometric: {
                          ...config.photometric,
                          contrast: Number(e.target.value) > 0,
                          contrastJitter: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Blur */}
                <div className="space-y-1 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Desfoque Gaussiano (Blur)</span>
                    <span className="font-mono text-purple-400">{config.photometric.blurRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    value={config.photometric.blurRadius}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        presetName: 'custom',
                        photometric: {
                          ...config.photometric,
                          blur: Number(e.target.value) > 0,
                          blurRadius: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Tab 3: Regularization */}
            {activeTab === 'regularization' && (
              <div className="space-y-3.5 text-xs">
                {/* Noise */}
                <div className="space-y-1 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Ruído Gaussiano & Granulação</span>
                    <span className="font-mono text-purple-400">{config.regularization.noiseAmount}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={config.regularization.noiseAmount}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        presetName: 'custom',
                        regularization: {
                          ...config.regularization,
                          gaussianNoise: Number(e.target.value) > 0,
                          noiseAmount: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Cutout */}
                <div className="space-y-1 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Cutout / Random Erasing (Oclusões)</span>
                    <span className="font-mono text-purple-400">{config.regularization.cutoutNumHoles} blocos</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    value={config.regularization.cutoutNumHoles}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        presetName: 'custom',
                        regularization: {
                          ...config.regularization,
                          cutout: Number(e.target.value) > 0,
                          cutoutNumHoles: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500">
                    Insere blocos cinzas aleatórios simulando oclusões parciais.
                  </span>
                </div>
              </div>
            )}

            {/* Multiplier Slider */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">Fator de Expansão (Variações por Imagem)</span>
                <span className="font-mono text-purple-400 text-sm">{config.multiplier}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={config.multiplier}
                onChange={(e) => setConfig({ ...config, multiplier: Number(e.target.value) })}
                className="w-full accent-purple-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>{project.images.length} originais</span>
                <span className="text-purple-400 font-bold">
                  → +{project.images.length * config.multiplier} geradas ({project.images.length * (config.multiplier + 1)} total)
                </span>
              </div>
            </div>
          </div>

          {/* Right: Live Interactive Split Screen Preview (7 cols) */}
          <div className="lg:col-span-6 p-5 flex flex-col justify-between bg-[#06080d] overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-purple-400" />
                Live Preview Comparativo
              </span>
              <button
                onClick={updateLivePreview}
                disabled={isGeneratingPreview}
                className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-800/40 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isGeneratingPreview ? 'animate-spin' : ''}`} />
                <span>Sortear Nova Variação</span>
              </button>
            </div>

            {/* Split Screen Container */}
            <div className="flex-1 grid grid-cols-2 gap-3 max-h-[48vh] overflow-hidden items-center">
              {/* Original Image */}
              <div className="flex flex-col h-full bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative">
                <span className="absolute top-2 left-2 z-10 text-[10px] font-mono bg-slate-900/90 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                  Original ({activeImage?.annotations.length || 0} anotações)
                </span>
                {activeImage?.url ? (
                  <img
                    src={activeImage.url}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-slate-600">
                    Nenhuma imagem selecionada
                  </div>
                )}
              </div>

              {/* Augmented Image */}
              <div className="flex flex-col h-full bg-slate-950 rounded-xl border border-purple-500/30 overflow-hidden relative shadow-lg shadow-purple-500/5">
                <span className="absolute top-2 left-2 z-10 text-[10px] font-mono bg-purple-900/90 text-purple-200 px-2 py-0.5 rounded border border-purple-700">
                  Aumentada ({previewAugmentedImage?.annotations.length || 0} anotações)
                </span>
                {previewAugmentedImage?.url ? (
                  <img
                    src={previewAugmentedImage.url}
                    alt="Aumentada"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-slate-600">
                    Gerando preview...
                  </div>
                )}
              </div>
            </div>

            {/* Info Badge */}
            <div className="mt-3 text-[11px] text-slate-400 bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <span>
                As anotações (bounding boxes e polígonos) são <b>recalculadas matematicamente</b> para acompanhar cada rotação, zoom e flip.
              </span>
            </div>
          </div>
        </div>

        {/* Batch Progress */}
        {isBatchGenerating && (
          <div className="px-6 py-2 bg-purple-950/40 border-t border-purple-800/40 space-y-1 animate-fade-in">
            <div className="flex justify-between text-xs font-semibold text-purple-300">
              <span>Gerando dataset aumentado...</span>
              <span>{batchProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-200 rounded-full"
                style={{ width: `${batchProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportZip}
              disabled={isBatchGenerating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Exportar ZIP Aumentado</span>
            </button>

            <button
              onClick={handleApplyToProject}
              disabled={isBatchGenerating}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Adicionar ao Dataset do Projeto (+{project.images.length * config.multiplier})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
