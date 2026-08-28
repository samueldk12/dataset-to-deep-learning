import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Cpu, 
  Zap, 
  Sliders, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  X, 
  ChevronRight, 
  RefreshCw,
  Box,
  Shapes,
  UserCheck,
  Key
} from 'lucide-react';
import { DatasetClass, DatasetImage, DatasetProject } from '../../types/dataset';
import { AIModelInfo, AIPredictionConfig, AIModelType } from '../../types/aiModel';
import { fetchAvailableAIModels, predictImageWithAI } from '../../utils/aiClient';

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
  const [selectedModelId, setSelectedModelId] = useState<AIModelType>(defaultModelId);
  const [confidence, setConfidence] = useState(0.25);
  const [iou, setIou] = useState(0.45);
  const [autoAddNewClasses, setAutoAddNewClasses] = useState(true);
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  useEffect(() => {
    if (defaultModelId) setSelectedModelId(defaultModelId);
  }, [defaultModelId]);

  const handleSelectModel = (id: AIModelType) => {
    setSelectedModelId(id);
    localStorage.setItem('annotatex_default_ai_model', id);
    onModelChange?.(id);
  };

  const [isLoading, setIsLoading] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchStatus, setBatchStatus] = useState('');
  const [lastInferenceTime, setLastInferenceTime] = useState<number | null>(null);
  const [previewDetectionsCount, setPreviewDetectionsCount] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableAIModels().then((data) => {
        setModels(data);
        if (data.length > 0 && !data.find((m) => m.id === selectedModelId)) {
          setSelectedModelId(data[0].id);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0];

  const handleRunCurrentImage = async () => {
    if (!activeImage) return;
    setIsLoading(true);

    const config: AIPredictionConfig = {
      modelId: selectedModelId,
      confidenceThreshold: confidence,
      iouThreshold: iou,
      autoAddNewClasses,
      overwriteExisting,
    };

    try {
      const res = await predictImageWithAI(activeImage, config, project.classes);
      setLastInferenceTime(res.inferenceTimeMs);
      setPreviewDetectionsCount(res.annotations.length);
      onApplyAnnotations(activeImage.id, res.annotations, res.newClasses, overwriteExisting);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunBatch = async () => {
    const unannotatedImages = project.images.filter(
      (img) => overwriteExisting || img.annotations.length === 0
    );

    if (unannotatedImages.length === 0) {
      alert('Todas as imagens já possuem anotações. Marque "Sobrescrever anotações existentes" para re-anotar.');
      return;
    }

    setIsBatchRunning(true);
    setBatchProgress(0);
    const results: Array<{ imageId: string; annotations: any[] }> = [];
    let accumulatedNewClasses: DatasetClass[] = [];

    const config: AIPredictionConfig = {
      modelId: selectedModelId,
      confidenceThreshold: confidence,
      iouThreshold: iou,
      autoAddNewClasses,
      overwriteExisting,
    };

    for (let i = 0; i < unannotatedImages.length; i++) {
      const img = unannotatedImages[i];
      setBatchStatus(`Anotando imagem ${i + 1}/${unannotatedImages.length}: ${img.name}...`);
      setBatchProgress(Math.round(((i + 1) / unannotatedImages.length) * 100));

      const res = await predictImageWithAI(
        img,
        config,
        [...project.classes, ...accumulatedNewClasses]
      );
      results.push({ imageId: img.id, annotations: res.annotations });
      if (res.newClasses.length > 0) {
        accumulatedNewClasses = [...accumulatedNewClasses, ...res.newClasses];
      }
    }

    onBatchApplyAnnotations(results, accumulatedNewClasses);
    setIsBatchRunning(false);
    setBatchStatus('Processamento em lote concluído com sucesso!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
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
                Gere anotações de base com os melhores modelos do mercado para apenas refinar.
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
          {/* Model Selector Cards */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
              1. Selecione o Modelo Pré-Treinado Ativo
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {models.map((model) => {
                const isSelected = selectedModelId === model.id;
                return (
                  <button
                    key={model.id}
                    onClick={() => handleSelectModel(model.id)}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 shadow-lg shadow-blue-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-semibold text-xs text-white flex items-center gap-1.5">
                        {model.task === 'segmentation' ? (
                          <Shapes className="w-3.5 h-3.5 text-purple-400" />
                        ) : model.task === 'pose' ? (
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Box className="w-3.5 h-3.5 text-blue-400" />
                        )}
                        {model.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        {model.provider}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">
                      {model.description}
                    </p>

                    <div className="flex items-center gap-2 mt-auto text-[10px] text-slate-500 font-mono">
                      <span className="text-blue-400 font-semibold">{model.speed}</span>
                      <span>•</span>
                      <span>Formato: {model.annotationType.toUpperCase()}</span>
                    </div>
                  </button>
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
              disabled={isBatchRunning || isLoading}
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
              disabled={isLoading || isBatchRunning || !activeImage}
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
