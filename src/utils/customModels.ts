import { AIAnnotationOutputType, AIModelInfo, AIModelTask } from '../types/aiModel';

/**
 * A user-registered custom inference model.
 *
 * Contract: `endpointUrl` must accept
 *   POST { image: string (data URL), confidence: number, iou: number, customClasses?: string[] }
 * and respond with
 *   { success: boolean, detections: Array<{ className, confidence, type, points }>, error?: string }
 * -- the exact same shape as this app's own POST /api/ai/predict (server/app.py), so any
 * self-hosted inference server (including another AnnotateX backend instance) that speaks
 * that contract can be registered here without any code changes.
 */
export interface CustomAIModel {
  id: string;
  name: string;
  endpointUrl: string;
  apiKey?: string;
  task: AIModelTask;
  annotationType: AIAnnotationOutputType;
  description?: string;
  /** Comma/space separated class names this model is expected to produce; used only for
   * the "filter by class" search in the model picker, not enforced against the response. */
  supportedClasses?: string[];
  createdAt: number;
}

const STORAGE_KEY = 'annotatex_custom_ai_models';

export function loadCustomModels(): CustomAIModel[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAllCustomModels(models: CustomAIModel[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
  } catch (e) {
    console.error('Failed to save custom AI models:', e);
  }
}

export function addCustomModel(input: {
  name: string;
  endpointUrl: string;
  apiKey?: string;
  task: AIModelTask;
  annotationType: AIAnnotationOutputType;
  description?: string;
  supportedClasses?: string[];
}): CustomAIModel {
  const model: CustomAIModel = {
    id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    name: input.name.trim(),
    endpointUrl: input.endpointUrl.trim(),
    apiKey: input.apiKey?.trim() || undefined,
    task: input.task,
    annotationType: input.annotationType,
    description: input.description?.trim() || undefined,
    supportedClasses: input.supportedClasses?.map((c) => c.trim()).filter(Boolean),
    createdAt: Date.now(),
  };
  const all = loadCustomModels();
  all.push(model);
  saveAllCustomModels(all);
  return model;
}

export function deleteCustomModel(id: string): void {
  const all = loadCustomModels().filter((m) => m.id !== id);
  saveAllCustomModels(all);
}

export function customModelToAIModelInfo(m: CustomAIModel): AIModelInfo {
  return {
    id: m.id,
    name: m.name,
    architecture: 'Endpoint Customizado',
    provider: 'Custom',
    task: m.task,
    description: m.description || `Modelo customizado via endpoint ${m.endpointUrl}`,
    classesCount: m.supportedClasses?.length || 'open-vocabulary',
    speed: 'Variável (rede)',
    annotationType: m.annotationType,
    supportedClasses: m.supportedClasses,
    isOpenVocabulary: !m.supportedClasses || m.supportedClasses.length === 0,
    isCustom: true,
    endpointUrl: m.endpointUrl,
    endpointApiKey: m.apiKey,
  };
}
