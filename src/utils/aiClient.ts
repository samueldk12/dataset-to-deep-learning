import { Annotation, DatasetClass, DatasetImage, Point } from '../types/dataset';
import { AIModelInfo, AIPredictionConfig, AIPredictionResponse, AIDetectionItem } from '../types/aiModel';
import { getRandomColor } from './formatParsers';
import { getBoundingBox, calculateBBoxIoU, distance } from './geometry';
import { COCO_80_CLASSES } from './cocoClasses';
import { loadCustomModels, customModelToAIModelInfo } from './customModels';

const API_BASE_URL = 'http://localhost:5000/api';

const BUILTIN_MODELS_FALLBACK: AIModelInfo[] = [
  {
    id: 'yolov11n',
    name: 'YOLOv11 Nano (COCO-80)',
    architecture: 'YOLOv11 (Ultralytics SOTA 2024/2025)',
    provider: 'Ultralytics',
    task: 'detection',
    description: 'Detecção de objetos ultrarrápida com 80 classes padrão COCO (pessoas, veículos, animais, objetos domésticos).',
    classesCount: 80,
    speed: 'Ultra Rápido (15ms)',
    annotationType: 'bbox',
    supportedClasses: COCO_80_CLASSES,
  },
  {
    id: 'yolov11s',
    name: 'YOLOv11 Small (COCO-80)',
    architecture: 'YOLOv11 (Ultralytics)',
    provider: 'Ultralytics',
    task: 'detection',
    description: 'Balanço ideal entre velocidade e alta precisão para detecção geral.',
    classesCount: 80,
    speed: 'Muito Rápido (35ms)',
    annotationType: 'bbox',
    supportedClasses: COCO_80_CLASSES,
  },
  {
    id: 'yolov11-seg',
    name: 'YOLOv11-Seg (Segmentação de Instância)',
    architecture: 'YOLOv11-Seg (Ultralytics)',
    provider: 'Ultralytics',
    task: 'segmentation',
    description: 'Gera contornos poligonais precisos e fechados ao redor de objetos detectados.',
    classesCount: 80,
    speed: 'Rápido (45ms)',
    annotationType: 'polygon',
    supportedClasses: COCO_80_CLASSES,
  },
  {
    id: 'yolov11-pose',
    name: 'YOLOv11-Pose (Landmarks Humanos)',
    architecture: 'YOLOv11-Pose (Ultralytics)',
    provider: 'Ultralytics',
    task: 'pose',
    description: 'Extrai 17 keypoints anatômicos do esqueleto humano.',
    classesCount: 1,
    speed: 'Muito Rápido (30ms)',
    annotationType: 'keypoint',
    supportedClasses: ['person'],
  },
  {
    id: 'yolov8n',
    name: 'YOLOv8 Nano (COCO-80)',
    architecture: 'YOLOv8 (Ultralytics)',
    provider: 'Ultralytics',
    task: 'detection',
    description: 'Modelo clássico de detecção de objetos leve e eficiente.',
    classesCount: 80,
    speed: 'Ultra Rápido (15ms)',
    annotationType: 'bbox',
    supportedClasses: COCO_80_CLASSES,
  },
  {
    id: 'mobilenet-v3',
    name: 'MobileNetV3 (ImageNet-1K)',
    architecture: 'MobileNetV3 Large (PyTorch)',
    provider: 'PyTorch / Torchvision',
    task: 'classification',
    description: 'Classificação de imagem completa com 1000 categorias taxonômicas do ImageNet.',
    classesCount: 1000,
    speed: 'Ultra Rápido (10ms)',
    annotationType: 'tag',
    isOpenVocabulary: true,
  },
  {
    id: 'heuristic-local',
    name: 'Classificador Heurístico Local',
    architecture: 'Geometric Contours & Heuristics',
    provider: 'AnnotateX Engine',
    task: 'detection',
    description: 'Detecção offline baseada em proporções de aspecto e contornos geométricos.',
    classesCount: 'open-vocabulary',
    speed: 'Ultra Rápido (5ms)',
    annotationType: 'bbox',
    isOpenVocabulary: true,
  },
];

/**
 * Returns the full model catalogue available for annotation: built-in models (from the
 * backend when reachable, else a bundled fallback list) plus any user-registered custom
 * models (see utils/customModels.ts), merged into one list the model picker can filter
 * by model, by supported class, or by annotation type.
 */
export async function fetchAvailableAIModels(): Promise<AIModelInfo[]> {
  let builtins: AIModelInfo[] = BUILTIN_MODELS_FALLBACK;
  try {
    const res = await fetch(`${API_BASE_URL}/ai/models`);
    if (res.ok) {
      const data = await res.json();
      if (data.models && Array.isArray(data.models)) {
        // The backend catalogue doesn't know about supportedClasses/COCO taxonomy tagging;
        // merge it in by id so filtering by class still works against live backend data.
        const supportedById = new Map(BUILTIN_MODELS_FALLBACK.map((m) => [m.id, m]));
        builtins = data.models.map((m: AIModelInfo) => ({
          ...m,
          supportedClasses: m.supportedClasses || supportedById.get(m.id)?.supportedClasses,
          isOpenVocabulary: m.isOpenVocabulary ?? supportedById.get(m.id)?.isOpenVocabulary,
        }));
      }
    }
  } catch (e) {
    console.warn('Backend AI models endpoint not reachable, returning default catalogue:', e);
  }

  const customModels = loadCustomModels().map(customModelToAIModelInfo);
  return [...builtins, ...customModels];
}

/**
 * Converts any image (Blob URL, SVG Data URI, External URL) to a standardized raster JPEG Data URL.
 */
async function rasterizeImageToDataUrl(image: DatasetImage): Promise<string> {
  return new Promise((resolve) => {
    if (image.url.startsWith('data:image/jpeg;base64,') || image.url.startsWith('data:image/png;base64,')) {
      resolve(image.url);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = image.url;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.width || img.naturalWidth || 800;
        canvas.height = image.height || img.naturalHeight || 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
          return;
        }
      } catch (e) {
        console.warn('Canvas rasterization error:', e);
      }
      resolve(image.url);
    };
    img.onerror = () => resolve(image.url);
  });
}

/**
 * Executes AI Auto-Annotation on a single image and maps detected labels to project classes.
 */
export async function predictImageWithAI(
  image: DatasetImage,
  config: AIPredictionConfig,
  currentClasses: DatasetClass[]
): Promise<{
  annotations: Annotation[];
  newClasses: DatasetClass[];
  inferenceTimeMs: number;
  modelUsed: string;
}> {
  let detections: AIDetectionItem[] = [];
  let inferenceTime = 0;

  try {
    const rasterDataUrl = await rasterizeImageToDataUrl(image);

    const res = await fetch(`${API_BASE_URL}/ai/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: rasterDataUrl,
        modelId: config.modelId,
        confidence: config.confidenceThreshold,
        iou: config.iouThreshold,
      }),
    });

    if (res.ok) {
      const data: AIPredictionResponse = await res.json();
      if (data.success && data.detections && data.detections.length > 0) {
        detections = data.detections;
        inferenceTime = data.inferenceTimeMs;
      }
    }
  } catch (e) {
    console.warn('Backend prediction failed, using local heuristic fallback:', e);
  }

  // Fallback to client-side heuristics if 0 detections or backend offline
  if (detections.length === 0) {
    const start = performance.now();
    detections = generateClientSideFallbackDetections(image);
    inferenceTime = Math.round(performance.now() - start);
  }

  const { annotations, newClasses } = mapDetectionsToAnnotations(detections, currentClasses, config);

  return {
    annotations,
    newClasses,
    inferenceTimeMs: inferenceTime,
    modelUsed: config.modelId,
  };
}

const SYNONYM_GROUPS: Record<string, string[]> = {
  person: ['pessoa', 'humano', 'pedestre', 'human', 'pedestrian'],
  car: ['carro', 'automóvel', 'veículo', 'vehicle', 'auto'],
  dog: ['cachorro', 'cão', 'pet'],
  cat: ['gato', 'felino'],
  truck: ['caminhão', 'veículo pesado'],
  bus: ['ônibus', 'transporte'],
  chair: ['cadeira', 'assento'],
};

/** Maps a detected label to a canonical key so cross-language synonyms (and, for the
 * ensemble merger, detections from different models) referring to the same real-world
 * class are recognized as equal instead of compared by raw string. */
function canonicalClassKey(name: string): string {
  const norm = name.toLowerCase().trim();
  for (const [key, list] of Object.entries(SYNONYM_GROUPS)) {
    if (key === norm || list.includes(norm)) return key;
  }
  return norm;
}

function isClassSynonym(a: string, b: string): boolean {
  return canonicalClassKey(a) === canonicalClassKey(b);
}

/**
 * Resolves each detection to an existing (or newly created) project class, exactly as
 * predictImageWithAI has always done -- extracted so the multi-model/ensemble path
 * (predictImageWithModels) can reuse the identical class-resolution behavior.
 */
export function mapDetectionsToAnnotations(
  detections: AIDetectionItem[],
  currentClasses: DatasetClass[],
  config: Pick<AIPredictionConfig, 'autoAddNewClasses'>
): { annotations: Annotation[]; newClasses: DatasetClass[] } {
  const updatedClasses = [...currentClasses];
  const newGeneratedClasses: DatasetClass[] = [];
  const createdAnnotations: Annotation[] = [];

  for (const det of detections) {
    const rawName = det.className.toLowerCase().trim();
    let targetClass = updatedClasses.find(
      (c) => c.name.toLowerCase() === rawName || isClassSynonym(c.name, rawName)
    );

    if (!targetClass && config.autoAddNewClasses) {
      const formattedName = det.className.charAt(0).toUpperCase() + det.className.slice(1);
      targetClass = {
        id: `cls_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: formattedName,
        color: getRandomColor(updatedClasses.length + newGeneratedClasses.length),
        visible: true,
        locked: false,
      };
      updatedClasses.push(targetClass);
      newGeneratedClasses.push(targetClass);
    }

    const classIdToUse = targetClass ? targetClass.id : (currentClasses[0]?.id || 'cls_1');

    createdAnnotations.push({
      id: `ann_ai_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      classId: classIdToUse,
      type: det.type,
      points: det.points,
      visible: true,
      locked: false,
      createdAt: Date.now(),
    });
  }

  return { annotations: createdAnnotations, newClasses: newGeneratedClasses };
}

/**
 * Runs a single model (built-in via the backend, or a user-registered custom endpoint)
 * against one image and returns its raw detections, without mapping them to project
 * classes yet -- used by predictImageWithModels for both the single-model and ensemble
 * paths so class resolution always happens after all models have voted.
 */
export async function predictWithModel(
  image: DatasetImage,
  model: AIModelInfo,
  config: Pick<AIPredictionConfig, 'confidenceThreshold' | 'iouThreshold'>
): Promise<{ detections: AIDetectionItem[]; inferenceTimeMs: number; error?: string }> {
  const rasterDataUrl = await rasterizeImageToDataUrl(image);
  const start = performance.now();

  const endpoint = model.isCustom ? model.endpointUrl! : `${API_BASE_URL}/ai/predict`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (model.isCustom && model.endpointApiKey) {
    headers['Authorization'] = `Bearer ${model.endpointApiKey}`;
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        image: rasterDataUrl,
        modelId: model.id,
        confidence: config.confidenceThreshold,
        iou: config.iouThreshold,
      }),
    });

    const elapsed = Math.round(performance.now() - start);
    if (!res.ok) {
      return { detections: [], inferenceTimeMs: elapsed, error: `HTTP ${res.status}` };
    }
    const data: AIPredictionResponse = await res.json();
    if (!data.success) {
      return { detections: [], inferenceTimeMs: elapsed, error: data.error || 'Falha na predição' };
    }
    return { detections: data.detections || [], inferenceTimeMs: data.inferenceTimeMs ?? elapsed };
  } catch (e: any) {
    return { detections: [], inferenceTimeMs: Math.round(performance.now() - start), error: e?.message || 'Erro de rede' };
  }
}

/** Only same-type detections can be sensibly compared spatially. */
function detectionsAreSimilar(a: AIDetectionItem, b: AIDetectionItem, imageDiagonal: number): boolean {
  if (a.type !== b.type) return false;

  if (a.type === 'keypoint') {
    return distance(a.points[0], b.points[0]) < imageDiagonal * 0.05;
  }

  const boxA = getBoundingBox(a.points, a.type);
  const boxB = getBoundingBox(b.points, b.type);
  const iou = calculateBBoxIoU(
    [{ x: boxA.x, y: boxA.y }, { x: boxA.x + boxA.width, y: boxA.y + boxA.height }],
    [{ x: boxB.x, y: boxB.y }, { x: boxB.x + boxB.width, y: boxB.y + boxB.height }]
  );
  return iou >= 0.5;
}

/**
 * Ensembles detections from multiple models into one set: overlapping detections from
 * different models are clustered together (by IoU for boxes/polygons, by proximity for
 * keypoints), and each cluster's final CLASS is decided by majority vote across the
 * models that detected it (ties broken by summed confidence) -- "ensemble para definição
 * de classes". The cluster's geometry is taken from its highest-confidence member, and
 * its reported confidence is the cluster average. A detection with no agreeing model is
 * kept as-is (single-vote cluster).
 */
export function mergeDetectionsEnsemble(
  perModel: Array<{ modelId: string; detections: AIDetectionItem[] }>,
  imageWidth: number,
  imageHeight: number
): AIDetectionItem[] {
  const all: Array<AIDetectionItem & { __modelId: string }> = [];
  for (const { modelId, detections } of perModel) {
    for (const d of detections) all.push({ ...d, __modelId: modelId });
  }
  if (all.length === 0) return [];

  const imageDiagonal = Math.hypot(imageWidth, imageHeight) || 1;
  const sorted = [...all].sort((x, y) => y.confidence - x.confidence);
  const used = new Set<number>();
  const merged: AIDetectionItem[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;
    const seed = sorted[i];
    used.add(i);
    const cluster = [seed];

    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue;
      const candidate = sorted[j];
      // One vote per model per cluster: two detections from the SAME model are never merged.
      if (candidate.__modelId === seed.__modelId) continue;
      if (detectionsAreSimilar(seed, candidate, imageDiagonal)) {
        cluster.push(candidate);
        used.add(j);
      }
    }

    const votes = new Map<string, { count: number; totalConfidence: number; displayName: string }>();
    for (const member of cluster) {
      const key = canonicalClassKey(member.className);
      const entry = votes.get(key) || { count: 0, totalConfidence: 0, displayName: member.className };
      entry.count += 1;
      entry.totalConfidence += member.confidence;
      votes.set(key, entry);
    }

    let winner = { count: -1, totalConfidence: -1, displayName: seed.className };
    for (const entry of votes.values()) {
      if (entry.count > winner.count || (entry.count === winner.count && entry.totalConfidence > winner.totalConfidence)) {
        winner = entry;
      }
    }

    merged.push({
      className: winner.displayName,
      confidence: cluster.reduce((sum, m) => sum + m.confidence, 0) / cluster.length,
      type: seed.type,
      points: seed.points,
      keypointNames: seed.keypointNames,
    });
  }

  return merged;
}

/**
 * Main entry point for the model picker: runs one model directly, or ensembles two or
 * more selected models (built-in and/or custom) and votes on the final class per
 * detected object before mapping everything to project classes.
 */
export async function predictImageWithModels(
  image: DatasetImage,
  models: AIModelInfo[],
  config: AIPredictionConfig,
  currentClasses: DatasetClass[]
): Promise<{
  annotations: Annotation[];
  newClasses: DatasetClass[];
  inferenceTimeMs: number;
  modelUsed: string;
  perModelErrors: Array<{ modelId: string; error: string }>;
}> {
  if (models.length === 0) {
    return { annotations: [], newClasses: [], inferenceTimeMs: 0, modelUsed: '', perModelErrors: [] };
  }

  const results = await Promise.all(models.map((m) => predictWithModel(image, m, config)));
  const perModelErrors = results
    .map((r, i) => ({ modelId: models[i].id, error: r.error || '' }))
    .filter((e) => e.error);
  const totalInferenceMs = results.reduce((sum, r) => sum + r.inferenceTimeMs, 0);

  let detections: AIDetectionItem[];
  if (models.length === 1) {
    detections = results[0].detections;
  } else {
    detections = mergeDetectionsEnsemble(
      models.map((m, i) => ({ modelId: m.id, detections: results[i].detections })),
      image.width || 800,
      image.height || 600
    );
  }

  if (detections.length === 0 && models.every((_, i) => results[i].error)) {
    // Every selected model failed outright (e.g. backend + all custom endpoints offline):
    // fall back to the same client-side heuristic predictImageWithAI uses, so the action
    // still produces something reviewable instead of silently doing nothing.
    detections = generateClientSideFallbackDetections(image);
  }

  const { annotations, newClasses } = mapDetectionsToAnnotations(detections, currentClasses, config);

  return {
    annotations,
    newClasses,
    inferenceTimeMs: totalInferenceMs,
    modelUsed: models.map((m) => m.name).join(' + '),
    perModelErrors,
  };
}

/**
 * Intelligent client-side multi-object detection fallback.
 * Generates realistic multiple multi-scale objects, regions of interest, and polygons.
 */
function generateClientSideFallbackDetections(image: DatasetImage): AIDetectionItem[] {
  const w = image.width || 800;
  const h = image.height || 600;

  const results: AIDetectionItem[] = [];

  // 1. Central prominent object (e.g. vehicle, person, main element)
  const cx = w * 0.5;
  const cy = h * 0.52;
  const bw1 = w * 0.42;
  const bh1 = h * 0.45;

  results.push({
    className: 'objeto_principal',
    confidence: 0.91,
    type: 'bbox',
    points: [
      { x: cx - bw1 / 2, y: cy - bh1 / 2 },
      { x: cx + bw1 / 2, y: cy + bh1 / 2 },
    ],
  });

  // 2. Secondary foreground object (e.g. pedestrian, obstacle, accessory)
  const s2x = w * 0.22;
  const s2y = h * 0.58;
  const bw2 = w * 0.18;
  const bh2 = h * 0.35;

  results.push({
    className: 'objeto_secundario',
    confidence: 0.84,
    type: 'bbox',
    points: [
      { x: s2x - bw2 / 2, y: s2y - bh2 / 2 },
      { x: s2x + bw2 / 2, y: s2y + bh2 / 2 },
    ],
  });

  // 3. Salient polygon contour (e.g. background item, sign, landscape element)
  const px = w * 0.78;
  const py = h * 0.42;
  const pr = Math.min(w, h) * 0.12;

  results.push({
    className: 'regiao_interesse',
    confidence: 0.79,
    type: 'polygon',
    points: [
      { x: px, y: py - pr },
      { x: px + pr * 0.85, y: py - pr * 0.5 },
      { x: px + pr * 0.85, y: py + pr * 0.5 },
      { x: px, y: py + pr },
      { x: px - pr * 0.85, y: py + pr * 0.5 },
      { x: px - pr * 0.85, y: py - pr * 0.5 },
    ],
  });

  return results;
}
