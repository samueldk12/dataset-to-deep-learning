import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Sparkles, 
  Plus, 
  RotateCcw, 
  Download, 
  Upload, 
  Trash2, 
  Sliders, 
  CheckCircle2, 
  Layers, 
  Zap, 
  Workflow, 
  ArrowRight,
  RefreshCw,
  FolderKanban,
  Save,
  ArrowLeft,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Globe,
  Database,
  Edit3
} from 'lucide-react';
import { 
  AnnotationPipeline, 
  PipelineNode, 
  PipelineEdge, 
  PipelineNodeType, 
  PortDataType,
  PipelineExecutionResult 
} from '../../types/pipeline';
import { DatasetProject, DatasetImage, Annotation, DomainCategory, DatasetTaskType } from '../../types/dataset';
import { PIPELINE_TEMPLATES, createDefaultNode } from '../../utils/pipelineTemplates';
import { executePipeline } from '../../utils/pipelineEngine';
import { NodeCard } from '../Pipeline/NodeCard';
import { BezierEdge } from '../Pipeline/BezierEdge';
import { NodePalette } from '../Pipeline/NodePalette';
import { NewPipelineModal } from '../Modals/NewPipelineModal';
import { PipelineTriggerModal } from '../Modals/PipelineTriggerModal';

interface PipelineStudioWorkspaceProps {
  project: DatasetProject;
  projects?: DatasetProject[];
  onUpdateProject: (updated: DatasetProject) => void;
  onOpenExportModal?: () => void;
  onOpenNewDatasetModal?: (domain?: DomainCategory, taskType?: DatasetTaskType) => void;
}

export const PipelineStudioWorkspace: React.FC<PipelineStudioWorkspaceProps> = ({
  project,
  projects = [project],
  onUpdateProject,
  onOpenExportModal,
  onOpenNewDatasetModal,
}) => {
  // Pipelines Storage
  const [savedPipelines, setSavedPipelines] = useState<AnnotationPipeline[]>(() => {
    const stored = localStorage.getItem('annotatex_pipelines_list');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    // Default initial template pipelines bound to active project
    return PIPELINE_TEMPLATES.map((t, idx) => ({
      ...t,
      id: `pipe_default_${idx + 1}`,
      projectId: project.id,
      projectName: project.name,
    }));
  });

  // View Mode: 'list' (Manager Hub) or 'editor' (Node Canvas)
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const [activePipelineId, setActivePipelineId] = useState<string>(
    savedPipelines[0]?.id || 'pipe_default_1'
  );

  // Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [triggerPipeline, setTriggerPipeline] = useState<AnnotationPipeline | undefined>(undefined);
  const [searchFilter, setSearchFilter] = useState('');

  // Left Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Canvas Viewport Transformation
  const [transform, setTransform] = useState({ scale: 1, offsetX: 80, offsetY: 60 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);

  // Node Dragging State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Wire Connection Dragging State
  const [connecting, setConnecting] = useState<{
    fromNodeId: string;
    fromPortId: string;
    fromPortType: PortDataType;
    isOutput: boolean;
    startPos: { x: number; y: number };
    currentPos: { x: number; y: number };
  } | null>(null);

  // Execution State
  const [isExecuting, setIsExecuting] = useState(false);
  const [execProgress, setExecProgress] = useState(0);
  const [currentStepName, setCurrentStepName] = useState('');
  const [lastResult, setLastResult] = useState<PipelineExecutionResult | null>(null);
  const [isBatchRunning, setIsBatchRunning] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist pipelines list
  useEffect(() => {
    localStorage.setItem('annotatex_pipelines_list', JSON.stringify(savedPipelines));
  }, [savedPipelines]);

  const activePipeline = savedPipelines.find((p) => p.id === activePipelineId) || savedPipelines[0];

  const updateActivePipeline = (updater: (prev: AnnotationPipeline) => AnnotationPipeline) => {
    setSavedPipelines((prevList) =>
      prevList.map((pipe) => {
        if (pipe.id === activePipelineId) {
          const updated = updater(pipe);
          return { ...updated, updatedAt: Date.now() };
        }
        return pipe;
      })
    );
  };

  // Find dataset bound to active pipeline
  const targetProject = projects.find((p) => p.id === activePipeline?.projectId) || project;

  // Compute absolute port positions on canvas for drawing Bezier wires
  const getPortPosition = useCallback(
    (nodeId: string, portId: string, isOutput: boolean) => {
      if (!activePipeline) return { x: 0, y: 0 };
      const node = activePipeline.nodes.find((n) => n.id === nodeId);
      if (!node) return { x: 0, y: 0 };

      const cardWidth = 288; // w-72 = 288px
      const headerHeight = 52;
      const portRowHeight = 22;

      const portIndex = isOutput
        ? node.outputs.findIndex((p) => p.id === portId)
        : node.inputs.findIndex((p) => p.id === portId);

      const yOffset = headerHeight + (portIndex >= 0 ? portIndex : 0) * portRowHeight + 12;
      const xPos = isOutput ? node.position.x + cardWidth : node.position.x;
      const yPos = node.position.y + yOffset;

      return { x: xPos, y: yPos };
    },
    [activePipeline]
  );

  /* --- CANVAS INTERACTIONS --- */
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - transform.offsetX, y: e.clientY - transform.offsetY });
      setSelectedNodeId(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning && panStart) {
      setTransform((prev) => ({
        ...prev,
        offsetX: e.clientX - panStart.x,
        offsetY: e.clientY - panStart.y,
      }));
      return;
    }

    if (draggingNodeId) {
      const canvasX = (e.clientX - transform.offsetX) / transform.scale;
      const canvasY = (e.clientY - transform.offsetY) / transform.scale;

      updateActivePipeline((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === draggingNodeId
            ? {
                ...n,
                position: {
                  x: Math.round(canvasX - dragOffset.x),
                  y: Math.round(canvasY - dragOffset.y),
                },
              }
            : n
        ),
      }));
      return;
    }

    if (connecting) {
      const canvasX = (e.clientX - transform.offsetX) / transform.scale;
      const canvasY = (e.clientY - transform.offsetY) / transform.scale;
      setConnecting((prev) => (prev ? { ...prev, currentPos: { x: canvasX, y: canvasY } } : null));
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setPanStart(null);
    setDraggingNodeId(null);
    setConnecting(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.3, Math.min(2.5, prev.scale * zoomFactor)),
    }));
  };

  /* --- WIRE CONNECTION LOGIC --- */
  const handleStartConnect = (
    nodeId: string,
    portId: string,
    portType: PortDataType,
    isOutput: boolean,
    event: React.MouseEvent
  ) => {
    const portPos = getPortPosition(nodeId, portId, isOutput);
    setConnecting({
      fromNodeId: nodeId,
      fromPortId: portId,
      fromPortType: portType,
      isOutput,
      startPos: portPos,
      currentPos: portPos,
    });
  };

  const handleEndConnect = (
    toNodeId: string,
    toPortId: string,
    toPortType: PortDataType,
    isOutput: boolean
  ) => {
    if (!connecting || !activePipeline) return;
    if (connecting.fromNodeId === toNodeId) return;
    if (connecting.isOutput === isOutput) return;

    const sourceNodeId = connecting.isOutput ? connecting.fromNodeId : toNodeId;
    const sourcePortId = connecting.isOutput ? connecting.fromPortId : toPortId;
    const targetNodeId = connecting.isOutput ? toNodeId : connecting.fromNodeId;
    const targetPortId = connecting.isOutput ? toPortId : connecting.fromPortId;

    const exists = activePipeline.edges.some(
      (e) =>
        e.fromNodeId === sourceNodeId &&
        e.fromPortId === sourcePortId &&
        e.toNodeId === targetNodeId &&
        e.toPortId === targetPortId
    );

    if (!exists) {
      const newEdge: PipelineEdge = {
        id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        fromNodeId: sourceNodeId,
        fromPortId: sourcePortId,
        toNodeId: targetNodeId,
        toPortId: targetPortId,
      };

      updateActivePipeline((prev) => ({
        ...prev,
        edges: [...prev.edges, newEdge],
      }));
    }

    setConnecting(null);
  };

  const handleDeleteEdge = (edgeId: string) => {
    updateActivePipeline((prev) => ({
      ...prev,
      edges: prev.edges.filter((e) => e.id !== edgeId),
    }));
  };

  /* --- NODE MANAGEMENT --- */
  const handleAddNode = (type: PipelineNodeType) => {
    const defaultPos = {
      x: Math.round((350 - transform.offsetX) / transform.scale),
      y: Math.round((180 - transform.offsetY) / transform.scale),
    };
    const newNode = createDefaultNode(type, defaultPos);
    updateActivePipeline((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));
  };

  const handleDeleteNode = (nodeId: string) => {
    updateActivePipeline((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
      edges: prev.edges.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId),
    }));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleDuplicateNode = (nodeId: string) => {
    if (!activePipeline) return;
    const original = activePipeline.nodes.find((n) => n.id === nodeId);
    if (!original) return;
    const duplicated = createDefaultNode(original.type, {
      x: original.position.x + 30,
      y: original.position.y + 30,
    });
    duplicated.params = { ...original.params };
    updateActivePipeline((prev) => ({
      ...prev,
      nodes: [...prev.nodes, duplicated],
    }));
  };

  const handleUpdateNodeParams = (nodeId: string, newParams: Record<string, any>) => {
    updateActivePipeline((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, params: newParams } : n)),
    }));
  };

  /* --- PIPELINE CREATION & DELETION --- */
  const handleCreateNewPipeline = (newPipe: AnnotationPipeline) => {
    setSavedPipelines((prev) => [newPipe, ...prev]);
    setActivePipelineId(newPipe.id);
    setViewMode('editor');
  };

  const handleDeletePipeline = (pipeId: string) => {
    setSavedPipelines((prev) => {
      const remaining = prev.filter((p) => p.id !== pipeId);
      if (remaining.length > 0 && activePipelineId === pipeId) {
        setActivePipelineId(remaining[0].id);
      }
      return remaining;
    });
  };

  /* --- PIPELINE EXECUTION --- */
  const handleRunPipeline = async (batchAll = false, specificPipeline?: AnnotationPipeline) => {
    const pipeToRun = specificPipeline || activePipeline;
    if (!pipeToRun || isExecuting) return;

    setIsExecuting(true);
    setIsBatchRunning(batchAll);
    setExecProgress(0);
    setLastResult(null);

    // Reset node execution statuses
    updateActivePipeline((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => ({ ...n, status: 'idle', errorMessage: undefined })),
    }));

    const activeImage = targetProject.images?.find((img) => img.id === targetProject.activeImageId) || targetProject.images?.[0] || null;
    const targetImages = batchAll ? (targetProject.images || []) : [activeImage].filter(Boolean) as DatasetImage[];

    let aggregatedResult: PipelineExecutionResult | null = null;
    let updatedImages = [...(targetProject.images || [])];

    for (let i = 0; i < targetImages.length; i++) {
      const currentImg = targetImages[i];
      const batchPercent = Math.round(((i + 1) / targetImages.length) * 100);

      const result = await executePipeline(pipeToRun, {
        project: targetProject,
        activeImage: currentImg,
        onProgress: (prog, step, activeNodeId) => {
          setExecProgress(batchAll ? batchPercent : prog);
          setCurrentStepName(`[${i + 1}/${targetImages.length}] ${step}`);
        },
        onNodeStateChange: (nodeId, status, output, err) => {
          updateActivePipeline((prev) => ({
            ...prev,
            nodes: prev.nodes.map((n) =>
              n.id === nodeId
                ? {
                    ...n,
                    status,
                    lastOutput: output || n.lastOutput,
                    errorMessage: err,
                  }
                : n
            ),
          }));
        },
      });

      aggregatedResult = result;

      if (result.success && result.finalAnnotations && result.finalAnnotations.length > 0) {
        updatedImages = updatedImages.map((img) =>
          img.id === currentImg.id
            ? {
                ...img,
                annotations: [...img.annotations, ...result.finalAnnotations!],
                status: 'completed' as const,
              }
            : img
        );
      }
    }

    setIsExecuting(false);
    setIsBatchRunning(false);
    setLastResult(aggregatedResult);

    if (aggregatedResult && aggregatedResult.success) {
      onUpdateProject({
        ...targetProject,
        images: updatedImages,
      });
    }
  };

  /* ========================================================= */
  /* VIEW 1: PIPELINES MANAGER & LIST VIEW HUB               */
  /* ========================================================= */
  if (viewMode === 'list') {
    const filteredList = savedPipelines.filter((p) =>
      p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (p.projectName && p.projectName.toLowerCase().includes(searchFilter.toLowerCase()))
    );

    return (
      <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#070a0f] text-slate-100 p-6 md:p-10 select-none">
        {/* Header & Quick Creation Bar */}
        <div className="max-w-6xl mx-auto w-full flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                <Workflow className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-white tracking-tight">Pipelines de Anotação</h1>
                <p className="text-xs text-slate-400">
                  Automação e fluxos gráficos com IA, scripts Python/JS e ferramentas conectados aos seus datasets
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setTriggerPipeline(undefined);
                  setIsTriggerModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-700 hover:border-slate-600 font-semibold text-xs transition-colors"
                title="Configurar gatilhos automáticos, S3 bucket watch e comandos de API cURL / Python"
              >
                <Globe className="w-4 h-4 text-purple-400" />
                <span>API & Gatilhos (Triggers)</span>
              </button>

              <button
                onClick={() => setIsNewModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/20 transition-all active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Novo Pipeline</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar pipelines por nome ou dataset..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {filteredList.length} {filteredList.length === 1 ? 'pipeline' : 'pipelines'}
            </span>
          </div>

          {/* Pipelines Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map((pipe) => {
              const boundDataset = projects.find((p) => p.id === pipe.projectId) || project;

              return (
                <div
                  key={pipe.id}
                  className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900 transition-all shadow-xl flex flex-col justify-between gap-4 group"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-purple-600/10 text-purple-400 border border-purple-500/20">
                          <Workflow className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">
                          {pipe.name}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {pipe.description || 'Pipeline de automação de anotação de dados'}
                    </p>

                    {/* Dataset Bound Badge */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-emerald-400 font-medium">
                      <Database className="w-3.5 h-3.5" />
                      <span className="truncate">Dataset: {boundDataset?.name || 'Dataset Ativo'}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono mt-1">
                      <span>{pipe.nodes.length} Nodos</span>
                      <span>•</span>
                      <span>{pipe.edges.length} Conexões</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setActivePipelineId(pipe.id);
                        setViewMode('editor');
                      }}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-purple-600 hover:text-white text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar no Canvas</span>
                    </button>

                    <button
                      onClick={() => {
                        setTriggerPipeline(pipe);
                        setIsTriggerModalOpen(true);
                      }}
                      title="Ver comandos de API REST, cURL e Gatilhos automáticos"
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-purple-300 transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleRunPipeline(false, pipe)}
                      title="Executar este pipeline agora"
                      className="p-2 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>

                    <button
                      onClick={() => handleDeletePipeline(pipe.id)}
                      title="Excluir pipeline"
                      className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal: Create New Pipeline */}
        <NewPipelineModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          projects={projects}
          currentProjectId={project.id}
          onOpenNewDatasetModal={onOpenNewDatasetModal}
          onCreatePipeline={handleCreateNewPipeline}
        />

        {/* Modal: API & Triggers */}
        <PipelineTriggerModal
          isOpen={isTriggerModalOpen}
          onClose={() => setIsTriggerModalOpen(false)}
          pipeline={triggerPipeline || activePipeline}
          pipelines={savedPipelines}
          projects={projects}
        />
      </div>
    );
  }

  /* ========================================================= */
  /* VIEW 2: VISUAL NODE GRAPH CANVAS EDITOR                   */
  /* ========================================================= */
  return (
    <div 
      ref={containerRef}
      className="flex-1 flex flex-col h-full overflow-hidden bg-[#070a0f] text-slate-100 select-none relative"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onWheel={handleWheel}
    >
      {/* 1. TOP PIPELINE CONTROL BAR */}
      <header className="h-12 bg-slate-950/95 border-b border-slate-800/80 px-3.5 flex items-center justify-between z-30 shrink-0 backdrop-blur-md">
        {/* Left: Back to List, Sidebar Toggle, Pipeline Title & Dataset Selector */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setViewMode('list')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition-colors shrink-0 shadow-sm"
            title="Voltar para a lista de todos os pipelines"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Pipelines</span>
          </button>

          {/* Toggle Left Sidebar */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0 ${
              isSidebarOpen
                ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-850'
            }`}
            title="Mostrar / Ocultar Menu de Nodos à Esquerda"
          >
            {isSidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
          </button>

          <div className="w-[1px] h-4 bg-slate-800 shrink-0" />

          {/* Pipeline Title & Node Stats */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded-md bg-purple-600/20 text-purple-400 border border-purple-500/30 shrink-0">
              <Workflow className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs text-white truncate max-w-[180px] md:max-w-[240px]">
                {activePipeline.name}
              </span>
              <span className="text-[9px] text-slate-400 font-mono whitespace-nowrap">
                {activePipeline.nodes.length} Nodos • {activePipeline.edges.length} Conexões
              </span>
            </div>
          </div>

          <div className="w-[1px] h-4 bg-slate-800 shrink-0" />

          {/* Dataset Binding Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800/80 rounded-lg px-2.5 py-1 text-xs shrink-0">
            <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <select
              value={activePipeline.projectId || project.id}
              onChange={(e) => {
                const selected = projects.find((p) => p.id === e.target.value);
                if (selected) {
                  updateActivePipeline((prev) => ({
                    ...prev,
                    projectId: selected.id,
                    projectName: selected.name,
                  }));
                }
              }}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer truncate max-w-[180px]"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  Dataset: {p.name} ({p.images?.length || 0})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Execution Progress Indicator */}
        {isExecuting && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 border border-purple-500/30 animate-pulse shrink-0">
            <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-purple-200 truncate max-w-xs">{currentStepName}</span>
              <div className="w-28 h-1 bg-slate-800 rounded-full mt-0.5 overflow-hidden">
                <div 
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${execProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Run Single Image */}
          <button
            onClick={() => handleRunPipeline(false)}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-purple-600/25 whitespace-nowrap transition-all active:scale-98 disabled:opacity-50 shrink-0"
            title="Executar pipeline na imagem ativa do dataset"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Executar Pipeline</span>
          </button>

          {/* Run Batch All */}
          <button
            onClick={() => handleRunPipeline(true)}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 hover:border-slate-700 text-xs font-medium whitespace-nowrap transition-colors disabled:opacity-50 shrink-0"
            title="Executar pipeline em lote sobre todas as imagens do dataset"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span>Em Lote ({targetProject.images?.length || 0})</span>
          </button>

          <div className="w-[1px] h-4 bg-slate-800 shrink-0" />

          {/* API & Gatilhos */}
          <button
            onClick={() => {
              setTriggerPipeline(activePipeline);
              setIsTriggerModalOpen(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs font-medium whitespace-nowrap transition-colors shrink-0"
            title="Ver comandos de API REST / cURL e Gatilhos por Tag e Bucket S3"
          >
            <Globe className="w-3.5 h-3.5 text-purple-400" />
            <span>API</span>
          </button>

          {/* New Pipeline */}
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs font-medium whitespace-nowrap transition-colors shrink-0"
            title="Criar outro pipeline"
          >
            <Plus className="w-3.5 h-3.5 text-purple-400" />
            <span>Novo</span>
          </button>

          {/* Zoom Segment Controller */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs text-slate-400 shrink-0">
            <button 
              onClick={() => setTransform((prev) => ({ ...prev, scale: Math.max(0.3, prev.scale * 0.9) }))} 
              className="px-1.5 py-0.5 rounded hover:bg-slate-800 hover:text-white font-mono"
              title="Diminuir Zoom (-)"
            >
              -
            </button>
            <button 
              onClick={() => setTransform({ scale: 1, offsetX: 80, offsetY: 60 })} 
              className="px-2 py-0.5 font-mono text-[10px] hover:text-white"
              title="Redefinir Zoom para 100%"
            >
              {Math.round(transform.scale * 100)}%
            </button>
            <button 
              onClick={() => setTransform((prev) => ({ ...prev, scale: Math.min(2.5, prev.scale * 1.1) }))} 
              className="px-1.5 py-0.5 rounded hover:bg-slate-800 hover:text-white font-mono"
              title="Aumentar Zoom (+)"
            >
              +
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE BODY (LEFT SIDEBAR + GRAPH CANVAS) */}
      <div className="flex-1 flex w-full h-[calc(100%-48px)] overflow-hidden relative">
        {/* LEFT NODE PALETTE SIDEBAR */}
        <NodePalette
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onAddNode={handleAddNode}
        />

        {/* INFINITE GRAPH CANVAS */}
        <div 
          className="flex-1 w-full h-full relative overflow-hidden cursor-grab active:cursor-grabbing"
          style={{
            backgroundImage: `radial-gradient(circle, #1e293b 1px, transparent 1px)`,
            backgroundSize: `${20 * transform.scale}px ${20 * transform.scale}px`,
            backgroundPosition: `${transform.offsetX}px ${transform.offsetY}px`,
          }}
        >
          {/* SVG Bezier Wires */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            style={{
              transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.scale})`,
              transformOrigin: '0 0',
            }}
          >
            {activePipeline.edges.map((edge) => {
              const fromPos = getPortPosition(edge.fromNodeId, edge.fromPortId, true);
              const toPos = getPortPosition(edge.toNodeId, edge.toPortId, false);
              const fromNode = activePipeline.nodes.find((n) => n.id === edge.fromNodeId);
              const fromPort = fromNode?.outputs.find((p) => p.id === edge.fromPortId);

              return (
                <g key={edge.id} className="pointer-events-auto">
                  <BezierEdge
                    id={edge.id}
                    fromX={fromPos.x}
                    fromY={fromPos.y}
                    toX={toPos.x}
                    toY={toPos.y}
                    fromPortType={fromPort?.type}
                    isActive={fromNode?.status === 'running'}
                    onDelete={handleDeleteEdge}
                  />
                </g>
              );
            })}

            {connecting && (
              <BezierEdge
                id="wire_active"
                fromX={connecting.isOutput ? connecting.startPos.x : connecting.currentPos.x}
                fromY={connecting.isOutput ? connecting.startPos.y : connecting.currentPos.y}
                toX={connecting.isOutput ? connecting.currentPos.x : connecting.startPos.x}
                toY={connecting.isOutput ? connecting.currentPos.y : connecting.startPos.y}
                fromPortType={connecting.fromPortType}
                isActive={true}
              />
            )}
          </svg>

          {/* Node Cards */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.scale})`,
              transformOrigin: '0 0',
            }}
          >
            {activePipeline.nodes.map((node) => (
              <div
                key={node.id}
                className="pointer-events-auto"
                onMouseDown={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('.cursor-move')) {
                    e.stopPropagation();
                    setDraggingNodeId(node.id);
                    const canvasX = (e.clientX - transform.offsetX) / transform.scale;
                    const canvasY = (e.clientY - transform.offsetY) / transform.scale;
                    setDragOffset({
                      x: canvasX - node.position.x,
                      y: canvasY - node.position.y,
                    });
                  }
                }}
              >
                <NodeCard
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  onSelect={(id) => setSelectedNodeId(id)}
                  onUpdateParams={handleUpdateNodeParams}
                  onDelete={handleDeleteNode}
                  onDuplicate={handleDuplicateNode}
                  onStartConnect={handleStartConnect}
                  onEndConnect={handleEndConnect}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. EXECUTION SUMMARY TOAST */}
      {lastResult && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900 border border-slate-700 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-4 animate-fade-in text-xs">
          <div className="flex items-center gap-2">
            {lastResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <Trash2 className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <div className="flex flex-col">
              <span className="font-bold text-white">
                {lastResult.success ? 'Pipeline Executado com Sucesso!' : 'Falha na Execução'}
              </span>
              <span className="text-[10px] text-slate-400">
                Tempo total: {lastResult.totalTimeMs}ms • {lastResult.finalAnnotations?.length || 0} anotações geradas no dataset '{targetProject.name}'
              </span>
            </div>
          </div>

          <button
            onClick={() => setLastResult(null)}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            OK
          </button>
        </div>
      )}

      {/* Modal: Create New Pipeline */}
      <NewPipelineModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        projects={projects}
        currentProjectId={project.id}
        onOpenNewDatasetModal={onOpenNewDatasetModal}
        onCreatePipeline={handleCreateNewPipeline}
      />

      {/* Modal: API & Triggers */}
      <PipelineTriggerModal
        isOpen={isTriggerModalOpen}
        onClose={() => setIsTriggerModalOpen(false)}
        pipeline={triggerPipeline || activePipeline}
        pipelines={savedPipelines}
        projects={projects}
      />
    </div>
  );
};
