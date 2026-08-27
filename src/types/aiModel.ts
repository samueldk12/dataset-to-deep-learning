import { Annotation, DatasetClass, Point } from './dataset';

export type AIModelType = 
  | 'yolov11n'
  | 'yolov11s'
  | 'yolov11x'
  | 'yolov11-seg'
  | 'yolov11-pose'
  | 'yolov8n'
  | 'yolov8-seg'
  | 'mobilenet-v3'
  | 'resnet50'
  | 'clip-zeroshot'
  | 'heuristic-local';

export interface AIModelInfo {
  id: AIModelType;
  name: string;
  architecture: string;
  provider: 'Ultralytics' | 'PyTorch / Torchvision' | 'HuggingFace / OpenAI' | 'AnnotateX Engine';
  task: 'detection' | 'segmentation' | 'pose' | 'classification' | 'zero-shot';
  description: string;
  classesCount: number | 'open-vocabulary';
  speed: string;
  annotationType: 'bbox' | 'polygon' | 'keypoint' | 'tag';
  isLocalAvailable?: boolean;
}

export interface AIPredictionConfig {
  modelId: AIModelType;
  confidenceThreshold: number; // 0.05 to 0.99
  iouThreshold: number; // 0.1 to 0.9
  autoAddNewClasses: boolean;
  overwriteExisting: boolean;
  customClassPrompts?: string[]; // for zero-shot
  device?: 'auto' | 'cpu' | 'cuda';
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
