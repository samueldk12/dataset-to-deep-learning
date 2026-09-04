import { ReIDItem } from '../types/dataset';

export interface ReIDEnsembleWeights {
  dinov2: number;
  clip: number;
  specialized: number;
  metadata: number;
  temporal: number;
}

export const SHIP_REID_WEIGHTS: ReIDEnsembleWeights = {
  dinov2: 0.35,
  clip: 0.15,
  specialized: 0.3,
  metadata: 0.15,
  temporal: 0.05,
};

export interface ReIDScore {
  score: number;
  components: Record<string, number>;
  evidenceWeight: number;
}

export function cosineSimilarity(left?: number[], right?: number[]): number | null {
  if (!left || !right || left.length === 0 || left.length !== right.length) return null;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  if (leftNorm === 0 || rightNorm === 0) return null;
  return Math.max(0, Math.min(1, (dot / Math.sqrt(leftNorm * rightNorm) + 1) / 2));
}

function exactMetadataScore(query: ReIDItem, candidate: ReIDItem): number | null {
  const q = query.vesselMetadata;
  const c = candidate.vesselMetadata;
  if (!q || !c) return null;
  if (q.imo && c.imo) return q.imo === c.imo ? 1 : 0;
  if (q.mmsi && c.mmsi) return q.mmsi === c.mmsi ? 1 : 0;
  if (q.vesselType && c.vesselType) return q.vesselType === c.vesselType ? 0.7 : 0;
  return null;
}

function temporalScore(query: ReIDItem, candidate: ReIDItem): number | null {
  if (!query.capturedAt || !candidate.capturedAt) return null;
  const deltaHours = Math.abs(Date.parse(query.capturedAt) - Date.parse(candidate.capturedAt)) / 3_600_000;
  if (!Number.isFinite(deltaHours)) return null;
  return Math.exp(-deltaHours / 72);
}

/** Combines independent evidence and renormalizes when a descriptor is unavailable. */
export function scoreShipReID(
  query: ReIDItem,
  candidate: ReIDItem,
  weights: ReIDEnsembleWeights = SHIP_REID_WEIGHTS
): ReIDScore {
  const values: Array<[string, number | null, number]> = [
    ['dinov2', cosineSimilarity(query.embeddingVectors?.dinov2, candidate.embeddingVectors?.dinov2), weights.dinov2],
    ['clip', cosineSimilarity(query.embeddingVectors?.clip, candidate.embeddingVectors?.clip), weights.clip],
    ['specialized', cosineSimilarity(query.embeddingVectors?.specialized, candidate.embeddingVectors?.specialized), weights.specialized],
    ['metadata', exactMetadataScore(query, candidate), weights.metadata],
    ['temporal', temporalScore(query, candidate), weights.temporal],
  ];
  const available = values.filter((entry): entry is [string, number, number] => entry[1] !== null);
  const evidenceWeight = available.reduce((sum, [, , weight]) => sum + weight, 0);
  const components = Object.fromEntries(available.map(([name, value]) => [name, value]));
  const score = evidenceWeight > 0
    ? available.reduce((sum, [, value, weight]) => sum + value * weight, 0) / evidenceWeight
    : 0;
  return { score, components, evidenceWeight };
}
