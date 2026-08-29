import React, { useState } from 'react';
import { 
  Workflow, 
  Sparkles, 
  Terminal, 
  Filter, 
  Wand2, 
  Plus, 
  X, 
  Database, 
  Layers, 
  Check, 
  ArrowRight,
  FolderKanban
} from 'lucide-react';
import { DatasetProject, DomainCategory, DatasetTaskType } from '../../types/dataset';
import { AnnotationPipeline } from '../../types/pipeline';
import { PIPELINE_TEMPLATES, createDefaultNode } from '../../utils/pipelineTemplates';

interface NewPipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: DatasetProject[];
  currentProjectId: string;
  onOpenNewDatasetModal?: (domain?: DomainCategory, taskType?: DatasetTaskType) => void;
  onCreatePipeline: (newPipeline: AnnotationPipeline) => void;
}

export const NewPipelineModal: React.FC<NewPipelineModalProps> = ({
  isOpen,
  onClose,
  projects,
  currentProjectId,
  onOpenNewDatasetModal,
  onCreatePipeline,
}) => {
  const [name, setName] = useState('Novo Pipeline de Anotação');
  const [description, setDescription] = useState('Fluxo automatizado de IA, filtros e scripts');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(currentProjectId || projects[0]?.id || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl_yolo_filter_save');

  if (!isOpen) return null;

  const targetProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const templateOptions = [
    {
      id: 'tpl_yolo_filter_save',
      title: 'Auto-Anotação YOLOv11 com Filtro',
      desc: 'Carrega imagens do dataset, roda YOLOv11, descarta detecções de baixa confiança e grava direto no dataset.',
      icon: Sparkles,
      color: 'text-purple-400 border-purple-500/30 bg-purple-950/20',
      badge: 'Recomendado',
    },
    {
      id: 'tpl_multi_model_ensemble',
      title: 'Ensemble Multi-Modelo (YOLO + Gemini + WBF)',
      desc: 'Executa YOLOv11 e Gemini Flash em paralelo, unindo as caixas com Weighted Boxes Fusion.',
      icon: Layers,
      color: 'text-blue-400 border-blue-500/30 bg-blue-950/20',
      badge: 'Ensemble IA',
    },
    {
      id: 'tpl_python_code_filter',
      title: 'Pipeline com Nó de Código Python',
      desc: 'Roda detecção de IA e filtra coordenadas usando um script Python personalizado em tempo real.',
      icon: Terminal,
      color: 'text-amber-400 border-amber-500/30 bg-amber-950/20',
      badge: 'Python Script',
    },
    {
      id: 'tpl_augmentation_pipe',
      title: 'Data Augmentation & Exportação',
      desc: 'Gera variações com flip, rotação, ruído e brilho recalculando automaticamente as anotações.',
      icon: Wand2,
      color: 'text-pink-400 border-pink-500/30 bg-pink-950/20',
      badge: 'Augmentation',
    },
    {
      id: 'blank',
      title: 'Pipeline em Branco (Do Zero)',
      desc: 'Inicia apenas com o nó do dataset selecionado para você conectar livremente as ferramentas.',
      icon: Plus,
      color: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20',
      badge: 'Customizado',
    },
  ];

  const handleCreate = () => {
    let newPipe: AnnotationPipeline;

    if (selectedTemplateId === 'blank') {
      const srcNode = createDefaultNode('dataset_source', { x: 80, y: 150 }, 'node_src');
      newPipe = {
        id: `pipe_${Date.now()}`,
        name: name.trim() || 'Novo Pipeline',
        description: description.trim(),
        domain: targetProject?.domain || 'vision',
        projectId: targetProject?.id,
        projectName: targetProject?.name,
        nodes: [srcNode],
        edges: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    } else {
      const template = PIPELINE_TEMPLATES.find((t) => t.id === selectedTemplateId) || PIPELINE_TEMPLATES[0];
      newPipe = {
        ...template,
        id: `pipe_${Date.now()}`,
        name: name.trim() || template.name,
        description: description.trim() || template.description,
        domain: targetProject?.domain || template.domain,
        projectId: targetProject?.id,
        projectName: targetProject?.name,
        updatedAt: Date.now(),
      };
    }

    onCreatePipeline(newPipe);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Criar Novo Pipeline de Anotação</h2>
              <p className="text-[11px] text-slate-400">Automatize anotações conectando IAs, filtros e scripts aos seus datasets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4 scrollbar-thin">
          {/* Pipeline Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-300">Nome do Pipeline</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Auto-Anotação YOLO Veículos"
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Dataset Binding Selector */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Dataset Vinculado</label>
                {onOpenNewDatasetModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenNewDatasetModal('vision');
                    }}
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Novo Dataset</span>
                  </button>
                )}
              </div>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.images?.length || 0} imagens • {p.domain.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Template Selection */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
            <label className="text-xs font-semibold text-slate-300">Escolha o Template Inicial</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {templateOptions.map((tpl) => {
                const Icon = tpl.icon;
                const isSelected = selectedTemplateId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1.5 relative ${
                      isSelected
                        ? 'bg-purple-950/30 border-purple-500 ring-1 ring-purple-500/50 shadow-md shadow-purple-950/30'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg border ${tpl.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-xs text-white">{tpl.title}</span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-purple-300">
                        {tpl.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      {tpl.desc}
                    </p>
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all active:scale-98"
          >
            <span>Criar e Abrir no Editor</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
