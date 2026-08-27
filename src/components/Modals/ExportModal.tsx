import React, { useState } from 'react';
import { 
  X, 
  DownloadCloud, 
  FileArchive, 
  FileText, 
  Check, 
  Copy, 
  Code, 
  Database
} from 'lucide-react';
import { DatasetProject, ExportFormat } from '../../types/dataset';
import { downloadDatasetZip } from '../../utils/zipHandler';
import { exportDatasetToParquet } from '../../utils/parquetExporter';
import { 
  exportToCOCO, 
  exportImageToYOLO, 
  generateYOLODataYaml, 
  exportToCSV,
  YOLOVersion,
  YOLOTask
} from '../../utils/formatParsers';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: DatasetProject;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  // Container & Destination format
  const [containerFormat, setContainerFormat] = useState<string>(
    project.domain === 'nlp' ? 'jsonl' : project.domain === 'audio' ? 'jsonl' : 'zip'
  );
  
  // Image format inside dataset (for vision)
  const [imageEncoding, setImageEncoding] = useState<'jpg' | 'png' | 'webp'>('jpg');
  
  // YOLO Specific configuration (for vision)
  const [yoloVersion, setYoloVersion] = useState<YOLOVersion>('v11');
  const [yoloTask, setYoloTask] = useState<YOLOTask>('detection');
  const [datasetSplit, setDatasetSplit] = useState<'80_20' | '70_20_10' | 'single'>('80_20');

  const [isExporting, setIsExporting] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Live preview generator tailored to dataset domain
  const getPreviewContent = (): string => {
    if (project.domain === 'nlp') {
      if (project.taskType === 'extractive_qa') {
        return JSON.stringify(
          {
            version: 'v2.0',
            data: [
              {
                title: project.name,
                paragraphs: (project.qaItems || []).map((q) => ({
                  context: q.context,
                  qas: [
                    {
                      id: q.id,
                      question: q.question,
                      answers: [{ text: q.answerText, answer_start: q.answerStart }],
                      is_impossible: false,
                    },
                  ],
                })),
              },
            ],
          },
          null,
          2
        );
      }

      if (project.taskType === 'text_to_sql') {
        return JSON.stringify(
          (project.sqlItems || []).map((s) => ({
            question: s.question,
            schema: s.databaseSchema,
            query: s.sql,
          })),
          null,
          2
        );
      }

      if (project.taskType === 'chain_of_thought') {
        return (project.cotItems || [])
          .map((c) => JSON.stringify({ prompt: c.prompt, thought: c.thought, response: c.response }))
          .join('\n');
      }

      if (project.taskType === 'function_calling') {
        return JSON.stringify(project.toolCallItems || [], null, 2);
      }

      if (project.taskType === 'rag_retrieval') {
        return (project.ragItems || [])
          .map((r) =>
            JSON.stringify({
              query: r.query,
              positive: r.positivePassage,
              negatives: r.negativePassages,
            })
          )
          .join('\n');
      }

      return JSON.stringify(project.textItems || [], null, 2);
    }

    if (project.domain === 'audio') {
      if (project.taskType === 'speaker_diarization') {
        return (project.audioItems || [])
          .flatMap((a) =>
            (a.diarizationSegments || []).map(
              (s) => `SPEAKER ${a.name} 1 ${s.start.toFixed(2)} ${(s.end - s.start).toFixed(2)} <NA> <NA> ${s.speaker} <NA> <NA>`
            )
          )
          .join('\n');
      }

      return (project.audioItems || [])
        .map((a) =>
          JSON.stringify({
            audio_file: a.name,
            duration: a.durationSec,
            transcription: a.transcription,
            events: a.soundEvents,
          })
        )
        .join('\n');
    }

    // Vision Preview
    const sampleImg = project.images?.[0];
    if (!sampleImg) return '// Nenhuma imagem no dataset para pré-visualização.';

    const classMap = new Map<string, number>();
    project.classes.forEach((c, idx) => classMap.set(c.id, idx));

    if (containerFormat === 'parquet') {
      return `# Esquema Apache Parquet:\nimport pandas as pd\ndf = pd.read_parquet("${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.parquet")\nprint(df.head())`;
    }

    if (containerFormat === 'coco') {
      return JSON.stringify(exportToCOCO(project), null, 2).slice(0, 700) + '\n  ...\n}';
    }

    if (containerFormat === 'csv') {
      return exportToCSV(project).split('\n').slice(0, 5).join('\n') + '\n...';
    }

    return `# Labels: labels/train/${sampleImg.name.replace(/\.[^/.]+$/, '')}.txt (${yoloVersion.toUpperCase()} ${yoloTask.toUpperCase()})\n${exportImageToYOLO(
      sampleImg,
      classMap,
      yoloTask,
      yoloVersion
    )}\n\n# Arquivo: data.yaml\n${generateYOLODataYaml(project, yoloVersion, yoloTask, datasetSplit !== 'single')}`;
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(getPreviewContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* Execute Export */
  const handleExport = async () => {
    setIsExporting(true);
    setProgressPercent(10);
    setProgressStatus('Preparando exportação...');

    try {
      if (project.domain === 'nlp' || project.domain === 'audio') {
        setProgressPercent(60);
        setProgressStatus('Serializando arquivos...');
        const content = getPreviewContent();
        const blob = new Blob([content], { type: containerFormat === 'jsonl' ? 'application/x-jsonlines' : 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_dataset.${containerFormat === 'jsonl' ? 'jsonl' : 'json'}`;
        a.click();
        URL.revokeObjectURL(url);
        setProgressPercent(100);
        setProgressStatus('Exportação concluída.');
        setTimeout(onClose, 800);
        return;
      }

      if (containerFormat === 'parquet') {
        setProgressPercent(30);
        setProgressStatus('Gravando Apache Parquet...');
        await exportDatasetToParquet(
          project,
          {
            imageFormat: imageEncoding,
            includeRawImages: true,
          },
          (pct: number, status: string) => {
            setProgressPercent(pct);
            setProgressStatus(status);
          }
        );
      } else {
        await downloadDatasetZip(
          project,
          {
            format: containerFormat as ExportFormat,
            exportAllClassSets: true,
          },
          (percent: number, status: string) => {
            setProgressPercent(percent);
            setProgressStatus(status);
          }
        );
      }

      setProgressPercent(100);
      setProgressStatus('Download concluído.');
      setTimeout(onClose, 800);
    } catch (err: any) {
      alert(`Erro durante exportação: ${err?.message || 'Falha desconhecida'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm select-none font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <span>Exportar Dataset:</span>
              <span className="text-slate-300 font-mono">{project.name}</span>
            </h2>
            <p className="text-xs text-slate-400">
              Selecione o formato de saída para exportar os dados
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-5 scrollbar-thin">
          {/* 1. Format Selection */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-300">
              Formato de Exportação:
            </span>

            {project.domain === 'vision' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'zip', title: 'YOLO (ZIP)', desc: 'Labels TXT + data.yaml' },
                  { id: 'parquet', title: 'Apache Parquet', desc: 'Arquivo colunar binário' },
                  { id: 'coco', title: 'COCO JSON', desc: 'Estrutura padrão COCO' },
                  { id: 'csv', title: 'Planilha CSV', desc: 'Tabela com coordenadas' },
                ].map((fmt) => (
                  <div
                    key={fmt.id}
                    onClick={() => setContainerFormat(fmt.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors flex flex-col gap-0.5 ${
                      containerFormat === fmt.id
                        ? 'bg-slate-800 border-blue-500 text-white'
                        : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <span className="font-medium text-xs text-slate-100">{fmt.title}</span>
                    <span className="text-[10px] text-slate-400">{fmt.desc}</span>
                  </div>
                ))}
              </div>
            )}

            {project.domain === 'nlp' && (
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'jsonl', title: 'JSON Lines (.jsonl)', desc: 'Padrão linha a linha' },
                  { id: 'json', title: 'JSON Estruturado', desc: 'SQuAD / Benchmark' },
                  { id: 'parquet', title: 'Apache Parquet', desc: 'Tabela binária' },
                ].map((fmt) => (
                  <div
                    key={fmt.id}
                    onClick={() => setContainerFormat(fmt.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors flex flex-col gap-0.5 ${
                      containerFormat === fmt.id
                        ? 'bg-slate-800 border-blue-500 text-white'
                        : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <span className="font-medium text-xs text-slate-100">{fmt.title}</span>
                    <span className="text-[10px] text-slate-400">{fmt.desc}</span>
                  </div>
                ))}
              </div>
            )}

            {project.domain === 'audio' && (
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'jsonl', title: 'Manifest JSONL', desc: 'Áudio + Transcrição' },
                  { id: 'rttm', title: 'RTTM Diarização', desc: 'Carimbos de oradores' },
                  { id: 'parquet', title: 'Apache Parquet', desc: 'Dataset colunar' },
                ].map((fmt) => (
                  <div
                    key={fmt.id}
                    onClick={() => setContainerFormat(fmt.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors flex flex-col gap-0.5 ${
                      containerFormat === fmt.id
                        ? 'bg-slate-800 border-blue-500 text-white'
                        : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <span className="font-medium text-xs text-slate-100">{fmt.title}</span>
                    <span className="text-[10px] text-slate-400">{fmt.desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. YOLO Specifics if Vision ZIP */}
          {project.domain === 'vision' && containerFormat === 'zip' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-300 font-medium">Versão do YOLO:</label>
                <select
                  value={yoloVersion}
                  onChange={(e) => setYoloVersion(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                >
                  <option value="v11">YOLOv11</option>
                  <option value="v8">YOLOv8</option>
                  <option value="v9">YOLOv9</option>
                  <option value="v10">YOLOv10</option>
                  <option value="v5">YOLOv5</option>
                  <option value="v7">YOLOv7</option>
                  <option value="darknet">Darknet</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-300 font-medium">Tipo de Anotação:</label>
                <select
                  value={yoloTask}
                  onChange={(e) => setYoloTask(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                >
                  <option value="detection">Bounding Box (Detecção)</option>
                  <option value="segmentation">Polígonos (Segmentação)</option>
                  <option value="pose">Keypoints (Pose)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-300 font-medium">Divisão (Split):</label>
                <select
                  value={datasetSplit}
                  onChange={(e) => setDatasetSplit(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                >
                  <option value="80_20">Treino (80%) / Val (20%)</option>
                  <option value="70_20_10">Treino (70%) / Val (20%) / Teste (10%)</option>
                  <option value="single">Pasta Única</option>
                </select>
              </div>
            </div>
          )}

          {/* 3. Preview */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-blue-400" />
                Prévia do Arquivo Gerado:
              </span>
              <button
                onClick={handleCopyPreview}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
            <pre className="p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-[10px] text-slate-300 overflow-x-auto max-h-36 scrollbar-thin">
              {getPreviewContent()}
            </pre>
          </div>

          {/* Progress */}
          {isExporting && (
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>{progressStatus}</span>
                <span className="font-mono">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  style={{ width: `${progressPercent}%` }}
                  className="bg-blue-500 h-full rounded-full transition-all duration-200"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium text-xs transition-colors"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exportando...' : 'Exportar Arquivo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
