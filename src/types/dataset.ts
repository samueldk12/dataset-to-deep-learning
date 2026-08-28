export interface Point {
  x: number;
  y: number;
}

export type AnnotationType = 
  | 'bbox' 
  | 'polygon' 
  | 'keypoint' 
  | 'polyline' 
  | 'circle' 
  | 'cuboid3d' 
  | 'skeleton' 
  | 'brush' 
  | 'tag';

export interface Annotation {
  id: string;
  classId: string;
  type: AnnotationType;
  points: Point[];
  visible?: boolean;
  locked?: boolean;
  score?: number;
  attributes?: Record<string, string | number | boolean>;
  createdAt?: number;
}

export interface DatasetClass {
  id: string;
  name: string;
  color: string;
  shortcutKey?: string;
  visible: boolean;
  locked: boolean;
}

export interface ClassSet {
  id: string;
  name: string;
  description?: string;
  classes: DatasetClass[];
  createdAt: number;
}

/* ==========================================================================
   DOMAIN & TASK TAXONOMY
   ========================================================================== */

export type DomainCategory = 'vision' | 'nlp' | 'audio';

export type VisionTaskType =
  | 'object_detection'
  | 'instance_segmentation'
  | 'panoptic_segmentation'
  | 'pose_estimation'
  | 'image_classification'
  | 'video_mot'
  | 'ocr_text_spotting'
  | 'visual_grounding'
  | 'vqa_captioning'
  | 'depth_estimation'
  | 'super_resolution'
  | 'point_cloud_3d'
  | 'optical_flow'
  | 'diffusion_controlnet';

export type NLPTaskType =
  | 'text_classification'
  | 'token_ner'
  | 'extractive_qa'
  | 'text_to_sql'
  | 'chain_of_thought'
  | 'function_calling'
  | 'rag_retrieval'
  | 'coreference_resolution'
  | 'relation_extraction'
  | 'sentence_pairs_nli'
  | 'seq2seq_translation'
  | 'instruction_sft_dpo';

export type AudioTaskType =
  | 'speech_recognition_asr'
  | 'audio_classification'
  | 'speaker_diarization'
  | 'sound_event_detection'
  | 'text_to_speech_tts'
  | 'source_separation'
  | 'speech_denoising'
  | 'forced_alignment'
  | 'voice_cloning'
  | 'music_mir'
  | 'lip_sync_visual'
  | 'speech_to_speech_s2st';

export type DatasetTaskType = VisionTaskType | NLPTaskType | AudioTaskType;

/* ==========================================================================
   VISION DATA MODELS
   ========================================================================== */

export interface DatasetImage {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  size?: number;
  annotations: Annotation[];
  annotationLayers?: Record<string, Annotation[]>;
  tags: string[];
  status: 'unannotated' | 'in_progress' | 'completed';
  fileBlob?: Blob;

  // Extended Multimodal & Vision Metadata
  ocrText?: string;
  vqaQuestion?: string;
  vqaAnswer?: string;
  groundingExpression?: string;
  depthMapUrl?: string;
  highResUrl?: string;
  pointCloudData?: number[][];
  trackId?: number;
  frameIndex?: number;
}

/* ==========================================================================
   NLP & LLM DATA MODELS
   ========================================================================== */

export interface TextSpanAnnotation {
  id: string;
  classId: string;
  start: number;
  end: number;
  text: string;
}

export interface ExtractiveQAItem {
  id: string;
  context: string;
  question: string;
  answerStart: number;
  answerEnd: number;
  answerText: string;
}

export interface TextToSQLItem {
  id: string;
  question: string;
  sql: string;
  databaseSchema?: string;
}

export interface ChainOfThoughtItem {
  id: string;
  prompt: string;
  thought: string;
  response: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface ToolCallItem {
  id: string;
  prompt: string;
  availableTools: Array<{ name: string; description: string; parameters: any }>;
  chosenToolCall: { name: string; arguments: Record<string, any> };
  finalResponse: string;
}

export interface RAGRetrievalItem {
  id: string;
  query: string;
  positivePassage: string;
  negativePassages: string[];
  relevanceScore?: number;
}

export interface CoreferenceItem {
  id: string;
  text: string;
  clusters: Array<Array<{ start: number; end: number; text: string }>>;
}

export interface RelationItem {
  id: string;
  text: string;
  subject: string;
  relation: string;
  object: string;
}

export interface SentencePairItem {
  id: string;
  premise: string;
  hypothesis: string;
  label: 'entailment' | 'contradiction' | 'neutral';
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMDatasetItem {
  id: string;
  title: string;
  systemPrompt?: string;
  messages: LLMMessage[];
  chosen?: string;
  rejected?: string;
  tags: string[];
  status: 'unannotated' | 'in_progress' | 'completed';
}

export interface TextDatasetItem {
  id: string;
  title: string;
  content: string;
  annotations: TextSpanAnnotation[];
  tags: string[];
  status: 'unannotated' | 'in_progress' | 'completed';
}

/* ==========================================================================
   AUDIO DATA MODELS
   ========================================================================== */

export interface AudioDatasetItem {
  id: string;
  name: string;
  audioUrl: string;
  durationSec: number;
  sampleRate?: number;
  status: 'unannotated' | 'in_progress' | 'completed';

  // Task-specific audio fields
  transcription?: string; // ASR / STT
  ttsTargetText?: string; // TTS
  label?: string; // Audio Classification
  tags?: string[];

  // Speaker Diarization
  diarizationSegments?: Array<{
    id: string;
    start: number;
    end: number;
    speaker: string;
    text?: string;
  }>;

  // Sound Event Detection (SED)
  soundEvents?: Array<{
    id: string;
    start: number;
    end: number;
    event: string;
  }>;

  // Forced Alignment (Word/Phoneme timestamps)
  alignmentWords?: Array<{
    word: string;
    start: number;
    end: number;
  }>;

  // Source Separation Stems
  separationStems?: Record<string, string>; // e.g. { vocals: '...', drums: '...' }

  // Music MIR
  midiEvents?: Array<{
    pitch: number;
    start: number;
    end: number;
    velocity: number;
    chord?: string;
  }>;

  // Denoising
  cleanAudioUrl?: string;
}

/* ==========================================================================
   RE-IDENTIFICATION
   ========================================================================== */

export interface ReIDItem {
  id: string;
  name: string;
  url: string;
  globalId: string;
  cameraId: string;
  frameIndex?: number;
  isQuery?: boolean;
  tags: string[];
}

/* ==========================================================================
   PROJECT DEFINITION (MULTI-MODALITY UNIFIED)
   ========================================================================== */

export interface DatasetProject {
  id: string;
  name: string;
  description: string;
  domain: DomainCategory;
  taskType: DatasetTaskType;
  classSets: ClassSet[];
  activeClassSetId: string;
  classes: DatasetClass[];

  // Storage Containers
  images: DatasetImage[];
  textItems?: TextDatasetItem[];
  reidItems?: ReIDItem[];
  llmItems?: LLMDatasetItem[];
  qaItems?: ExtractiveQAItem[];
  sqlItems?: TextToSQLItem[];
  cotItems?: ChainOfThoughtItem[];
  toolCallItems?: ToolCallItem[];
  ragItems?: RAGRetrievalItem[];
  corefItems?: CoreferenceItem[];
  relationItems?: RelationItem[];
  sentencePairItems?: SentencePairItem[];
  audioItems?: AudioDatasetItem[];

  activeImageId: string | null;
  activeTextId?: string | null;
  activeLlmId?: string | null;
  activeReidId?: string | null;
  activeAudioId?: string | null;

  createdAt: number;
  updatedAt: number;
}

export type ExportFormat =
  | 'yolo'
  | 'coco'
  | 'voc'
  | 'parquet'
  | 'jsonl'
  | 'spacy'
  | 'sharegpt'
  | 'alpaca'
  | 'squad'
  | 'csv'
  | 'json'
  | 'masks'
  | 'zip'
  | 'webdataset';
