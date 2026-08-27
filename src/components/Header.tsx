import React, { useState, useRef, useEffect } from 'react';
import { 
  Home, 
  Eye, 
  FileText, 
  Volume2, 
  Plus, 
  ChevronDown, 
  FolderKanban,
  Check,
  BookOpen
} from 'lucide-react';
import { DomainCategory, DatasetTaskType, DatasetProject } from '../types/dataset';
import { TASK_CATALOG, TaskDefinition } from '../utils/taskCatalog';

interface HeaderProps {
  currentView: 'home' | 'docs' | DomainCategory;
  onNavigateView: (view: 'home' | 'docs' | DomainCategory) => void;
  projects: DatasetProject[];
  currentProject: DatasetProject;
  onSelectProject: (id: string) => void;
  onOpenNewDatasetModal: (domain?: DomainCategory, taskType?: DatasetTaskType) => void;
  onUpdateProjectName: (name: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigateView,
  projects,
  currentProject,
  onSelectProject,
  onOpenNewDatasetModal,
  onUpdateProjectName,
}) => {
  const [hoveredDomain, setHoveredDomain] = useState<DomainCategory | null>(null);
  const [hoveredTaskPreview, setHoveredTaskPreview] = useState<TaskDefinition | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(currentProject?.name || 'Dataset');

  const closeTimerRef = useRef<number | null>(null);
  const headerNavRef = useRef<HTMLDivElement>(null);

  const visionTasks = Object.values(TASK_CATALOG).filter((t) => t.domain === 'vision');
  const nlpTasks = Object.values(TASK_CATALOG).filter((t) => t.domain === 'nlp');
  const audioTasks = Object.values(TASK_CATALOG).filter((t) => t.domain === 'audio');

  const handleMouseEnterDomain = (domain: DomainCategory) => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setHoveredDomain(domain);
    const defaultTask = domain === 'vision' ? visionTasks[0] : domain === 'nlp' ? nlpTasks[0] : audioTasks[0];
    setHoveredTaskPreview(defaultTask);
  };

  const handleMouseLeaveDomain = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setHoveredDomain(null);
    }, 350); // Generous 350ms buffer so user never loses hover when moving cursor
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerNavRef.current && !headerNavRef.current.contains(e.target as Node)) {
        setHoveredDomain(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-12 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between z-40 select-none relative">
      {/* 1. Left: Brand & Main Navigation Links */}
      <div className="flex items-center gap-6" ref={headerNavRef}>
        {/* Brand */}
        <div 
          onClick={() => {
            setHoveredDomain(null);
            onNavigateView('home');
          }}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
            AX
          </div>
          <span className="font-semibold text-sm text-slate-100 tracking-tight">
            AnnotateX
          </span>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 relative">
          {/* HOME */}
          <button
            onClick={() => {
              setHoveredDomain(null);
              onNavigateView('home');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              currentView === 'home'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Início</span>
          </button>

          {/* VISÃO COMPUTACIONAL */}
          <div
            className="relative py-1.5"
            onMouseEnter={() => handleMouseEnterDomain('vision')}
            onMouseLeave={handleMouseLeaveDomain}
          >
            <button
              onClick={() => {
                onNavigateView('vision');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentView === 'vision' || hoveredDomain === 'vision'
                  ? 'bg-slate-800 text-blue-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visão Computacional</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {/* Submenu on Hover with Bridge Padding (No Gap) */}
            {hoveredDomain === 'vision' && (
              <div 
                onMouseEnter={() => handleMouseEnterDomain('vision')}
                onMouseLeave={handleMouseLeaveDomain}
                className="absolute top-full -left-2 pt-1.5 z-50 animate-fade-in"
              >
                <div className="w-[680px] bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl flex gap-4">
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="text-xs font-semibold text-slate-300">
                        Formatos de Visão ({visionTasks.length})
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                      {visionTasks.map((t) => (
                        <div
                          key={t.id}
                          onMouseEnter={() => setHoveredTaskPreview(t)}
                          onClick={() => {
                            onOpenNewDatasetModal('vision', t.id);
                            setHoveredDomain(null);
                          }}
                          className="p-2 rounded-lg bg-slate-950/40 hover:bg-slate-800 border border-slate-800/80 cursor-pointer transition-colors flex flex-col gap-0.5"
                        >
                          <span className="font-medium text-xs text-slate-200 truncate">
                            {t.title}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate">{t.shortDesc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {hoveredTaskPreview && (
                    <div className="w-56 bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col justify-between shrink-0">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-semibold text-xs text-white">{hoveredTaskPreview.title}</span>
                        <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                          {hoveredTaskPreview.shortDesc}
                        </p>
                        <pre className="p-2 bg-slate-900 border border-slate-800 rounded text-[9px] font-mono text-slate-300 overflow-x-auto max-h-24 scrollbar-thin">
                          {hoveredTaskPreview.exampleSnippet}
                        </pre>
                      </div>

                      <button
                        onClick={() => {
                          onOpenNewDatasetModal(hoveredTaskPreview.domain, hoveredTaskPreview.id);
                          setHoveredDomain(null);
                        }}
                        className="w-full mt-2 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors"
                      >
                        + Criar Este Dataset
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* NLP / LLMs */}
          <div
            className="relative py-1.5"
            onMouseEnter={() => handleMouseEnterDomain('nlp')}
            onMouseLeave={handleMouseLeaveDomain}
          >
            <button
              onClick={() => {
                onNavigateView('nlp');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentView === 'nlp' || hoveredDomain === 'nlp'
                  ? 'bg-slate-800 text-purple-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>NLP / LLMs</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {hoveredDomain === 'nlp' && (
              <div 
                onMouseEnter={() => handleMouseEnterDomain('nlp')}
                onMouseLeave={handleMouseLeaveDomain}
                className="absolute top-full -left-2 pt-1.5 z-50 animate-fade-in"
              >
                <div className="w-[680px] bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl flex gap-4">
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="text-xs font-semibold text-slate-300">
                        Formatos de Texto / LLM ({nlpTasks.length})
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                      {nlpTasks.map((t) => (
                        <div
                          key={t.id}
                          onMouseEnter={() => setHoveredTaskPreview(t)}
                          onClick={() => {
                            onOpenNewDatasetModal('nlp', t.id);
                            setHoveredDomain(null);
                          }}
                          className="p-2 rounded-lg bg-slate-950/40 hover:bg-slate-800 border border-slate-800/80 cursor-pointer transition-colors flex flex-col gap-0.5"
                        >
                          <span className="font-medium text-xs text-slate-200 truncate">
                            {t.title}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate">{t.shortDesc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {hoveredTaskPreview && (
                    <div className="w-56 bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col justify-between shrink-0">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-semibold text-xs text-white">{hoveredTaskPreview.title}</span>
                        <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                          {hoveredTaskPreview.shortDesc}
                        </p>
                        <pre className="p-2 bg-slate-900 border border-slate-800 rounded text-[9px] font-mono text-slate-300 overflow-x-auto max-h-24 scrollbar-thin">
                          {hoveredTaskPreview.exampleSnippet}
                        </pre>
                      </div>

                      <button
                        onClick={() => {
                          onOpenNewDatasetModal(hoveredTaskPreview.domain, hoveredTaskPreview.id);
                          setHoveredDomain(null);
                        }}
                        className="w-full mt-2 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors"
                      >
                        + Criar Este Dataset
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ÁUDIO */}
          <div
            className="relative py-1.5"
            onMouseEnter={() => handleMouseEnterDomain('audio')}
            onMouseLeave={handleMouseLeaveDomain}
          >
            <button
              onClick={() => {
                onNavigateView('audio');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentView === 'audio' || hoveredDomain === 'audio'
                  ? 'bg-slate-800 text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Áudio</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {hoveredDomain === 'audio' && (
              <div 
                onMouseEnter={() => handleMouseEnterDomain('audio')}
                onMouseLeave={handleMouseLeaveDomain}
                className="absolute top-full -left-2 pt-1.5 z-50 animate-fade-in"
              >
                <div className="w-[680px] bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl flex gap-4">
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="text-xs font-semibold text-slate-300">
                        Formatos de Áudio ({audioTasks.length})
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                      {audioTasks.map((t) => (
                        <div
                          key={t.id}
                          onMouseEnter={() => setHoveredTaskPreview(t)}
                          onClick={() => {
                            onOpenNewDatasetModal('audio', t.id);
                            setHoveredDomain(null);
                          }}
                          className="p-2 rounded-lg bg-slate-950/40 hover:bg-slate-800 border border-slate-800/80 cursor-pointer transition-colors flex flex-col gap-0.5"
                        >
                          <span className="font-medium text-xs text-slate-200 truncate">
                            {t.title}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate">{t.shortDesc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {hoveredTaskPreview && (
                    <div className="w-56 bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col justify-between shrink-0">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-semibold text-xs text-white">{hoveredTaskPreview.title}</span>
                        <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                          {hoveredTaskPreview.shortDesc}
                        </p>
                        <pre className="p-2 bg-slate-900 border border-slate-800 rounded text-[9px] font-mono text-slate-300 overflow-x-auto max-h-24 scrollbar-thin">
                          {hoveredTaskPreview.exampleSnippet}
                        </pre>
                      </div>

                      <button
                        onClick={() => {
                          onOpenNewDatasetModal(hoveredTaskPreview.domain, hoveredTaskPreview.id);
                          setHoveredDomain(null);
                        }}
                        className="w-full mt-2 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors"
                      >
                        + Criar Este Dataset
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* DOCUMENTAÇÃO / DOCS */}
          <button
            onClick={() => {
              setHoveredDomain(null);
              onNavigateView('docs');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              currentView === 'docs'
                ? 'bg-slate-800 text-blue-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Documentação</span>
          </button>
        </nav>
      </div>

      {/* 2. Center: Active Project Title */}
      {currentProject && currentView !== 'home' && (
        <div className="hidden lg:flex items-center gap-2">
          {isEditingTitle ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onUpdateProjectName(tempTitle.trim() || currentProject.name);
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                className="bg-slate-900 border border-blue-500 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
              />
              <button
                onClick={() => {
                  onUpdateProjectName(tempTitle.trim() || currentProject.name);
                  setIsEditingTitle(false);
                }}
                className="p-1 rounded bg-blue-600 text-white"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => {
                setTempTitle(currentProject.name);
                setIsEditingTitle(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs transition-colors"
              title="Clique para renomear este dataset"
            >
              <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium text-slate-200 truncate max-w-[200px]">{currentProject.name}</span>
            </div>
          )}
        </div>
      )}

      {/* 3. Right: Clean action */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onOpenNewDatasetModal()}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Dataset</span>
        </button>
      </div>
    </header>
  );
};
