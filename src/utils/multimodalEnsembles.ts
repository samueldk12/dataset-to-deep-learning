export interface WeightedTextPrediction {
  modelId: string;
  text: string;
  confidence?: number;
  weight?: number;
}

function normalize(value: string): string[] {
  return value.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(Boolean);
}

function editDistance(left: string[], right: string[]): number {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const previous = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1));
      diagonal = previous;
    }
  }
  return row[right.length];
}

export function transcriptSimilarity(left: string, right: string): number {
  const a = normalize(left);
  const b = normalize(right);
  const denominator = Math.max(a.length, b.length, 1);
  return Math.max(0, 1 - editDistance(a, b) / denominator);
}

/** Selects the weighted medoid: the transcript with highest agreement with all peers. */
export function fuseTranscriptions(predictions: WeightedTextPrediction[]): WeightedTextPrediction | null {
  if (predictions.length === 0) return null;
  return predictions.reduce((best, candidate) => {
    const score = predictions.reduce((sum, peer) => {
      const reliability = Math.max(0, (peer.weight ?? 1) * (peer.confidence ?? 1));
      return sum + transcriptSimilarity(candidate.text, peer.text) * reliability;
    }, 0);
    const bestScore = predictions.reduce((sum, peer) => {
      const reliability = Math.max(0, (peer.weight ?? 1) * (peer.confidence ?? 1));
      return sum + transcriptSimilarity(best.text, peer.text) * reliability;
    }, 0);
    return score > bestScore ? candidate : best;
  });
}

export interface LabelPrediction {
  modelId: string;
  label: string;
  confidence: number;
  weight?: number;
}

export function fuseTextLabels(predictions: LabelPrediction[]): { label: string; score: number; votes: number } | null {
  if (predictions.length === 0) return null;
  const totals = new Map<string, { label: string; score: number; votes: number }>();
  for (const prediction of predictions) {
    const key = prediction.label.trim().toLowerCase();
    const current = totals.get(key) || { label: prediction.label, score: 0, votes: 0 };
    current.score += Math.max(0, prediction.confidence) * Math.max(0, prediction.weight ?? 1);
    current.votes += 1;
    totals.set(key, current);
  }
  return [...totals.values()].sort((a, b) => b.votes - a.votes || b.score - a.score)[0];
}
