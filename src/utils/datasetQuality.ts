import { AudioDatasetItem, DatasetProject, TextDatasetItem } from '../types/dataset';

export interface DatasetQualityIssue {
  severity: 'error' | 'warning';
  itemId?: string;
  message: string;
}

const normalizedText = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

export function auditAudioDataset(items: AudioDatasetItem[]): DatasetQualityIssue[] {
  const issues: DatasetQualityIssue[] = [];
  const transcripts = new Map<string, string>();
  for (const item of items) {
    if (!Number.isFinite(item.durationSec) || item.durationSec <= 0) {
      issues.push({ severity: 'error', itemId: item.id, message: `${item.name}: duração inválida.` });
    }
    if (!item.transcription?.trim()) {
      issues.push({ severity: 'warning', itemId: item.id, message: `${item.name}: sem transcrição.` });
    } else {
      const key = normalizedText(item.transcription);
      const duplicate = transcripts.get(key);
      if (duplicate) issues.push({ severity: 'warning', itemId: item.id, message: `${item.name}: transcrição duplicada de ${duplicate}.` });
      else transcripts.set(key, item.name);
    }
    const timed = [...(item.diarizationSegments || []), ...(item.soundEvents || [])];
    for (const segment of timed) {
      if (segment.start < 0 || segment.end <= segment.start || segment.end > item.durationSec + 0.05) {
        issues.push({ severity: 'error', itemId: item.id, message: `${item.name}: segmento ${segment.start.toFixed(2)}–${segment.end.toFixed(2)}s fora dos limites.` });
      }
    }
  }
  return issues;
}

export function auditTextItems(items: TextDatasetItem[]): DatasetQualityIssue[] {
  const issues: DatasetQualityIssue[] = [];
  const contents = new Map<string, string>();
  for (const item of items) {
    const key = normalizedText(item.content);
    if (!key) issues.push({ severity: 'error', itemId: item.id, message: `${item.title}: conteúdo vazio.` });
    const duplicate = contents.get(key);
    if (key && duplicate) issues.push({ severity: 'warning', itemId: item.id, message: `${item.title}: conteúdo duplicado de ${duplicate}.` });
    else if (key) contents.set(key, item.title);
    for (const annotation of item.annotations) {
      if (annotation.start < 0 || annotation.end <= annotation.start || annotation.end > item.content.length) {
        issues.push({ severity: 'error', itemId: item.id, message: `${item.title}: span fora dos limites do texto.` });
      }
    }
  }
  return issues;
}

export function auditNLPProject(project: DatasetProject): DatasetQualityIssue[] {
  const issues = auditTextItems(project.textItems || []);
  for (const item of project.qaItems || []) {
    const extracted = item.context.slice(item.answerStart, item.answerEnd);
    if (extracted !== item.answerText) {
      issues.push({ severity: 'error', itemId: item.id, message: `QA ${item.id}: answerStart/answerEnd não correspondem à resposta.` });
    }
  }
  for (const item of project.sqlItems || []) {
    if (!item.question.trim() || !item.databaseSchema?.trim() || !item.sql.trim()) {
      issues.push({ severity: 'error', itemId: item.id, message: `Text-to-SQL ${item.id}: pergunta, schema e SQL são obrigatórios.` });
    }
  }
  return issues;
}

export function qualityScore(itemCount: number, issues: DatasetQualityIssue[]): number {
  if (itemCount === 0) return 0;
  const penalty = issues.reduce((sum, issue) => sum + (issue.severity === 'error' ? 12 : 5), 0);
  return Math.max(0, Math.min(100, 100 - Math.round(penalty / Math.max(1, Math.sqrt(itemCount)))));
}
