import React, { useState, useEffect } from 'react';
import { 
  X, 
  Eye, 
  FileText, 
  Volume2, 
  Check, 
  ArrowRight, 
  Code, 
  Layers,
  FolderPlus
} from 'lucide-react';
import { DomainCategory, DatasetTaskType, DatasetProject, DatasetClass } from '../../types/dataset';
import { TASK_CATALOG, TaskDefinition } from '../../utils/taskCatalog';
import { getRandomColor } from '../../utils/formatParsers';

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
  const [selectedDomain, setSelectedDomain] = useState<DomainCategory>(initialDomain);
  const [selectedTask, setSelectedTask] = useState<DatasetTaskType>(
    initialTaskType || (initialDomain === 'nlp' ? 'extractive_qa' : initialDomain === 'audio' ? 'speech_recognition_asr' : 'object_detection')
  );
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [customClassesStr, setCustomClassesStr] = useState('Pessoa, Veículo, Defeito');

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

  const handleCreate = () => {
    const title = projectName.trim() || `${currentTaskDef.title} Dataset`;
    const classesList = customClassesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const initialClasses: DatasetClass[] = classesList.map((name, idx) => ({
      id: `cls_${Date.now()}_${idx}`,
      name,
      color: getRandomColor(idx),
      shortcutKey: idx < 9 ? String(idx + 1) : undefined,
      visible: true,
      locked: false,
    }));

    if (initialClasses.length === 0) {
      initialClasses.push({
        id: `cls_${Date.now()}_0`,
        name: 'Item',
        color: '#3b82f6',
        shortcutKey: '1',
        visible: true,
        locked: false,
      });
    }

    const newProject: DatasetProject = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: title,
      description: projectDescription.trim() || currentTaskDef.fullDesc,
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
      images: [],
      activeImageId: null,
      textItems: [],
      qaItems: [],
      sqlItems: [],
      cotItems: [],
      toolCallItems: [],
      ragItems: [],
      corefItems: [],
      relationItems: [],
      sentencePairItems: [],
      audioItems: [],
      llmItems: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onCreateProject(newProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm select-none font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-800 text-blue-400 border border-slate-700">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Criar Novo Dataset
              </h2>
              <p className="text-xs text-slate-400">
                Defina o formato e a taxonomia inicial de anotação
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6 scrollbar-thin">
          {/* Step 1: Select Domain */}
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

          {/* Step 2: Choose Exact Paradigm / Task */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              2. Tipo de Tarefa / Formato ({domainTasks.length} tipos disponíveis):
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-1 scrollbar-thin">
              {domainTasks.map((t) => {
                const isSelected = selectedTask === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t.id)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-colors flex flex-col justify-between gap-1 ${
                      isSelected
                        ? 'bg-slate-800 border-blue-500 text-white'
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

          {/* Task Info & Code Example Preview */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-blue-400" />
                Estrutura de Saída ({currentTaskDef.title}):
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {currentTaskDef.exportFormats.join(' • ')}
              </span>
            </div>
            <pre className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[10px] text-slate-300 overflow-x-auto max-h-24 scrollbar-thin">
              {currentTaskDef.exampleSnippet}
            </pre>
          </div>

          {/* Step 3: Project Name & Taxonomies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-300">Nome do Dataset:</label>
              <input
                type="text"
                placeholder={`Ex: Dataset de ${currentTaskDef.title}`}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-300">Classes Iniciais (separadas por vírgula):</label>
              <input
                type="text"
                value={customClassesStr}
                onChange={(e) => setCustomClassesStr(e.target.value)}
                placeholder="Ex: Pessoa, Veículo, Defeito"
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            Formato: {currentTaskDef.title}
          </span>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors"
            >
              <span>Criar Dataset</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
