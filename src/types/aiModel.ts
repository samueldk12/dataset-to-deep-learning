import { Annotation, DatasetClass, Point } from './dataset';

// Built-in model ids are a fixed set, but custom models (see utils/customModels.ts)
// get user-chosen ids at runtime, so this widened to a plain string rather than a
// closed union. BUILTIN_AI_MODEL_IDS below still documents/enumerates the built-ins.
export type AIModelType = string;

export const BUILTIN_AI_MODEL_IDS = [
  'yolov11n',
  'yolov11s',
  'yolov11x',
  'yolov11-seg',
  'yolov11-pose',
  'yolov8n',
  'yolov8-seg',
  'mobilenet-v3',
  'resnet50',
  'clip-zeroshot',
  'heuristic-local',
] as const;

export type AIModelTask = 'detection' | 'segmentation' | 'pose' | 'classification' | 'zero-shot';
export type AIAnnotationOutputType = 'bbox' | 'polygon' | 'keypoint' | 'tag';

export interface AIModelInfo {
  id: AIModelType;
  name: string;
  architecture: string;
  provider: string;
  task: AIModelTask;
  description: string;
  classesCount: number | 'open-vocabulary';
  speed: string;
  annotationType: AIAnnotationOutputType;
  isLocalAvailable?: boolean;
  /** Class names this model can produce (e.g. the 80 COCO classes). Omitted/undefined for
   * open-vocabulary or unknown-taxonomy models -- use `classesCount === 'open-vocabulary'`
   * or `isOpenVocabulary` to detect those instead of assuming an empty list means "none". */
  supportedClasses?: string[];
  isOpenVocabulary?: boolean;
  /** true for a user-registered model (see utils/customModels.ts) as opposed to one of
   * the built-ins the backend/catalogue ships with. */
  isCustom?: boolean;
  /** Only set for isCustom models: a full URL to a prediction endpoint implementing the
   * same request/response contract as this app's own POST /api/ai/predict -- see
   * utils/customModels.ts for the documented contract. */
  endpointUrl?: string;
  endpointApiKey?: string;
}

export interface AIPredictionConfig {
  modelId: AIModelType;
  confidenceThreshold: number; // 0.05 to 0.99
  iouThreshold: number; // 0.1 to 0.9
  autoAddNewClasses: boolean;
  overwriteExisting: boolean;
  customClassPrompts?: string[]; // for zero-shot
  device?: 'auto' | 'cpu' | 'cuda';
  /** Minimum number of distinct models that must agree in ensemble mode. */
  ensembleMinVotes?: number;
  /** Relative reliability of each model. Confidence is multiplied by this value during fusion. */
  ensembleModelWeights?: Record<string, number>;
  /** Spatial overlap required to treat predictions as the same object. */
  ensembleFusionIou?: number;
}

export interface AIDetectionItem {
  className: string;
  confidence: number;
  type: 'bbox' | 'polygon' | 'keypoint';
  points: Point[];
  keypointNames?: string[];
}

export interface AIPredictionResponse {
  success: boolean;
  modelId: string;
  inferenceTimeMs: number;
  detections: AIDetectionItem[];
  error?: string;
}

export interface AIModelFilter {
  /** Free-text match against model name/description/architecture and (if present)
   * supportedClasses -- covers both "search by model" and "search by class/category". */
  searchText?: string;
  annotationType?: AIAnnotationOutputType | 'all';
}
