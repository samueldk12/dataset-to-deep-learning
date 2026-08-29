import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Eye, 
  FileText, 
  Volume2, 
  Check, 
  ArrowRight, 
  Code, 
  Layers,
  FolderPlus,
  UploadCloud,
  FileArchive,
  FileCode,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Tag
} from 'lucide-react';
import { DomainCategory, DatasetTaskType, DatasetProject, DatasetClass, DatasetImage, TextDatasetItem, AudioDatasetItem } from '../../types/dataset';
import { TASK_CATALOG, TaskDefinition } from '../../utils/taskCatalog';
import { getRandomColor } from '../../utils/formatParsers';
import { parseImportFiles, ImportedDatasetResult } from '../../utils/datasetImporter';

interface NewDatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDomain?: DomainCategory;
  initialTaskType?: DatasetTaskType;
  onCreateProject: (project: DatasetProject) => void;
}

export const NewDatasetModal: React.FC<NewDatasetModalProps> = ({
  isOpen,
  onClose,
  initialDomain = 'vision',
  initialTaskType,
  onCreateProject,
}) => {
  // Modal Creation Mode: 'blank' or 'import'
  const [creationMode, setCreationMode] = useState<'blank' | 'import'>('blank');

  // Blank configuration states
  const [selectedDomain, setSelectedDomain] = useState<DomainCategory>(initialDomain);
  const [selectedTask, setSelectedTask] = useState<DatasetTaskType>(
    initialTaskType || (initialDomain === 'nlp' ? 'extractive_qa' : initialDomain === 'audio' ? 'speech_recognition_asr' : 'object_detection')
  );
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [customClassesStr, setCustomClassesStr] = useState('Pessoa, Veículo, Defeito');

  // Import files & parsing states
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedData, setImportedData] = useState<ImportedDatasetResult | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const annotationInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const domain = initialDomain || 'vision';
      setSelectedDomain(domain);
      const defaultTask: DatasetTaskType = domain === 'nlp' 
        ? 'extractive_qa' 
        : domain === 'audio' 
          ? 'speech_recognition_asr' 
          : 'object_detection';
      setSelectedTask(initialTaskType || defaultTask);
      setProjectName('');
      setProjectDescription('');
      setCreationMode('blank');
      setIsProcessingFiles(false);
      setProgressStatus('');
      setProgressPercent(0);
      setImportError(null);
      setImportedData(null);
      setIsDraggingOver(false);

      if (domain === 'nlp') {
        setCustomClassesStr('Pergunta, Resposta, Contexto');
      } else if (domain === 'audio') {
        setCustomClassesStr('Orador_1, Orador_2, Ruído_Fundo');
      } else {
        setCustomClassesStr('Pessoa, Veículo, Defeito');
      }
    }
  }, [isOpen, initialDomain, initialTaskType]);

  if (!isOpen) return null;

  const currentTaskDef: TaskDefinition = TASK_CATALOG[selectedTask] || TASK_CATALOG.object_detection;
  const domainTasks = Object.values(TASK_CATALOG).filter((t) => t.domain === selectedDomain);

  /* Process Files (ZIP / Images / Annotations / Audio / Text) */
  const handleProcessUploadedFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessingFiles(true);
    setImportError(null);
    setProgressPercent(10);
    setProgressStatus('Analisando pacotes e arquivos...');

    try {
      const result = await parseImportFiles(files, (percent, status) => {
        setProgressPercent(percent);
        setProgressStatus(status);
      });

      setImportedData(result);
      setSelectedDomain(result.domain);
      setSelectedTask(result.taskType);
      if (!projectName.trim() && result.name) {
        setProjectName(result.name);
      }
      if (!projectDescription.trim() && result.description) {
        setProjectDescription(result.description);
      }
      if (result.classes.length > 0) {
        setCustomClassesStr(result.classes.map((c) => c.name).join(', '));
      }
      setIsProcessingFiles(false);
    } catch (err: any) {
      console.error('Erro ao importar arquivos para o novo dataset:', err);
      setImportError(err.message || 'Falha ao processar arquivos do dataset.');
      setIsProcessingFiles(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessUploadedFiles(e.dataTransfer.files);
    }
  };

  const handleCreate = () => {
    const title = projectName.trim() || (importedData ? importedData.name : `${currentTaskDef.title} Dataset`);
    const classesList = customClassesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    let initialClasses: DatasetClass[] = [];

    if (importedData && importedData.classes.length > 0) {
      // Synchronize classes with customClassesStr if user edited names
      const nameMap = new Set(classesList.map((n) => n.toLowerCase()));
      initialClasses = importedData.classes.filter((c) => nameMap.has(c.name.toLowerCase()));
      
      // Add any newly typed classes
      classesList.forEach((name, idx) => {
        if (!initialClasses.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
          initialClasses.push({
            id: `cls_${Date.now()}_${idx}`,
            name,
            color: getRandomColor(initialClasses.length),
            shortcutKey: idx < 9 ? String(idx + 1) : undefined,
            visible: true,
            locked: false,
          });
        }
      });
    } else {
      initialClasses = classesList.map((name, idx) => ({
        id: `cls_${Date.now()}_${idx}`,
        name,
        color: getRandomColor(idx),
        shortcutKey: idx < 9 ? String(idx + 1) : undefined,
        visible: true,
        locked: false,
      }));
    }

    if (initialClasses.length === 0) {
      initialClasses.push({
        id: `cls_${Date.now()}_0`,
        name: selectedDomain === 'nlp' ? 'Entidade' : selectedDomain === 'audio' ? 'Locutor' : 'Objeto',
        color: '#3b82f6',
        shortcutKey: '1',
        visible: true,
        locked: false,
      });
    }

    const importedImages: DatasetImage[] = importedData ? importedData.images : [];
    const importedTexts: TextDatasetItem[] = importedData ? importedData.textItems : [];
    const importedAudios: AudioDatasetItem[] = importedData ? importedData.audioItems : [];

    const newProject: DatasetProject = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: title,
      description: projectDescription.trim() || (importedData ? importedData.description : currentTaskDef.fullDesc),
      domain: selectedDomain,
      taskType: selectedTask,
      classSets: [
        {
          id: `cset_${Date.now()}_1`,
          name: 'Conjunto Padrão',
          classes: initialClasses,
          createdAt: Date.now(),
        },
      ],
      activeClassSetId: `cset_${Date.now()}_1`,
      classes: initialClasses,
      images: importedImages,
      activeImageId: importedImages[0]?.id || null,
      textItems: importedTexts,
      qaItems: [],
      sqlItems: [],
      cotItems: [],
      toolCallItems: [],
      ragItems: [],
      corefItems: [],
      relationItems: [],
      sentencePairItems: [],
      audioItems: importedAudios,
      llmItems: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onCreateProject(newProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm select-none font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/15 text-blue-400 border border-blue-500/20">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Criar Novo Dataset
              </h2>
              <p className="text-xs text-slate-400">
                Crie um dataset em branco ou importe arquivos ZIP, imagens e anotações
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 gap-2 pt-2">
          <button
            onClick={() => setCreationMode('blank')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all cursor-pointer ${
              creationMode === 'blank'
                ? 'bg-slate-900 border-t border-x border-slate-700 text-blue-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Criar em Branco (Vazio)</span>
          </button>

          <button
            onClick={() => setCreationMode('import')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all cursor-pointer ${
              creationMode === 'import'
                ? 'bg-slate-900 border-t border-x border-slate-700 text-purple-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <FileArchive className="w-4 h-4 text-purple-400" />
            <span>Importar Arquivos & Anotações (ZIP / COCO / YOLO / Imagens)</span>
            {importedData && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6 scrollbar-thin">
          {/* Error Banner */}
          {importError && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{importError}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: IMPORT FILES & ANNOTATIONS DIRECTLY                               */}
          {/* ========================================================================= */}
          {creationMode === 'import' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              {/* Dropzone Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                  isDraggingOver 
                    ? 'border-purple-500 bg-purple-950/30 ring-2 ring-purple-500/30' 
                    : 'border-slate-700 hover:border-purple-500/70 bg-slate-950/40 hover:bg-slate-900/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".zip,image/*,.txt,.json,.xml,.csv,.jsonl,.yaml,.yml,audio/*"
                  onChange={(e) => {
                    if (e.target.files) handleProcessUploadedFiles(e.target.files);
                  }}
                  className="hidden"
                />

                <div className="p-4 rounded-2xl bg-purple-600/15 text-purple-400 border border-purple-500/30 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-8 h-8" />
                </div>

                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-100">
                    Arraste ou clique para selecionar Arquivos / Pacote ZIP do Dataset
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-lg">
                    Suporta pacotes ZIP completos (COCO, YOLO, VOC, Roboflow, Kaggle), múltiplas Imagens (.jpg, .png) e Arquivos de Anotação (.json, .txt, .xml, .csv) simultaneamente.
                  </p>
                </div>
              </div>

              {/* Progress Indicator */}
              {isProcessingFiles && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-purple-300 font-medium">{progressStatus}</span>
                    <span className="text-slate-400 font-mono">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-600 to-blue-500 transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Summary of Parsed Dataset */}
              {importedData && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-300">
                        Dados Analisados com Sucesso!
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {importedData.fileCount} arquivos carregados
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400">Imagens</span>
                      <strong className="text-sm text-slate-100">{importedData.images.length}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400">Anotações</span>
                      <strong className="text-sm text-purple-400">{importedData.totalAnnotations}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400">Classes Encontradas</span>
                      <strong className="text-sm text-blue-400">{importedData.classes.length}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400">Tarefa Detectada</span>
                      <strong className="text-xs text-amber-300 truncate font-mono">{importedData.taskType}</strong>
                    </div>
                  </div>

                  {/* Discovered Class Badges */}
                  {importedData.classes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-slate-400" />
                        Classes:
                      </span>
                      {importedData.classes.map((cls, idx) => (
                        <span 
                          key={cls.id || idx}
                          className="px-2 py-0.5 rounded-md text-[11px] font-medium border"
                          style={{
                            backgroundColor: `${cls.color}20`,
                            borderColor: `${cls.color}50`,
                            color: cls.color,
                          }}
                        >
                          {cls.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: DOMAIN SELECTION                                                 */}
          {/* ========================================================================= */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              1. Domínio de Trabalho:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'vision' as DomainCategory,
                  title: 'Visão Computacional',
                  desc: 'Detecção (BBox), Segmentação, OCR, Keypoints, MOT',
                  icon: Eye,
                },
                {
                  id: 'nlp' as DomainCategory,
                  title: 'Processamento de Texto (NLP)',
                  desc: 'Extractive QA (SQuAD), Text-to-SQL, CoT, RAG, NER',
                  icon: FileText,
                },
                {
                  id: 'audio' as DomainCategory,
                  title: 'Áudio e Fala',
                  desc: 'ASR (Transcrição), Diarização de Locutores, Alinhamento',
                  icon: Volume2,
                },
              ].map((dm) => {
                const Icon = dm.icon;
                const isSelected = selectedDomain === dm.id;
                return (
                  <div
                    key={dm.id}
                    onClick={() => {
                      setSelectedDomain(dm.id);
                      const first = Object.values(TASK_CATALOG).find((t) => t.domain === dm.id);
                      if (first) setSelectedTask(first.id);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-colors flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-slate-800 border-blue-500 ring-1 ring-blue-500/30 text-white'
                        : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-blue-400" />
                      <span className="font-semibold text-xs text-slate-100">{dm.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{dm.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* STEP 2: TASK FORMAT & PARADIGM                                           */}
          {/* ========================================================================= */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              2. Tipo de Tarefa / Formato ({domainTasks.length} tipos disponíveis):
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 scrollbar-thin">
              {domainTasks.map((t) => {
                const isSelected = selectedTask === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-colors flex flex-col justify-between gap-1 ${
                      isSelected
                        ? 'bg-slate-800 border-blue-500 text-white ring-1 ring-blue-500/20'
                        : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-medium text-xs text-slate-100 truncate">{t.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{t.shortDesc}</p>
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono">
                      Exporta: {t.exportFormats.slice(0, 2).join(', ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* STEP 3: DATASET NAME & CLASS TAXONOMY                                    */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-300">Nome do Dataset:</label>
              <input
                type="text"
                placeholder={`Ex: Dataset de ${currentTaskDef.title}`}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-300">Classes Iniciais (separadas por vírgula):</label>
              <input
                type="text"
                value={customClassesStr}
                onChange={(e) => setCustomClassesStr(e.target.value)}
                placeholder="Ex: Pessoa, Veículo, Defeito"
                className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            {importedData 
              ? `Importando ${importedData.images.length} itens & ${importedData.totalAnnotations} anotações` 
              : `Formato: ${currentTaskDef.title}`}
          </span>

          <div className="flex items-center gap-2">
            <button 
              onClick={onClose} 
              className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={isProcessingFiles}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-blue-600/25 transition-all cursor-pointer"
            >
              <span>{importedData ? 'Criar e Importar Dataset' : 'Criar Dataset'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
