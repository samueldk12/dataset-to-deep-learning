import React, { useState } from 'react';
import { 
  Eye, 
  FileText, 
  Volume2, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  Database, 
  Code,
  Sliders,
  ChevronRight,
  Download,
  Video,
  Layers,
  FolderOpen,
  Workflow,
  Sparkles
} from 'lucide-react';
import { DatasetProject, DomainCategory, DatasetTaskType } from '../types/dataset';
import { TASK_CATALOG, TaskDefinition } from '../utils/taskCatalog';

interface HomeHubProps {
  projects: DatasetProject[];
  currentProjectId: string;
  onSelectProject: (id: string) => void;
  onOpenNewDatasetModal: (domain?: DomainCategory, taskType?: DatasetTaskType) => void;
  onOpenExportModal?: (project?: DatasetProject) => void;
  onOpenVideoStudio?: (project?: DatasetProject) => void;
  onOpenPipelines?: () => void;
}

export const HomeHub: React.FC<HomeHubProps> = ({
  projects,
  currentProjectId,
  onSelectProject,
  onOpenNewDatasetModal,
  onOpenExportModal,
  onOpenVideoStudio,
  onOpenPipelines,
}) => {
  const [activeDomainFilter, setActiveDomainFilter] = useState<'all' | DomainCategory>('all');
  const [search, setSearch] = useState('');
  const [showCatalog, setShowCatalog] = useState(false);
  const [selectedTaskPreview, setSelectedTaskPreview] = useState<TaskDefinition>(
    TASK_CATALOG.extractive_qa
  );

  const allTasks = Object.values(TASK_CATALOG);

  const filteredProjects = projects.filter((p) => {
    if (activeDomainFilter !== 'all' && p.domain !== activeDomainFilter) return false;
    if (search) {
      const matchName = p.name.toLowerCase().includes(search.toLowerCase());
      const matchDesc = p.description?.toLowerCase().includes(search.toLowerCase());
      const matchType = p.taskType.toLowerCase().includes(search.toLowerCase());
      if (!matchName && !matchDesc && !matchType) return false;
    }
    return true;
  });

  const totalImages = projects.reduce((acc, p) => acc + (p.images?.length || 0), 0);
  const totalTexts = projects.reduce((acc, p) => acc + (p.textItems?.length || 0) + (p.qaItems?.length || 0), 0);
  const totalAudio = projects.reduce((acc, p) => acc + (p.audioItems?.length || 0), 0);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-950 text-slate-200 p-6 sm:p-8 scrollbar-thin select-none font-sans">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        
        {/* 1. Header Toolbar (Simple, Functional, No Ads) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-500" />
              <span>Gerenciador de Datasets</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {projects.length} projeto{projects.length !== 1 ? 's' : ''} carregado{projects.length !== 1 ? 's' : ''} no workspace local
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
              <span>Imagens: <strong className="text-slate-200">{totalImages}</strong></span>
              <span className="text-slate-600">•</span>
              <span>Textos: <strong className="text-slate-200">{totalTexts}</strong></span>
              <span className="text-slate-600">•</span>
              <span>Áudios: <strong className="text-slate-200">{totalAudio}</strong></span>
            </div>

            {onOpenPipelines && (
              <button
                onClick={onOpenPipelines}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-purple-300 border border-purple-500/40 hover:border-purple-400 font-semibold text-xs shadow-md transition-all active:scale-98"
              >
                <Workflow className="w-3.5 h-3.5 text-purple-400" />
                <span>Pipelines</span>
              </button>
            )}

            <button
              onClick={() => onOpenNewDatasetModal()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Dataset</span>
            </button>
          </div>
        </div>

        {/* 2. Filter & Search Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar dataset por nome, classe ou formato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700"
            />
          </div>

          {/* Domain Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
            <button
              onClick={() => setActiveDomainFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                activeDomainFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({projects.length})
            </button>
            <button
              onClick={() => setActiveDomainFilter('vision')}
              className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeDomainFilter === 'vision'
                  ? 'bg-slate-800 text-blue-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visão</span>
            </button>
            <button
              onClick={() => setActiveDomainFilter('nlp')}
              className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeDomainFilter === 'nlp'
                  ? 'bg-slate-800 text-purple-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>NLP / LLMs</span>
            </button>
            <button
              onClick={() => setActiveDomainFilter('audio')}
              className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeDomainFilter === 'audio'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Áudio</span>
            </button>
          </div>
        </div>

        {/* 3. Projects Grid (Clear, Clean, Focus on Usability) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Datasets Ativos ({filteredProjects.length})
            </h2>
            <button
              onClick={() => setShowCatalog(!showCatalog)}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              {showCatalog ? 'Ocultar catálogo de formatos' : 'Ver todos os 38 formatos e schemas suportados'}
            </button>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="p-10 border border-dashed border-slate-800 rounded-xl bg-slate-900/40 text-center flex flex-col items-center gap-3">
              <Database className="w-8 h-8 text-slate-600" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-300">Nenhum dataset encontrado</span>
                <span className="text-xs text-slate-500">Tente ajustar os filtros de busca ou crie um novo dataset.</span>
              </div>
              <button
                onClick={() => onOpenNewDatasetModal()}
                className="mt-2 px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium"
              >
                + Criar Dataset
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProjects.map((proj) => {
                const isCurrent = proj.id === currentProjectId;
                const taskDef = TASK_CATALOG[proj.taskType] || TASK_CATALOG.object_detection;
                const itemCount = proj.images?.length || proj.textItems?.length || proj.qaItems?.length || proj.audioItems?.length || 0;

                return (
                  <div
                    key={proj.id}
                    className={`rounded-xl border transition-all flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-slate-900 border-blue-500/80 shadow-md ring-1 ring-blue-500/20'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Card Body */}
                    <div 
                      onClick={() => onSelectProject(proj.id)}
                      className="p-4 flex flex-col gap-2.5 cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {taskDef.title}
                        </span>

                        {isCurrent && (
                          <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Aberto no estúdio
                          </span>
                        )}
                      </div>

                      <h3 className="font-semibold text-sm text-slate-100 truncate">{proj.name}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-sans">
                        {proj.description || taskDef.shortDesc}
                      </p>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="px-4 py-2.5 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-2 text-xs rounded-b-xl">
                      <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono">
                        <span>{proj.classes.length} classes</span>
                        <span>•</span>
                        <span>{itemCount} amostras</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Video ingestion button if Vision */}
                        {proj.domain === 'vision' && onOpenVideoStudio && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectProject(proj.id);
                              onOpenVideoStudio(proj);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Extrair frames de vídeo ou gravar webcam"
                          >
                            <Video className="w-3.5 h-3.5 text-slate-300" />
                          </button>
                        )}

                        {/* Export Button */}
                        {onOpenExportModal && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectProject(proj.id);
                              onOpenExportModal(proj);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                            title="Exportar dataset"
                          >
                            <Download className="w-3 h-3 text-slate-400" />
                            <span>Exportar</span>
                          </button>
                        )}

                        {/* Open Studio */}
                        <button
                          onClick={() => onSelectProject(proj.id)}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
                        >
                          <span>Abrir</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Collapsible Documentation & Formats Catalog */}
        {showCatalog && (
          <div className="mt-4 p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                  <Code className="w-4 h-4 text-blue-400" />
                  Especificações de Datasets ({allTasks.length} tarefas)
                </h3>
                <p className="text-xs text-slate-400">
                  Consulte os formatos de exportação e a estrutura padrão de cada paradigma
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Task list */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
                {allTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTaskPreview(t)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTaskPreview.id === t.id
                        ? 'bg-slate-800 border-blue-500 text-white'
                        : 'bg-slate-950/50 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-slate-200">{t.title}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 uppercase">
                        {t.domain}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{t.shortDesc}</p>
                  </div>
                ))}
              </div>

              {/* Schema snippet preview */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between gap-2">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono text-blue-400 uppercase font-semibold">
                    {selectedTaskPreview.categoryName}
                  </span>
                  <span className="font-bold text-xs text-white">{selectedTaskPreview.title}</span>
                  <pre className="p-2.5 bg-slate-900 border border-slate-800 rounded-md font-mono text-[10px] text-slate-300 overflow-x-auto max-h-40 scrollbar-thin">
                    {selectedTaskPreview.exampleSnippet}
                  </pre>
                </div>

                <button
                  onClick={() => onOpenNewDatasetModal(selectedTaskPreview.domain, selectedTaskPreview.id)}
                  className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors"
                >
                  + Criar Dataset ({selectedTaskPreview.title})
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
