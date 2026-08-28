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
  Save
} from 'lucide-react';
import { 
  AnnotationPipeline, 
  PipelineNode, 
  PipelineEdge, 
  PipelineNodeType, 
  PortDataType,
  PipelineExecutionResult 
} from '../../types/pipeline';
import { DatasetProject, DatasetImage, Annotation } from '../../types/dataset';
import { PIPELINE_TEMPLATES, createDefaultNode } from '../../utils/pipelineTemplates';
import { executePipeline } from '../../utils/pipelineEngine';
import { NodeCard } from '../Pipeline/NodeCard';
import { BezierEdge } from '../Pipeline/BezierEdge';
import { NodePalette } from '../Pipeline/NodePalette';

interface PipelineStudioWorkspaceProps {
  project: DatasetProject;
  onUpdateProject: (updated: DatasetProject) => void;
  onOpenExportModal?: () => void;
}

export const PipelineStudioWorkspace: React.FC<PipelineStudioWorkspaceProps> = ({
  project,
  onUpdateProject,
  onOpenExportModal,
}) => {
  // Active pipeline state
  const [pipeline, setPipeline] = useState<AnnotationPipeline>(() => {
    const saved = localStorage.getItem(`annotatex_pipeline_${project.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return { ...PIPELINE_TEMPLATES[0], id: `pipe_${Date.now()}` };
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Canvas Viewport Transformation
  const [transform, setTransform] = useState({ scale: 1, offsetX: 60, offsetY: 40 });
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

  // Save pipeline changes to storage
  useEffect(() => {
    localStorage.setItem(`annotatex_pipeline_${project.id}`, JSON.stringify(pipeline));
  }, [pipeline, project.id]);

  // Compute absolute port positions on canvas for drawing Bezier wires
  const getPortPosition = useCallback(
    (nodeId: string, portId: string, isOutput: boolean) => {
      const node = pipeline.nodes.find((n) => n.id === nodeId);
      if (!node) return { x: 0, y: 0 };

      const cardWidth = 288; // w-72 = 18rem = 288px
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
    [pipeline.nodes]
  );

  /* --- CANVAS INTERACTIONS --- */
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 0) {
      // Pan canvas
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

      setPipeline((prev) => ({
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
    if (!connecting) return;
    if (connecting.fromNodeId === toNodeId) return; // cannot connect node to itself
    if (connecting.isOutput === isOutput) return; // must connect output to input

    const sourceNodeId = connecting.isOutput ? connecting.fromNodeId : toNodeId;
    const sourcePortId = connecting.isOutput ? connecting.fromPortId : toPortId;
    const targetNodeId = connecting.isOutput ? toNodeId : connecting.fromNodeId;
    const targetPortId = connecting.isOutput ? toPortId : connecting.fromPortId;

    // Check if edge already exists
    const exists = pipeline.edges.some(
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

      setPipeline((prev) => ({
        ...prev,
        edges: [...prev.edges, newEdge],
      }));
    }

    setConnecting(null);
  };

  const handleDeleteEdge = (edgeId: string) => {
    setPipeline((prev) => ({
      ...prev,
      edges: prev.edges.filter((e) => e.id !== edgeId),
    }));
  };

  /* --- NODE MANAGEMENT --- */
  const handleAddNode = (type: PipelineNodeType) => {
    const defaultPos = {
      x: Math.round((400 - transform.offsetX) / transform.scale),
      y: Math.round((200 - transform.offsetY) / transform.scale),
    };
    const newNode = createDefaultNode(type, defaultPos);
    setPipeline((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));
    setIsPaletteOpen(false);
  };

  const handleDeleteNode = (nodeId: string) => {
    setPipeline((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
      edges: prev.edges.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId),
    }));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleDuplicateNode = (nodeId: string) => {
    const original = pipeline.nodes.find((n) => n.id === nodeId);
    if (!original) return;
    const duplicated = createDefaultNode(original.type, {
      x: original.position.x + 30,
      y: original.position.y + 30,
    });
    duplicated.params = { ...original.params };
    setPipeline((prev) => ({
      ...prev,
      nodes: [...prev.nodes, duplicated],
    }));
  };

  const handleUpdateNodeParams = (nodeId: string, newParams: Record<string, any>) => {
    setPipeline((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, params: newParams } : n)),
    }));
  };

  /* --- TEMPLATE & IMPORT/EXPORT --- */
  const handleLoadTemplate = (tpl: AnnotationPipeline) => {
    setPipeline({
      ...tpl,
      id: `pipe_${Date.now()}`,
      updatedAt: Date.now(),
    });
  };

  const handleExportPipelineJSON = () => {
    const jsonStr = JSON.stringify(pipeline, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pipeline_${pipeline.name.toLowerCase().replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPipelineJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed.nodes && parsed.edges) {
          setPipeline(parsed);
        }
      } catch (err) {
        alert('Formato de pipeline JSON inválido.');
      }
    };
    reader.readAsText(file);
  };

  /* --- PIPELINE EXECUTION --- */
  const handleRunPipeline = async (batchAll = false) => {
    if (isExecuting) return;
    setIsExecuting(true);
    setIsBatchRunning(batchAll);
    setExecProgress(0);
    setLastResult(null);

    // Reset node execution statuses
    setPipeline((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => ({ ...n, status: 'idle', errorMessage: undefined })),
    }));

    const activeImage = project.images?.find((img) => img.id === project.activeImageId) || project.images?.[0] || null;
    const targetImages = batchAll ? (project.images || []) : [activeImage].filter(Boolean) as DatasetImage[];

    let aggregatedResult: PipelineExecutionResult | null = null;
    let updatedImages = [...(project.images || [])];

    for (let i = 0; i < targetImages.length; i++) {
      const currentImg = targetImages[i];
      const batchPercent = Math.round(((i + 1) / targetImages.length) * 100);

      const result = await executePipeline(pipeline, {
        project,
        activeImage: currentImg,
        onProgress: (prog, step, activeNodeId) => {
          setExecProgress(batchAll ? batchPercent : prog);
          setCurrentStepName(`[${i + 1}/${targetImages.length}] ${step}`);
        },
        onNodeStateChange: (nodeId, status, output, err) => {
          setPipeline((prev) => ({
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
        ...project,
        images: updatedImages,
      });
    }
  };

  const activeImage = project.images?.find((img) => img.id === project.activeImageId) || project.images?.[0] || null;

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
      <div className="h-14 bg-slate-950/90 border-b border-slate-800 px-4 flex items-center justify-between z-30 shrink-0 backdrop-blur-md">
        {/* Left: Pipeline Title & Template Loader */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Workflow className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs text-white">{pipeline.name}</span>
              <span className="text-[10px] text-slate-400">
                {pipeline.nodes.length} Nodos • {pipeline.edges.length} Conexões
              </span>
            </div>
          </div>

          <div className="w-[1px] h-5 bg-slate-800" />

          {/* Template Select Dropdown */}
          <select
            onChange={(e) => {
              const selectedTpl = PIPELINE_TEMPLATES.find((t) => t.id === e.target.value);
              if (selectedTpl) handleLoadTemplate(selectedTpl);
            }}
            value=""
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="" disabled>📋 Carregar Template...</option>
            {PIPELINE_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Add Node Button */}
          <button
            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Nó</span>
          </button>
        </div>

        {/* Center: Execution Progress Indicator */}
        {isExecuting && (
          <div className="flex items-center gap-3 px-4 py-1.5 rounded-xl bg-slate-900 border border-purple-500/30 animate-pulse">
            <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-purple-200 truncate max-w-xs">{currentStepName}</span>
              <div className="w-36 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${execProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Right: Actions (Run, Export, Import) */}
        <div className="flex items-center gap-2">
          {/* Run on Single Image */}
          <button
            onClick={() => handleRunPipeline(false)}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50"
            title="Executar pipeline na imagem atualmente selecionada"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Executar Pipeline</span>
          </button>

          {/* Run Batch All Images */}
          <button
            onClick={() => handleRunPipeline(true)}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-700 hover:border-slate-600 text-xs font-medium transition-colors disabled:opacity-50"
            title="Executar pipeline em lote sobre todas as imagens do dataset"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span className="hidden md:inline">Em Lote ({project.images?.length || 0})</span>
          </button>

          <div className="w-[1px] h-5 bg-slate-800" />

          {/* Import / Export JSON */}
          <button
            onClick={handleExportPipelineJSON}
            title="Salvar Pipeline em arquivo JSON"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Carregar Pipeline de arquivo JSON"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            <Upload className="w-4 h-4" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportPipelineJSON}
            className="hidden"
          />

          {/* Reset Zoom */}
          <button
            onClick={() => setTransform({ scale: 1, offsetX: 60, offsetY: 40 })}
            title="Centralizar Visualização (Zoom 100%)"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors font-mono text-xs"
          >
            {Math.round(transform.scale * 100)}%
          </button>
        </div>
      </div>

      {/* 2. NODE LIBRARY PALETTE DRAWER */}
      <NodePalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onAddNode={handleAddNode}
      />

      {/* 3. INFINITE GRAPH CANVAS WITH DOT GRID */}
      <div 
        className="flex-1 w-full h-full relative overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          backgroundImage: `radial-gradient(circle, #1e293b 1px, transparent 1px)`,
          backgroundSize: `${20 * transform.scale}px ${20 * transform.scale}px`,
          backgroundPosition: `${transform.offsetX}px ${transform.offsetY}px`,
        }}
      >
        {/* SVG Bezier Wires Layer */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          style={{
            transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
          }}
        >
          {pipeline.edges.map((edge) => {
            const fromPos = getPortPosition(edge.fromNodeId, edge.fromPortId, true);
            const toPos = getPortPosition(edge.toNodeId, edge.toPortId, false);
            const fromNode = pipeline.nodes.find((n) => n.id === edge.fromNodeId);
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

          {/* Active Wire being dragged */}
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

        {/* Interactive Node Cards Layer */}
        <div
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
          }}
        >
          {pipeline.nodes.map((node) => (
            <div
              key={node.id}
              className="pointer-events-auto"
              onMouseDown={(e) => {
                // Check if dragging node header
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

      {/* 4. BOTTOM EXECUTION SUMMARY / TOAST */}
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
                {lastResult.success ? 'Pipeline Concluído com Sucesso!' : 'Falha na Execução'}
              </span>
              <span className="text-[10px] text-slate-400">
                Tempo total: {lastResult.totalTimeMs}ms • {lastResult.finalAnnotations?.length || 0} anotações geradas
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
    </div>
  );
};
