import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  mergeDetectionsEnsemble,
  mapDetectionsToAnnotations,
  predictWithModel,
  fetchAvailableAIModels,
} from '../utils/aiClient';
import { addCustomModel, customModelToAIModelInfo } from '../utils/customModels';
import { AIDetectionItem, AIModelInfo } from '../types/aiModel';
import { DatasetClass, DatasetImage } from '../types/dataset';

describe('mergeDetectionsEnsemble (model ensembling for class definition)', () => {
  it('resolves the class by majority vote when two of three models agree on an overlapping box', () => {
    const box = (label: string, conf: number): AIDetectionItem => ({
      className: label,
      confidence: conf,
      type: 'bbox',
      points: [{ x: 100, y: 100 }, { x: 200, y: 200 }],
    });

    const perModel = [
      { modelId: 'modelA', detections: [box('dog', 0.6)] },
      { modelId: 'modelB', detections: [box('dog', 0.55)] },
      { modelId: 'modelC', detections: [box('wolf', 0.95)] }, // higher confidence but outvoted
    ];

    const merged = mergeDetectionsEnsemble(perModel, 1000, 1000);
    expect(merged).toHaveLength(1);
    expect(merged[0].className).toBe('dog');
  });

  it('breaks a vote tie using summed confidence', () => {
    const box = (label: string, conf: number): AIDetectionItem => ({
      className: label,
      confidence: conf,
      type: 'bbox',
      points: [{ x: 50, y: 50 }, { x: 150, y: 150 }],
    });

    const perModel = [
      { modelId: 'modelA', detections: [box('cat', 0.9)] },
      { modelId: 'modelB', detections: [box('dog', 0.4)] },
    ];

    const merged = mergeDetectionsEnsemble(perModel, 1000, 1000);
    expect(merged).toHaveLength(1);
    expect(merged[0].className).toBe('cat'); // 0.9 > 0.4, one vote each
  });

  it('keeps non-overlapping detections from different models separate', () => {
    const perModel = [
      {
        modelId: 'modelA',
        detections: [
          { className: 'car', confidence: 0.9, type: 'bbox' as const, points: [{ x: 0, y: 0 }, { x: 50, y: 50 }] },
        ],
      },
      {
        modelId: 'modelB',
        detections: [
          { className: 'person', confidence: 0.8, type: 'bbox' as const, points: [{ x: 800, y: 800 }, { x: 900, y: 900 }] },
        ],
      },
    ];

    const merged = mergeDetectionsEnsemble(perModel, 1000, 1000);
    expect(merged).toHaveLength(2);
    const classNames = merged.map((m) => m.className).sort();
    expect(classNames).toEqual(['car', 'person']);
  });

  it('never merges two detections from the same model into one cluster', () => {
    const perModel = [
      {
        modelId: 'modelA',
        detections: [
          { className: 'car', confidence: 0.9, type: 'bbox' as const, points: [{ x: 100, y: 100 }, { x: 200, y: 200 }] },
          { className: 'truck', confidence: 0.85, type: 'bbox' as const, points: [{ x: 105, y: 105 }, { x: 205, y: 205 }] },
        ],
      },
    ];

    const merged = mergeDetectionsEnsemble(perModel, 1000, 1000);
    expect(merged).toHaveLength(2);
  });

  it('returns an empty list when no model produced any detection', () => {
    const merged = mergeDetectionsEnsemble([{ modelId: 'a', detections: [] }], 1000, 1000);
    expect(merged).toEqual([]);
  });
});

describe('mapDetectionsToAnnotations', () => {
  const classes: DatasetClass[] = [
    { id: 'cls_car', name: 'Car', color: '#fff', shortcutKey: '1', visible: true, locked: false },
  ];

  it('reuses an existing class for a matching detection', () => {
    const detections: AIDetectionItem[] = [
      { className: 'car', confidence: 0.9, type: 'bbox', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] },
    ];
    const { annotations, newClasses } = mapDetectionsToAnnotations(detections, classes, { autoAddNewClasses: true });
    expect(annotations).toHaveLength(1);
    expect(annotations[0].classId).toBe('cls_car');
    expect(newClasses).toHaveLength(0);
  });

  it('falls back to the first project class instead of a dangling id when autoAddNewClasses is off', () => {
    const detections: AIDetectionItem[] = [
      { className: 'giraffe', confidence: 0.9, type: 'bbox', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] },
    ];
    const { annotations, newClasses } = mapDetectionsToAnnotations(detections, classes, { autoAddNewClasses: false });
    expect(newClasses).toHaveLength(0);
    expect(annotations[0].classId).toBe('cls_car');
  });
});

describe('predictWithModel (routes to backend for built-ins, to the endpoint for custom models)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const image: DatasetImage = {
    id: 'img_1',
    name: 'test.jpg',
    url: 'data:image/jpeg;base64,mock',
    width: 100,
    height: 100,
    annotations: [],
    tags: [],
    status: 'unannotated',
  };

  it('calls the custom endpoint URL (with Authorization header) for a custom model', async () => {
    const customModel = addCustomModel({
      name: 'Custom',
      endpointUrl: 'https://my-model.example.com/predict',
      apiKey: 'tok_123',
      task: 'detection',
      annotationType: 'bbox',
    });
    const modelInfo = customModelToAIModelInfo(customModel);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, detections: [], inferenceTimeMs: 12 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await predictWithModel(image, modelInfo, { confidenceThreshold: 0.25, iouThreshold: 0.45 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOptions] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe('https://my-model.example.com/predict');
    expect(calledOptions.headers['Authorization']).toBe('Bearer tok_123');

    vi.unstubAllGlobals();
  });

  it('calls the local backend for a built-in model', async () => {
    const builtin: AIModelInfo = {
      id: 'yolov11n',
      name: 'YOLOv11 Nano',
      architecture: 'YOLOv11',
      provider: 'Ultralytics',
      task: 'detection',
      description: '',
      classesCount: 80,
      speed: '',
      annotationType: 'bbox',
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, detections: [], inferenceTimeMs: 5 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await predictWithModel(image, builtin, { confidenceThreshold: 0.25, iouThreshold: 0.45 });

    const [calledUrl] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe('http://localhost:5000/api/ai/predict');

    vi.unstubAllGlobals();
  });
});

describe('fetchAvailableAIModels', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('includes both built-in and custom models in the merged catalogue', async () => {
    addCustomModel({ name: 'My Custom Detector', endpointUrl: 'https://c.example.com', task: 'detection', annotationType: 'bbox' });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const models = await fetchAvailableAIModels();
    expect(models.some((m) => m.id === 'yolov11n')).toBe(true);
    expect(models.some((m) => m.isCustom && m.name === 'My Custom Detector')).toBe(true);

    vi.unstubAllGlobals();
  });
});
