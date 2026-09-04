import { AIAnnotationOutputType, AIModelInfo } from '../types/aiModel';

export interface DetectionEnsemblePreset {
  id: string;
  name: string;
  description: string;
  annotationType: AIAnnotationOutputType;
  preferredModelIds: string[];
  confidence: number;
  inferenceIou: number;
  fusionIou: number;
  minVotes: number;
  modelWeights: Record<string, number>;
  vesselAware?: boolean;
}

export const DETECTION_ENSEMBLE_PRESETS: DetectionEnsemblePreset[] = [
  {
    id: 'general-balanced',
    name: 'Geral balanceado',
    description: 'YOLO11s + YOLOv8n com consenso; bom padrão para reduzir falsos positivos.',
    annotationType: 'bbox',
    preferredModelIds: ['yolov11s', 'yolov8n'],
    confidence: 0.3,
    inferenceIou: 0.5,
    fusionIou: 0.55,
    minVotes: 2,
    modelWeights: { yolov11s: 1.15, yolov8n: 0.85 },
  },
  {
    id: 'ship-recall',
    name: 'Navios · alta cobertura',
    description: 'Prioriza detectores customizados de navios e mantém achados isolados para revisão humana.',
    annotationType: 'bbox',
    preferredModelIds: ['yolov11s', 'yolov8n'],
    confidence: 0.18,
    inferenceIou: 0.55,
    fusionIou: 0.45,
    minVotes: 1,
    modelWeights: { yolov11s: 1.1, yolov8n: 0.8 },
    vesselAware: true,
  },
  {
    id: 'ship-precision',
    name: 'Navios · alta precisão',
    description: 'Exige acordo entre dois detectores; indicado para pré-rótulos com menor retrabalho.',
    annotationType: 'bbox',
    preferredModelIds: ['yolov11s', 'yolov8n'],
    confidence: 0.32,
    inferenceIou: 0.5,
    fusionIou: 0.5,
    minVotes: 2,
    modelWeights: { yolov11s: 1.15, yolov8n: 0.85 },
    vesselAware: true,
  },
  {
    id: 'instance-segmentation',
    name: 'Segmentação precisa',
    description: 'Combina máscaras YOLO11 e YOLOv8 para contornos mais estáveis.',
    annotationType: 'polygon',
    preferredModelIds: ['yolov11-seg', 'yolov8-seg'],
    confidence: 0.28,
    inferenceIou: 0.5,
    fusionIou: 0.5,
    minVotes: 2,
    modelWeights: { 'yolov11-seg': 1.1, 'yolov8-seg': 0.9 },
  },
];

const VESSEL_TERMS = ['ship', 'boat', 'vessel', 'navio', 'barco', 'embarca'];

function isVesselModel(model: AIModelInfo): boolean {
  const searchable = [model.name, model.description, ...(model.supportedClasses || [])].join(' ').toLowerCase();
  return model.annotationType === 'bbox' && VESSEL_TERMS.some((term) => searchable.includes(term));
}

export function resolvePresetModels(preset: DetectionEnsemblePreset, models: AIModelInfo[]): AIModelInfo[] {
  const compatible = models.filter((model) => model.annotationType === preset.annotationType);
  const preferred = preset.preferredModelIds
    .map((id) => compatible.find((model) => model.id === id))
    .filter((model): model is AIModelInfo => Boolean(model));

  if (!preset.vesselAware) return preferred;

  const vesselModels = compatible.filter(isVesselModel);
  const customVesselModels = vesselModels.filter((model) => model.isCustom);
  const resolved = [...customVesselModels, ...preferred, ...vesselModels];
  return resolved.filter((model, index) => resolved.findIndex((item) => item.id === model.id) === index).slice(0, 3);
}
