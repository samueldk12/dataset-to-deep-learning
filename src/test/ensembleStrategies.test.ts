import { describe, expect, it } from 'vitest';
import { scoreShipReID } from '../utils/reidEnsemble';
import { fuseTextLabels, fuseTranscriptions } from '../utils/multimodalEnsembles';
import { auditAudioDataset, auditNLPProject } from '../utils/datasetQuality';

describe('ship Re-ID ensemble', () => {
  it('combines embeddings and exact vessel metadata', () => {
    const base = { name: 'ship', url: '', globalId: 'v1', cameraId: 'c1', tags: [] };
    const query = { ...base, id: 'q', vesselMetadata: { imo: '123' }, embeddingVectors: { dinov2: [1, 0], specialized: [1, 0] } };
    const match = { ...base, id: 'm', cameraId: 'c2', vesselMetadata: { imo: '123' }, embeddingVectors: { dinov2: [0.95, 0.05], specialized: [1, 0] } };
    const mismatch = { ...base, id: 'x', cameraId: 'c3', vesselMetadata: { imo: '999' }, embeddingVectors: { dinov2: [-1, 0], specialized: [-1, 0] } };
    expect(scoreShipReID(query, match).score).toBeGreaterThan(scoreShipReID(query, mismatch).score);
  });
});

describe('audio and text ensembles', () => {
  it('selects the ASR transcript with the strongest agreement', () => {
    const result = fuseTranscriptions([
      { modelId: 'a', text: 'navio entrando no porto' },
      { modelId: 'b', text: 'navio entrando no porto.' },
      { modelId: 'c', text: 'avião distante' },
    ]);
    expect(result?.modelId).not.toBe('c');
  });

  it('uses vote count before weighted confidence for text labels', () => {
    const result = fuseTextLabels([
      { modelId: 'a', label: 'positivo', confidence: 0.55 },
      { modelId: 'b', label: 'Positivo', confidence: 0.51 },
      { modelId: 'c', label: 'negativo', confidence: 0.99 },
    ]);
    expect(result?.label.toLowerCase()).toBe('positivo');
  });
});

describe('dataset audits', () => {
  it('detects invalid audio segments', () => {
    const issues = auditAudioDataset([{ id: 'a', name: 'a.wav', audioUrl: '', durationSec: 2, status: 'completed', transcription: 'ok', soundEvents: [{ id: 'e', start: 1, end: 3, event: 'ship' }] }]);
    expect(issues.some((issue) => issue.severity === 'error')).toBe(true);
  });

  it('detects inconsistent QA offsets', () => {
    const issues = auditNLPProject({
      id: 'p', name: 'p', description: '', domain: 'nlp', taskType: 'extractive_qa', classSets: [], activeClassSetId: '', classes: [], images: [], activeImageId: null, createdAt: 0, updatedAt: 0,
      qaItems: [{ id: 'q', context: 'abcdef', question: '?', answerStart: 0, answerEnd: 2, answerText: 'cd' }],
    });
    expect(issues).toHaveLength(1);
  });
});
