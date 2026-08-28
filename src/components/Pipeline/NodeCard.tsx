import React, { useState } from 'react';
import { 
  Sparkles, 
  Terminal, 
  Code, 
  Sliders, 
  Database, 
  Filter, 
  Wand2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  Copy, 
  Eye, 
  ChevronDown, 
  ChevronUp,
  Highlighter,
  Layers,
  Bot
} from 'lucide-react';
import { PipelineNode, PipelinePort, PortDataType } from '../../types/pipeline';

interface NodeCardProps {
  node: PipelineNode;
  isSelected?: boolean;
  onSelect: (nodeId: string) => void;
  onUpdateParams: (nodeId: string, params: Record<string, any>) => void;
  onDelete: (nodeId: string) => void;
  onDuplicate?: (nodeId: string) => void;
  onStartConnect: (nodeId: string, portId: string, portType: PortDataType, isOutput: boolean, event: React.MouseEvent) => void;
  onEndConnect: (nodeId: string, portId: string, portType: PortDataType, isOutput: boolean) => void;
}

const CATEGORY_COLORS: Record<string, { border: string; header: string; badge: string }> = {
  input: { border: 'border-emerald-500/40', header: 'bg-emerald-950/40 text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300' },
  ai_model: { border: 'border-purple-500/50', header: 'bg-purple-950/40 text-purple-300', badge: 'bg-purple-500/20 text-purple-300' },
  code_script: { border: 'border-amber-500/50', header: 'bg-amber-950/40 text-amber-300', badge: 'bg-amber-500/20 text-amber-300' },
  tool_filter: { border: 'border-blue-500/40', header: 'bg-blue-950/40 text-blue-300', badge: 'bg-blue-500/20 text-blue-300' },
  augmentation: { border: 'border-pink-500/40', header: 'bg-pink-950/40 text-pink-300', badge: 'bg-pink-500/20 text-pink-300' },
  validation: { border: 'border-yellow-500/40', header: 'bg-yellow-950/40 text-yellow-300', badge: 'bg-yellow-500/20 text-yellow-300' },
  output: { border: 'border-indigo-500/40', header: 'bg-indigo-950/40 text-indigo-300', badge: 'bg-indigo-500/20 text-indigo-300' },
};

const PORT_COLORS: Record<PortDataType, string> = {
  image: 'bg-emerald-400 border-emerald-300',
  annotations: 'bg-indigo-400 border-indigo-300',
  text: 'bg-purple-400 border-purple-300',
  json: 'bg-amber-400 border-amber-300',
  audio: 'bg-cyan-400 border-cyan-300',
  any: 'bg-slate-300 border-white',
};

export const NodeCard: React.FC<NodeCardProps> = ({
  node,
  isSelected = false,
  onSelect,
  onUpdateParams,
  onDelete,
  onDuplicate,
  onStartConnect,
  onEndConnect,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const colors = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.input;

  const handleParamChange = (key: string, value: any) => {
    onUpdateParams(node.id, {
      ...node.params,
      [key]: value,
    });
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      style={{
        transform: `translate(${node.position.x}px, ${node.position.y}px)`,
      }}
      className={`absolute w-72 bg-slate-900 rounded-2xl border shadow-2xl transition-shadow select-none z-10 ${
        isSelected ? 'ring-2 ring-blue-500 border-blue-400 shadow-blue-500/20' : colors.border
      } ${
        node.status === 'running' ? 'ring-2 ring-purple-500 shadow-purple-500/30' : ''
      }`}
    >
      {/* 1. Header (Drag handle) */}
      <div className={`p-3 rounded-t-2xl border-b border-slate-800 flex items-center justify-between cursor-move ${colors.header}`}>
        <div className="flex items-center gap-2">
          {node.category === 'ai_model' && <Sparkles className="w-4 h-4 text-purple-400" />}
          {node.category === 'code_script' && <Terminal className="w-4 h-4 text-amber-400" />}
          {node.category === 'tool_filter' && <Filter className="w-4 h-4 text-blue-400" />}
          {node.category === 'augmentation' && <Wand2 className="w-4 h-4 text-pink-400" />}
          {node.category === 'input' && <Database className="w-4 h-4 text-emerald-400" />}
          {node.category === 'output' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}

          <div className="flex flex-col">
            <span className="font-bold text-xs text-white leading-tight">{node.title}</span>
            <span className="text-[10px] opacity-75 font-mono">{node.type}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Status Indicator */}
          {node.status === 'running' && (
            <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin" />
          )}
          {node.status === 'success' && (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          {node.status === 'error' && (
            <span title={node.errorMessage}>
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            </span>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {onDuplicate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(node.id);
              }}
              title="Duplicar Nó"
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              <Copy className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            title="Excluir Nó"
            className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2. Ports Section (Inputs on Left, Outputs on Right) */}
      <div className="px-3 py-2 flex justify-between gap-4 text-[11px] bg-slate-950/40 border-b border-slate-800/80 relative">
        {/* Left: Input Ports */}
        <div className="flex flex-col gap-2 flex-1">
          {node.inputs.map((port) => (
            <div key={port.id} className="flex items-center gap-1.5 group relative">
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onStartConnect(node.id, port.id, port.type, false, e);
                }}
                onMouseUp={(e) => {
                  e.stopPropagation();
                  onEndConnect(node.id, port.id, port.type, false);
                }}
                className={`w-3 h-3 rounded-full border-2 cursor-crosshair -ml-4.5 hover:scale-125 transition-transform ${
                  PORT_COLORS[port.type] || PORT_COLORS.any
                }`}
                title={`Entrada: ${port.label} (${port.type})`}
              />
              <span className="text-slate-300 font-medium truncate">{port.label}</span>
            </div>
          ))}
        </div>

        {/* Right: Output Ports */}
        <div className="flex flex-col gap-2 flex-1 items-end">
          {node.outputs.map((port) => (
            <div key={port.id} className="flex items-center gap-1.5 group relative">
              <span className="text-slate-300 font-medium truncate">{port.label}</span>
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onStartConnect(node.id, port.id, port.type, true, e);
                }}
                onMouseUp={(e) => {
                  e.stopPropagation();
                  onEndConnect(node.id, port.id, port.type, true);
                }}
                className={`w-3 h-3 rounded-full border-2 cursor-crosshair -mr-4.5 hover:scale-125 transition-transform ${
                  PORT_COLORS[port.type] || PORT_COLORS.any
                }`}
                title={`Saída: ${port.label} (${port.type})`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 3. In-Node Parameter Controls (Expanded) */}
      {isExpanded && (
        <div className="p-3 flex flex-col gap-2.5 text-xs text-slate-300">
          {/* AI Model Settings */}
          {(node.type === 'yolo_detector' || node.type === 'yolo_segmentation') && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-medium">Modelo Pré-Treinado:</label>
                <select
                  value={node.params.modelId || 'yolov11n'}
                  onChange={(e) => handleParamChange('modelId', e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                >
                  <option value="yolov11n">YOLOv11 Nano (Ultra Rápido • 80 Classes)</option>
                  <option value="yolov11s">YOLOv11 Small (Alta Precisão)</option>
                  <option value="yolov8x">YOLOv8 Extra Large</option>
                  <option value="rtdetr">RT-DETR Transformer</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Limiar de Confiança</span>
                  <span className="font-mono text-purple-300">
                    {Math.round((node.params.confidenceThreshold ?? 0.35) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.95"
                  step="0.05"
                  value={node.params.confidenceThreshold ?? 0.35}
                  onChange={(e) => handleParamChange('confidenceThreshold', parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-850 rounded"
                />
              </div>
            </>
          )}

          {/* Gemini Multimodal Settings */}
          {node.type === 'gemini_multimodal' && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-medium">Prompt de Instrução Visual:</label>
              <textarea
                rows={2}
                value={node.params.prompt || ''}
                onChange={(e) => handleParamChange('prompt', e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono text-slate-200 resize-none focus:outline-none focus:border-purple-500"
                placeholder="Ex: Identifique defeitos ou objetos e retorne coordenadas."
              />
            </div>
          )}

          {/* Custom Python Code Settings */}
          {node.type === 'custom_python_code' && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px] text-amber-400">
                <span>Script Python (annotations → result_annotations)</span>
              </div>
              <textarea
                rows={5}
                value={node.params.code || ''}
                onChange={(e) => handleParamChange('code', e.target.value)}
                className="bg-slate-950 border border-amber-500/30 rounded-lg p-2 text-[11px] font-mono text-amber-200 resize-y focus:outline-none focus:border-amber-400 scrollbar-thin"
              />
            </div>
          )}

          {/* Custom JavaScript Code Settings */}
          {node.type === 'custom_js_code' && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px] text-blue-400">
                <span>Script JS (return annotations)</span>
              </div>
              <textarea
                rows={4}
                value={node.params.code || ''}
                onChange={(e) => handleParamChange('code', e.target.value)}
                className="bg-slate-950 border border-blue-500/30 rounded-lg p-2 text-[11px] font-mono text-blue-200 resize-y focus:outline-none focus:border-blue-400 scrollbar-thin"
              />
            </div>
          )}

          {/* Confidence Filter Settings */}
          {node.type === 'confidence_filter' && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Confiança Mínima</span>
                <span className="font-mono text-blue-300">
                  {Math.round((node.params.minConfidence ?? 0.40) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.95"
                step="0.05"
                value={node.params.minConfidence ?? 0.40}
                onChange={(e) => handleParamChange('minConfidence', parseFloat(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-850 rounded"
              />
            </div>
          )}

          {/* Augmentation Settings */}
          {node.type === 'augmentation_pipe' && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Multiplicador de Amostras</span>
                <span className="font-mono text-pink-300">{node.params.multiplier || 2}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={node.params.multiplier || 2}
                onChange={(e) => handleParamChange('multiplier', parseInt(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer h-1.5 bg-slate-850 rounded"
              />
            </div>
          )}

          {/* Output Preview */}
          {node.lastOutput && (
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-emerald-400">
              <span>Saída Pronta</span>
              <span>
                {Array.isArray(node.lastOutput.annotations)
                  ? `${node.lastOutput.annotations.length} anotações`
                  : 'Dados processados'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
