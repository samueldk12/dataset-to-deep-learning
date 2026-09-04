import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Zap,
  Sliders,
  Layers,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Box,
  Shapes,
  UserCheck,
  Tag as TagIcon,
  Key,
  Search,
  Trash2,
  PlusCircle,
  Users,
  CheckSquare,
  Square,
  Link2,
} from 'lucide-react';
import { DatasetClass, DatasetImage, DatasetProject } from '../../types/dataset';
import { AIModelInfo, AIPredictionConfig, AIModelType, AIAnnotationOutputType, AIModelTask } from '../../types/aiModel';
import { fetchAvailableAIModels, predictImageWithModels } from '../../utils/aiClient';
import { addCustomModel, deleteCustomModel } from '../../utils/customModels';
import {
  DETECTION_ENSEMBLE_PRESETS,
  DetectionEnsemblePreset,
  resolvePresetModels,
} from '../../utils/ensemblePresets';

interface AIAnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: DatasetProject;
  activeImage: DatasetImage | null;
  defaultModelId?: AIModelType;
  onModelChange?: (id: AIModelType) => void;
  onOpenAISettings?: () => void;
  onApplyAnnotations: (
    imageId: string,
    annotations: any[],
    newClasses: DatasetClass[],
    overwrite: boolean
  ) => void;
  onBatchApplyAnnotations: (
    results: Array<{ imageId: string; annotations: any[] }>,
    newClasses: DatasetClass[]
  ) => void;
}

const SELECTED_MODELS_STORAGE_KEY = 'annotatex_selected_ai_models';
const ANNOTATION_TYPE_FILTERS: Array<{ value: AIAnnotationOutputType | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'bbox', label: 'Bounding Box' },
  { value: 'polygon', label: 'Polígono' },
  { value: 'keypoint', label: 'Keypoints/Pose' },
  { value: 'tag', label: 'Classificação' },
];

function modelIcon(model: AIModelInfo) {
  if (model.task === 'segmentation') return <Shapes className="w-3.5 h-3.5 text-purple-400" />;
  if (model.task === 'pose') return <UserCheck className="w-3.5 h-3.5 text-emerald-400" />;
  if (model.annotationType === 'tag') return <TagIcon className="w-3.5 h-3.5 text-amber-400" />;
  return <Box className="w-3.5 h-3.5 text-blue-400" />;
}

export const AIAnnotationModal: React.FC<AIAnnotationModalProps> = ({
  isOpen,
  onClose,
  project,
  activeImage,
  defaultModelId = 'yolov11n',
  onModelChange,
  onOpenAISettings,
  onApplyAnnotations,
  onBatchApplyAnnotations,
}) => {
  const [models, setModels] = useState<AIModelInfo[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(SELECTED_MODELS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [defaultModelId];
    } catch {
      return [defaultModelId];
    }
  });
  const [searchText, setSearchText] = useState('');
  const [annotationTypeFilter, setAnnotationTypeFilter] = useState<AIAnnotationOutputType | 'all'>('all');
  const [confidence, setConfidence] = useState(0.25);
  const [iou, setIou] = useState(0.45);
  const [ensembleMinVotes, setEnsembleMinVotes] = useState(1);
  const [ensembleModelWeights, setEnsembleModelWeights] = useState<Record<string, number>>({});
  const [ensembleFusionIou, setEnsembleFusionIou] = useState(0.5);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [autoAddNewClasses, setAutoAddNewClasses] = useState(true);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [showAddCustomModel, setShowAddCustomModel] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchStatus, setBatchStatus] = useState('');
  const [lastInferenceTime, setLastInferenceTime] = useState<number | null>(null);
  const [previewDetectionsCount, setPreviewDetectionsCount] = useState<number | null>(null);
  const [lastRunErrors, setLastRunErrors] = useState<Array<{ modelId: string; error: string }>>([]);

  const refreshModels = () => {
    fetchAvailableAIModels().then((data) => {
      setModels(data);
      setSelectedModelIds((prev) => {
        const stillValid = prev.filter((id) => data.some((m) => m.id === id));
        return stillValid.length > 0 ? stillValid : (data[0] ? [data[0].id] : []);
      });
    });
  };

  useEffect(() => {
    if (isOpen) refreshModels();
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem(SELECTED_MODELS_STORAGE_KEY, JSON.stringify(selectedModelIds));
    if (selectedModelIds.length === 1) {
      onModelChange?.(selectedModelIds[0]);
      localStorage.setItem('annotatex_default_ai_model', selectedModelIds[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModelIds]);

  const filteredModels = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return models.filter((m) => {
      if (annotationTypeFilter !== 'all' && m.annotationType !== annotationTypeFilter) return false;
      if (!q) return true;
      const inName = m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q);
      const inClasses = (m.supportedClasses || []).some((c) => c.toLowerCase().includes(q));
      return inName || inClasses;
    });
  }, [models, searchText, annotationTypeFilter]);

  if (!isOpen) return null;

  const toggleModelSelection = (id: string) => {
    const target = models.find((model) => model.id === id);
    if (!target) return;
    setSelectedPresetId(null);
    setEnsembleModelWeights({});
    setSelectedModelIds((prev) => {
      if (prev.includes(id)) return prev.filter((modelId) => modelId !== id);
      const selectedTypes = models
        .filter((model) => prev.includes(model.id))
        .map((model) => model.annotationType);
      return selectedTypes.some((type) => type !== target.annotationType) ? [id] : [...prev, id];
    });
  };

  const applyPreset = (preset: DetectionEnsemblePreset) => {
    const resolved = resolvePresetModels(preset, models);
    if (resolved.length === 0) return;
    setSelectedModelIds(resolved.map((model) => model.id));
    setAnnotationTypeFilter(preset.annotationType);
    setConfidence(preset.confidence);
    setIou(preset.inferenceIou);
    setEnsembleFusionIou(preset.fusionIou);
    setEnsembleMinVotes(Math.min(preset.minVotes, resolved.length));
    setEnsembleModelWeights(Object.fromEntries(resolved.map((model) => [model.id, preset.modelWeights[model.id] ?? 1])));
    setSelectedPresetId(preset.id);
  };

  const selectedModels = models.filter((m) => selectedModelIds.includes(m.id));
  const isEnsembleMode = selectedModels.length > 1;

  const buildConfig = (): AIPredictionConfig => ({
    modelId: selectedModelIds[0] || 'yolov11n',
    confidenceThreshold: confidence,
    iouThreshold: iou,
    autoAddNewClasses,
    overwriteExisting,
    ensembleMinVotes,
    ensembleModelWeights,
    ensembleFusionIou,
  });

  const handleRunCurrentImage = async () => {
    if (!activeImage || selectedModels.length === 0) return;
    setIsLoading(true);
    setLastRunErrors([]);

    try {
      const res = await predictImageWithModels(activeImage, selectedModels, buildConfig(), project.classes);
      setLastInferenceTime(res.inferenceTimeMs);
      setPreviewDetectionsCount(res.annotations.length);
      setLastRunErrors(res.perModelErrors);
      onApplyAnnotations(activeImage.id, res.annotations, res.newClasses, overwriteExisting);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunBatch = async () => {
    if (selectedModels.length === 0) return;
    const unannotatedImages = project.images.filter(
      (img) => overwriteExisting || img.annotations.length === 0
    );

    if (unannotatedImages.length === 0) {
      alert('Todas as imagens já possuem anotações. Marque "Sobrescrever anotações existentes" para re-anotar.');
      return;
    }

    setIsBatchRunning(true);
    setBatchProgress(0);
    setLastRunErrors([]);
    const results: Array<{ imageId: string; annotations: any[] }> = [];
    let accumulatedNewClasses: DatasetClass[] = [];
    const config = buildConfig();

    const concurrency = 3;
    try {
      for (let start = 0; start < unannotatedImages.length; start += concurrency) {
        const batch = unannotatedImages.slice(start, start + concurrency);
        setBatchStatus(`Anotando imagens ${start + 1}-${Math.min(start + batch.length, unannotatedImages.length)}/${unannotatedImages.length}...`);

        const batchResults = await Promise.all(batch.map(async (img) => {
          try {
            const res = await predictImageWithModels(
              img,
              selectedModels,
              config,
              [...project.classes, ...accumulatedNewClasses]
            );
            return { imageId: img.id, annotations: res.annotations, newClasses: res.newClasses };
          } catch (error) {
            console.error(`Falha ao anotar ${img.name}`, error);
            return { imageId: img.id, annotations: [], newClasses: [] as DatasetClass[] };
          }
        }));

        results.push(...batchResults.map(({ imageId, annotations }) => ({ imageId, annotations })));
        const discovered = batchResults.flatMap((item) => item.newClasses);
        const knownNames = new Set([...project.classes, ...accumulatedNewClasses].map((item) => item.name.toLowerCase()));
        accumulatedNewClasses = [
          ...accumulatedNewClasses,
          ...discovered.filter((item) => !knownNames.has(item.name.toLowerCase())),
        ];
        setBatchProgress(Math.round((Math.min(start + batch.length, unannotatedImages.length) / unannotatedImages.length) * 100));
      }

      onBatchApplyAnnotations(results, accumulatedNewClasses);
      setBatchStatus('Processamento em lote concluído com sucesso!');
    } finally {
      setIsBatchRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Auto-Anotação & Modelos IA Pré-Treinados
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Gratuitos & SOTA
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Escolha um ou mais modelos por nome, classe suportada ou tipo de anotação desejado.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAISettings && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAISettings();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors"
                title="Configurar Chaves de API para modelos online (Gemini, OpenAI, etc.)"
              >
                <Key className="w-3.5 h-3.5 text-yellow-400" />
                <span>Chaves de API</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Filters */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                1. Selecione um ou mais Modelos {isEnsembleMode && (
                  <span className="ml-1 text-emerald-400 inline-flex items-center gap-1 normal-case">
                    <Users className="w-3 h-3" /> Modo Ensemble ({selectedModels.length} modelos)
                  </span>
                )}
              </label>
              <button
                onClick={() => setShowAddCustomModel((s) => !s)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-400 hover:text-blue-300"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Adicionar Modelo Customizado
              </button>
            </div>

            <div className="mb-3 rounded-xl border border-indigo-900/60 bg-indigo-950/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                  Presets de ensemble recomendados
                </span>
                <span className="text-[10px] text-slate-500">Aplica pesos, consenso e thresholds</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {DETECTION_ENSEMBLE_PRESETS.map((preset) => {
                  const availableCount = resolvePresetModels(preset, models).length;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={availableCount === 0}
                      onClick={() => applyPreset(preset)}
                      className={`rounded-lg border p-2 text-left transition-colors disabled:opacity-40 ${
                        selectedPresetId === preset.id
                          ? 'border-indigo-400 bg-indigo-500/20'
                          : 'border-slate-800 bg-slate-950/60 hover:border-indigo-700'
                      }`}
                    >
                      <span className="block text-xs font-semibold text-slate-200">{preset.name}</span>
                      <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-500">{preset.description}</span>
                      <span className="mt-1 block text-[10px] font-mono text-indigo-400">
                        {availableCount} modelo(s) · {preset.minVotes > 1 ? `consenso ${preset.minVotes}` : 'alta cobertura'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Buscar por modelo ou por classe (ex: 'car', 'dog', 'pessoa')..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {ANNOTATION_TYPE_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setAnnotationTypeFilter(f.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                      annotationTypeFilter === f.value
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {showAddCustomModel && (
              <AddCustomModelForm
                onCancel={() => setShowAddCustomModel(false)}
                onAdded={() => {
                  setShowAddCustomModel(false);
                  refreshModels();
                }}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredModels.length === 0 && (
                <div className="col-span-2 text-center text-xs text-slate-500 py-6 border border-dashed border-slate-800 rounded-xl">
                  Nenhum modelo encontrado para esse filtro.
                </div>
              )}
              {filteredModels.map((model) => {
                const isSelected = selectedModelIds.includes(model.id);
                return (
                  <div
                    key={model.id}
                    onClick={() => toggleModelSelection(model.id)}
                    className={`relative flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 shadow-lg shadow-blue-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-semibold text-xs text-white flex items-center gap-1.5">
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        )}
                        {modelIcon(model)}
                        {model.name}
                        {model.isCustom && (
                          <span title="Modelo customizado">
                            <Link2 className="w-3 h-3 text-emerald-400" />
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          {model.provider}
                        </span>
                        {model.isCustom && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCustomModel(model.id);
                              setSelectedModelIds((prev) => prev.filter((id) => id !== model.id));
                              refreshModels();
                            }}
                            className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-950/30"
                            title="Remover modelo customizado"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">
                      {model.description}
                    </p>

                    {model.supportedClasses && model.supportedClasses.length > 0 && (
                      <p className="text-[10px] text-slate-500 mb-1.5 line-clamp-1">
                        Classes: {model.supportedClasses.slice(0, 6).join(', ')}
                        {model.supportedClasses.length > 6 ? `, +${model.supportedClasses.length - 6}` : ''}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-auto text-[10px] text-slate-500 font-mono">
                      <span className="text-blue-400 font-semibold">{model.speed}</span>
                      <span>•</span>
                      <span>Formato: {model.annotationType.toUpperCase()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hyperparameters & Confidence Sliders */}
          <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 space-y-4">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              2. Hiperparâmetros de Detecção & Filtros
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Confidence Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Threshold de Confiança (Confidence)</span>
                  <span className="font-mono text-blue-400 font-semibold">{Math.round(confidence * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="95"
                  value={Math.round(confidence * 100)}
                  onChange={(e) => setConfidence(Number(e.target.value) / 100)}
                  className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  Valores menores detectam mais objetos; valores maiores evitam falsos positivos.
                </span>
              </div>

              {/* IoU NMS Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Threshold IoU (NMS Suppress)</span>
                  <span className="font-mono text-blue-400 font-semibold">{Math.round(iou * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={Math.round(iou * 100)}
                  onChange={(e) => setIou(Number(e.target.value) / 100)}
                  className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  Controla a eliminação de caixas sobrepostas para o mesmo objeto.
                </span>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={autoAddNewClasses}
                  onChange={(e) => setAutoAddNewClasses(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                />
                <span>Criar novas classes automaticamente se detectadas</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                />
                <span>Sobrescrever anotações existentes</span>
              </label>
            </div>

            {isEnsembleMode && (
              <label className="flex items-center gap-2 text-xs text-slate-300 bg-emerald-950/20 border border-emerald-900/50 rounded-lg px-3 py-2">
                <input
                  type="checkbox"
                  checked={ensembleMinVotes >= 2}
                  onChange={(event) => setEnsembleMinVotes(event.target.checked ? 2 : 1)}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-0"
                />
                <span>
                  Exigir consenso de 2 modelos
                  <span className="block text-[10px] text-slate-500">Remove detecções isoladas e reduz falsos positivos. Fusão IoU: {Math.round(ensembleFusionIou * 100)}%.</span>
                </span>
              </label>
            )}

            {isEnsembleMode && (
              <div className="flex items-start gap-2 text-[11px] text-emerald-300 bg-emerald-950/20 border border-emerald-800/40 p-2.5 rounded-lg">
                <Users className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Com {selectedModels.length} modelos selecionados, cada objeto detectado por mais de um modelo terá sua
                  classe final decidida por votação (maioria, com empate resolvido pela confiança somada). Detecções sem
                  sobreposição são {ensembleMinVotes > 1 ? 'removidas pelo consenso configurado' : 'mantidas para revisão'}.
                </span>
              </div>
            )}
          </div>

          {/* Batch Progress Bar if active */}
          {isBatchRunning && (
            <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl p-4 space-y-2 animate-fade-in">
              <div className="flex justify-between text-xs font-semibold text-blue-300">
                <span>{batchStatus}</span>
                <span>{batchProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                  style={{ width: `${batchProgress}%` }}
                />
              </div>
            </div>
          )}

          {lastRunErrors.length > 0 && !isBatchRunning && (
            <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-950/30 border border-amber-800/40 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {lastRunErrors.length} modelo(s) falharam nesta execução: {lastRunErrors.map((e) => e.modelId).join(', ')}.
                Os demais modelos selecionados foram usados normalmente.
              </span>
            </div>
          )}

          {lastInferenceTime !== null && !isBatchRunning && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 p-3 rounded-xl">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Inferência concluída em <b>{lastInferenceTime}ms</b>! {previewDetectionsCount} anotações geradas.
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRunBatch}
              disabled={isBatchRunning || isLoading || selectedModels.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
            >
              {isBatchRunning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processando Lote...</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>Anotar Todo o Dataset</span>
                </>
              )}
            </button>

            <button
              onClick={handleRunCurrentImage}
              disabled={isLoading || isBatchRunning || !activeImage || selectedModels.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executando IA...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Anotar Imagem Atual</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TASK_OPTIONS: Array<{ value: AIModelTask; label: string }> = [
  { value: 'detection', label: 'Detecção (Bounding Box)' },
  { value: 'segmentation', label: 'Segmentação (Polígono)' },
  { value: 'pose', label: 'Pose (Keypoints)' },
  { value: 'classification', label: 'Classificação (Tag)' },
];

const ANNOTATION_TYPE_OPTIONS: Array<{ value: AIAnnotationOutputType; label: string }> = [
  { value: 'bbox', label: 'Bounding Box' },
  { value: 'polygon', label: 'Polígono' },
  { value: 'keypoint', label: 'Keypoints' },
  { value: 'tag', label: 'Tag/Classificação' },
];

const AddCustomModelForm: React.FC<{ onCancel: () => void; onAdded: () => void }> = ({ onCancel, onAdded }) => {
  const [name, setName] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [task, setTask] = useState<AIModelTask>('detection');
  const [annotationType, setAnnotationType] = useState<AIAnnotationOutputType>('bbox');
  const [classesInput, setClassesInput] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Informe um nome para o modelo.');
      return;
    }
    if (!/^https?:\/\/.+/i.test(endpointUrl.trim())) {
      setError('Informe uma URL de endpoint válida (http:// ou https://).');
      return;
    }
    addCustomModel({
      name,
      endpointUrl,
      apiKey: apiKey || undefined,
      task,
      annotationType,
      description,
      supportedClasses: classesInput
        .split(/[,\n]/)
        .map((c) => c.trim())
        .filter(Boolean),
    });
    onAdded();
  };

  return (
    <div className="mb-3 p-3.5 rounded-xl border border-blue-800/50 bg-blue-950/20 space-y-2.5">
      <p className="text-[11px] text-slate-400">
        Registre um servidor de inferência próprio (ex.: Roboflow, um endpoint self-hosted, ou outra instância do
        AnnotateX). O endpoint deve aceitar <code className="text-blue-300">POST {'{ image, confidence, iou, customClasses }'}</code> e
        responder <code className="text-blue-300">{'{ success, detections }'}</code> — o mesmo contrato do
        <code className="text-blue-300"> /api/ai/predict</code> deste app.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do modelo (ex: Detector de EPIs v2)"
          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
        />
        <input
          value={endpointUrl}
          onChange={(e) => setEndpointUrl(e.target.value)}
          placeholder="https://meu-servidor.com/predict"
          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
        />
        <select
          value={task}
          onChange={(e) => setTask(e.target.value as AIModelTask)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        >
          {TASK_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={annotationType}
          onChange={(e) => setAnnotationType(e.target.value as AIAnnotationOutputType)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        >
          {ANNOTATION_TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="API Key (opcional, enviada como Bearer token)"
          type="password"
          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
        />
        <input
          value={classesInput}
          onChange={(e) => setClassesInput(e.target.value)}
          placeholder="Classes suportadas, separadas por vírgula (opcional)"
          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
        />
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descrição (opcional)"
        rows={2}
        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 resize-none"
      />

      {error && <p className="text-[11px] text-red-400">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white"
        >
          Adicionar Modelo
        </button>
      </div>
    </div>
  );
};
