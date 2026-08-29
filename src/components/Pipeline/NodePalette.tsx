import React, { useState } from 'react';
import { 
  Plus, 
  Sparkles, 
  Terminal, 
  Filter, 
  Wand2, 
  Database, 
  CheckCircle2, 
  Search, 
  X,
  Layers,
  ChevronRight,
  Code,
  ShieldCheck,
  FileDown,
  Video,
  FileText
} from 'lucide-react';
import { PipelineNodeType, NodeCategory } from '../../types/pipeline';

interface NodePaletteProps {
  isOpen: boolean;
  onClose?: () => void;
  onAddNode: (type: PipelineNodeType) => void;
}

interface NodeDefinition {
  type: PipelineNodeType;
  title: string;
  desc: string;
  category: NodeCategory;
  badge: string;
  colorClass: string;
  icon: React.ElementType;
}

const AVAILABLE_NODES: NodeDefinition[] = [
  // 1. AI Models
  {
    type: 'yolo_detector',
    title: 'YOLOv11 Detector',
    desc: 'Auto-detecta caixas delimitadoras rápidas (COCO 80 classes)',
    category: 'ai_model',
    badge: 'YOLOv11',
    colorClass: 'text-purple-400 bg-purple-950/40 border-purple-500/30 group-hover:border-purple-400',
    icon: Sparkles,
  },
  {
    type: 'yolo_segmentation',
    title: 'YOLOv11 Segmentação',
    desc: 'Gera polígonos de contorno e segmentação de instâncias',
    category: 'ai_model',
    badge: 'Máscara',
    colorClass: 'text-indigo-400 bg-indigo-950/40 border-indigo-500/30 group-hover:border-indigo-400',
    icon: Layers,
  },
  {
    type: 'yolo_pose',
    title: 'YOLOv11 Pose / Esqueletos',
    desc: 'Detecta 17 keypoints anatômicos de corpo humano e poses',
    category: 'ai_model',
    badge: 'Pose',
    colorClass: 'text-violet-400 bg-violet-950/40 border-violet-500/30 group-hover:border-violet-400',
    icon: Sparkles,
  },
  {
    type: 'gemini_multimodal',
    title: 'Google Gemini Flash',
    desc: 'Anotação visual multimodal ou geração textual via Gemini 2.5',
    category: 'ai_model',
    badge: 'Gemini',
    colorClass: 'text-blue-400 bg-blue-950/40 border-blue-500/30 group-hover:border-blue-400',
    icon: Sparkles,
  },

  // 2. Code & Scripts
  {
    type: 'custom_python_code',
    title: 'Python Script Node',
    desc: 'Executa código Python para manipulação de coordenadas e filtros',
    category: 'code_script',
    badge: 'Python',
    colorClass: 'text-amber-400 bg-amber-950/40 border-amber-500/30 group-hover:border-amber-400',
    icon: Terminal,
  },
  {
    type: 'custom_js_code',
    title: 'JavaScript Code Node',
    desc: 'Transformação rápida de dados em JavaScript em tempo real',
    category: 'code_script',
    badge: 'JS',
    colorClass: 'text-yellow-400 bg-yellow-950/40 border-yellow-500/30 group-hover:border-yellow-400',
    icon: Code,
  },

  // 3. Tools & Filters
  {
    type: 'confidence_filter',
    title: 'Filtro de Confiança',
    desc: 'Descarta detecções que não atingem a probabilidade mínima',
    category: 'tool_filter',
    badge: 'Filtro',
    colorClass: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30 group-hover:border-cyan-400',
    icon: Filter,
  },
  {
    type: 'class_filter_remap',
    title: 'Filtro & Remapeamento',
    desc: 'Filtra classes ou renomeia rótulos (ex: car -> Veículo)',
    category: 'tool_filter',
    badge: 'Classes',
    colorClass: 'text-teal-400 bg-teal-950/40 border-teal-500/30 group-hover:border-teal-400',
    icon: Filter,
  },
  {
    type: 'box_geometry_filter',
    title: 'Filtro Geométrico',
    desc: 'Filtra caixas por área mínima em pixels e proporção de aspecto',
    category: 'tool_filter',
    badge: 'Geometria',
    colorClass: 'text-sky-400 bg-sky-950/40 border-sky-500/30 group-hover:border-sky-400',
    icon: Filter,
  },
  {
    type: 'nms_ensemble',
    title: 'NMS / Ensemble Fusion',
    desc: 'Funde predições de múltiplos modelos via Weighted Boxes Fusion',
    category: 'tool_filter',
    badge: 'Ensemble',
    colorClass: 'text-blue-400 bg-blue-950/40 border-blue-500/30 group-hover:border-blue-400',
    icon: Layers,
  },

  // 4. Augmentation
  {
    type: 'augmentation_pipe',
    title: 'Data Augmentation',
    desc: 'Gera variações com flip, rotação, ruído e recalculando anotações',
    category: 'augmentation',
    badge: 'Augment',
    colorClass: 'text-pink-400 bg-pink-950/40 border-pink-500/30 group-hover:border-pink-400',
    icon: Wand2,
  },

  // 5. Inputs
  {
    type: 'dataset_source',
    title: 'Fonte do Dataset',
    desc: 'Carrega imagens ou dados do projeto como ponto inicial',
    category: 'input',
    badge: 'Origem',
    colorClass: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30 group-hover:border-emerald-400',
    icon: Database,
  },
  {
    type: 'video_frame_source',
    title: 'Extrator de Vídeo',
    desc: 'Extrai frames em taxa de amostragem configurável para anotação',
    category: 'input',
    badge: 'Vídeo',
    colorClass: 'text-green-400 bg-green-950/40 border-green-500/30 group-hover:border-green-400',
    icon: Video,
  },
  {
    type: 'text_source',
    title: 'Fonte de Texto / Prompt',
    desc: 'Fornece textos ou instruções para pipelines de NLP',
    category: 'input',
    badge: 'Texto',
    colorClass: 'text-lime-400 bg-lime-950/40 border-lime-500/30 group-hover:border-lime-400',
    icon: FileText,
  },

  // 6. Validation
  {
    type: 'human_review_gate',
    title: 'Human Review Gate',
    desc: 'Encaminha amostras de baixa certeza para inspeção manual',
    category: 'validation',
    badge: 'Revisão',
    colorClass: 'text-amber-400 bg-amber-950/40 border-amber-500/30 group-hover:border-amber-400',
    icon: ShieldCheck,
  },

  // 7. Outputs
  {
    type: 'save_to_dataset',
    title: 'Salvar no Dataset',
    desc: 'Grava todas as anotações do pipeline diretamente no dataset ativo',
    category: 'output',
    badge: 'Salvar',
    colorClass: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30 group-hover:border-emerald-400',
    icon: Database,
  },
  {
    type: 'export_file',
    title: 'Exportar Arquivo',
    desc: 'Gera pacote de exportação em YOLO ZIP, COCO JSON ou Parquet',
    category: 'output',
    badge: 'Export',
    colorClass: 'text-indigo-400 bg-indigo-950/40 border-indigo-500/30 group-hover:border-indigo-400',
    icon: FileDown,
  },
];

export const NodePalette: React.FC<NodePaletteProps> = ({
  isOpen,
  onClose,
  onAddNode,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

  const filtered = AVAILABLE_NODES.filter((node) => {
    const matchesSearch = node.title.toLowerCase().includes(search.toLowerCase()) ||
      node.desc.toLowerCase().includes(search.toLowerCase()) ||
      node.badge.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'all' || node.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <aside className="w-64 md:w-72 bg-slate-950/95 border-r border-slate-800/80 flex flex-col h-full shrink-0 select-none z-20 shadow-2xl backdrop-blur-md">
      {/* Sidebar Header */}
      <div className="h-12 px-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-purple-600/20 text-purple-400 border border-purple-500/30">
            <Plus className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-white">Menu de Nodos</h3>
            <p className="text-[9px] text-slate-400">Clique para adicionar ao canvas</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Recolher menu de nodos"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Search & Category Filter */}
      <div className="p-2.5 border-b border-slate-800/80 flex flex-col gap-2 bg-slate-950/60 shrink-0">
        <div className="relative">
          <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Buscar nó..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[10px]">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'ai_model', label: 'IAs' },
            { id: 'code_script', label: 'Código' },
            { id: 'tool_filter', label: 'Filtros' },
            { id: 'augmentation', label: 'Augment' },
            { id: 'input', label: 'Entradas' },
            { id: 'output', label: 'Saídas' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2 py-0.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-purple-600 text-white font-semibold shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Node Cards List */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 scrollbar-thin">
        {filtered.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.type}
              onClick={() => onAddNode(item.type)}
              className="p-2 rounded-xl bg-slate-900/50 hover:bg-slate-850/80 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-all flex items-center justify-between group relative overflow-hidden"
            >
              <div className="flex items-start gap-2 flex-1 pr-2">
                <div className={`p-1.5 rounded-lg border shrink-0 mt-0.5 transition-colors ${item.colorClass}`}>
                  <Icon className="w-3 h-3" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-100 group-hover:text-purple-300 transition-colors truncate">
                      {item.title}
                    </span>
                    <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-slate-950 border border-slate-800 text-slate-400 shrink-0">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                    {item.desc}
                  </p>
                </div>
              </div>

              <div className="p-1 rounded-md bg-slate-800/80 group-hover:bg-purple-600 text-slate-400 group-hover:text-white transition-colors shrink-0 shadow-sm">
                <Plus className="w-3 h-3" />
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
