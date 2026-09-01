import { describe, it, expect, beforeEach } from 'vitest';
import { addCustomModel, deleteCustomModel, loadCustomModels, customModelToAIModelInfo } from '../utils/customModels';

describe('customModels (user-registered custom inference models)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds a custom model and persists it across loads', () => {
    const model = addCustomModel({
      name: 'Meu Modelo Roboflow',
      endpointUrl: 'https://my-inference.example.com/predict',
      apiKey: 'secret-key',
      task: 'detection',
      annotationType: 'bbox',
      supportedClasses: ['capacete', 'colete'],
    });

    expect(model.id).toMatch(/^custom_/);
    const loaded = loadCustomModels();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('Meu Modelo Roboflow');
    expect(loaded[0].supportedClasses).toEqual(['capacete', 'colete']);
  });

  it('deletes a custom model by id', () => {
    const m1 = addCustomModel({ name: 'A', endpointUrl: 'https://a.example.com', task: 'detection', annotationType: 'bbox' });
    addCustomModel({ name: 'B', endpointUrl: 'https://b.example.com', task: 'detection', annotationType: 'bbox' });

    deleteCustomModel(m1.id);

    const loaded = loadCustomModels();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('B');
  });

  it('converts a custom model to the AIModelInfo shape the picker/aiClient expect', () => {
    const m = addCustomModel({
      name: 'Meu Modelo',
      endpointUrl: 'https://x.example.com/predict',
      task: 'segmentation',
      annotationType: 'polygon',
      supportedClasses: ['trinca'],
    });

    const info = customModelToAIModelInfo(m);
    expect(info.isCustom).toBe(true);
    expect(info.endpointUrl).toBe('https://x.example.com/predict');
    expect(info.annotationType).toBe('polygon');
    expect(info.supportedClasses).toEqual(['trinca']);
    expect(info.isOpenVocabulary).toBe(false);
  });

  it('marks a custom model with no declared classes as open-vocabulary', () => {
    const m = addCustomModel({ name: 'Open', endpointUrl: 'https://o.example.com', task: 'detection', annotationType: 'bbox' });
    const info = customModelToAIModelInfo(m);
    expect(info.isOpenVocabulary).toBe(true);
  });
});
