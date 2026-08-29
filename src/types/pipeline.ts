import { Annotation, DatasetImage, DatasetProject, DatasetClass } from './dataset';
import { AIModelType } from './aiModel';

export type PortDataType = 'image' | 'annotations' | 'text' | 'audio' | 'json' | 'any';

export interface PipelinePort {
  id: string;
  name: string;
  type: PortDataType;
  label: string;
  connected?: boolean;
}

export type NodeCategory = 
  | 'input' 
  | 'ai_model' 
  | 'code_script' 
  | 'tool_filter' 
  | 'augmentation' 
  | 'validation' 
  | 'output';

export type PipelineNodeType =
  // 1. Inputs
  | 'dataset_source'
  | 'video_frame_source'
  | 'text_source'
  | 'audio_source'
  // 2. AI Models
  | 'yolo_detector'
  | 'yolo_segmentation'
  | 'yolo_pose'
  | 'sam2_segmentation'
  | 'gemini_multimodal'
  | 'zero_shot_classifier'
  // 3. Code & Scripts
  | 'custom_python_code'
  | 'custom_js_code'
  | 'regex_extractor'
  | 'json_transform'
  // 4. Standard Tools & Filters
  | 'confidence_filter'
  | 'class_filter_remap'
  | 'box_geometry_filter'
  | 'nms_ensemble'
  | 'smart_heuristics'
  // 5. Augmentation
  | 'augmentation_pipe'
  // 6. Validation & Gate
  | 'human_review_gate'
  | 'schema_validator'
  // 7. Outputs
  | 'save_to_dataset'
  | 'export_file'
  | 'webhook_dispatch';

export type NodeExecutionStatus = 'idle' | 'running' | 'success' | 'error';

export interface NodePosition {
  x: number;
  y: number;
}

export interface PipelineNode {
  id: string;
  type: PipelineNodeType;
  category: NodeCategory;
  title: string;
  description?: string;
  position: NodePosition;
  inputs: PipelinePort[];
  outputs: PipelinePort[];
  params: Record<string, any>;
  status?: NodeExecutionStatus;
  lastOutput?: any;
  errorMessage?: string;
  executionTimeMs?: number;
}

export interface PipelineEdge {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
}

export interface AnnotationPipeline {
  id: string;
  name: string;
  description: string;
  domain: 'vision' | 'nlp' | 'audio' | 'multimodal';
  projectId?: string;
  projectName?: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  createdAt: number;
  updatedAt: number;
}

export interface PipelineExecutionContext {
  project: DatasetProject;
  activeImage?: DatasetImage | null;
  allImages?: DatasetImage[];
  onProgress?: (progress: number, currentStepName: string, activeNodeId: string) => void;
  onNodeStateChange?: (nodeId: string, status: NodeExecutionStatus, output?: any, error?: string) => void;
}

export interface PipelineExecutionResult {
  success: boolean;
  pipelineId: string;
  executedNodeCount: number;
  totalTimeMs: number;
  nodeOutputs: Record<string, any>;
  finalAnnotations?: Annotation[];
  augmentedImages?: DatasetImage[];
  error?: string;
}

export type TriggerRuleType = 'tag_match' | 's3_bucket_watch' | 'api_webhook' | 'domain_match';

export interface PipelineTriggerRule {
  id: string;
  name: string;
  pipelineId: string;
  pipelineName?: string;
  enabled: boolean;
  triggerType: TriggerRuleType;
  matchTag?: string;
  s3BucketUri?: string;
  webhookCallbackUrl?: string;
  autoCreateDataset?: boolean;
  datasetNameTemplate?: string;
  paramsOverride?: Record<string, any>;
  lastTriggeredAt?: number;
  executionCount: number;
}

export interface PipelineAPITriggerPayload {
  pipeline_id: string;
  dataset_id?: string;
  dataset_name?: string;
  dataset_path?: string;
  s3_uri?: string;
  tag?: string;
  image_urls?: string[];
  params_override?: Record<string, any>;
  webhook_callback_url?: string;
}

