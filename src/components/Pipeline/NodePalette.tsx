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
  ChevronRight
} from 'lucide-react';
import { PipelineNodeType, NodeCategory } from '../../types/pipeline';

interface NodePaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (type: PipelineNodeType) => void;
}

interface NodeDefinition {
  type: PipelineNodeType;
  title: string;
  desc: string;
  category: NodeCategory;
  badge: string;
}

const AVAILABLE_NODES: NodeDefinition[] = [
  // 1. AI Models
  {
    type: 'yolo_detector',
    title: 'YOLOv11 Detector',
    desc: 'Auto-detecta caixas delimitadoras com modelos pré-treinados rápidos (COCO 80 classes)',
    category: 'ai_model',
    badge: 'IA Visão',
  },
  {
    type: 'yolo_segmentation',
    title: 'YOLOv11 Segmentação',
    desc: 'Gera polígonos finos de contorno e segmentação de instâncias',
    category: 'ai_model',
    badge: 'IA Máscara',
  },
  {
    type: 'yolo_pose',
    title: 'YOLOv11 Pose / Esqueletos',
    desc: 'Detecta 17 keypoints anatômicos de corpo humano e poses articuladas',
    category: 'ai_model',
    badge: 'IA Pose',
  },
  {
    type: 'gemini_multimodal',
    title: 'Google Gemini Flash',
    desc: 'Anotação visual multimodal ou geração textual via Gemini 2.5 Flash Lite',
    category: 'ai_model',
    badge: 'Multimodal',
  },

  // 2. Code & Scripts
  {
    type: 'custom_python_code',
    title: 'Python Script Node',
    desc: 'Executa código Python customizado para manipulação de coordenadas e filtros matemáticos',
    category: 'code_script',
    badge: 'Python',
  },
  {
    type: 'custom_js_code',
    title: 'JavaScript Code Node',
    desc: 'Transformação rápida de dados em JavaScript executada em tempo real',
    category: 'code_script',
    badge: 'JavaScript',
  },

  // 3. Tools & Filters
  {
    type: 'confidence_filter',
    title: 'Filtro de Confiança',
    desc: 'Descarta detecções automáticas que não atingem a probabilidade mínima',
    category: 'tool_filter',
    badge: 'Filtro',
  },
  {
    type: 'class_filter_remap',
    title: 'Filtro & Remapeamento de Classes',
    desc: 'Filtra rótulos específicos ou remapeia nomes de classes (ex: car -> Veículo)',
    category: 'tool_filter',
    badge: 'Taxonomia',
  },
  {
    type: 'box_geometry_filter',
    title: 'Filtro Geométrico de Caixas',
    desc: 'Filtra por área mínima em pixels e proporção de aspecto (Aspect Ratio)',
    category: 'tool_filter',
    badge: 'Geometria',
  },
  {
    type: 'nms_ensemble',
    title: 'NMS / Ensemble Multi-Modelo',
    desc: 'Funde e consolida predições de múltiplos modelos usando Weighted Boxes Fusion',
    category: 'tool_filter',
    badge: 'Ensemble',
  },

  // 4. Augmentation
  {
    type: 'augmentation_pipe',
    title: 'Pipeline de Augmentation',
    desc: 'Gera cópias aumentadas com rotação, flip, ruído e brilho com anotações automáticas',
    category: 'augmentation',
    badge: 'Augment',
  },

  // 5. Inputs
  {
    type: 'dataset_source',
    title: 'Fonte do Dataset',
    desc: 'Carrega imagens ou dados do projeto atual como ponto inicial do fluxo',
    category: 'input',
    badge: 'Origem',
  },
  {
    type: 'video_frame_source',
    title: 'Extrator de Vídeo',
    desc: 'Extrai frames em taxa de amostragem configurável para anotação em sequência',
    category: 'input',
    badge: 'Vídeo',
  },
  {
    type: 'text_source',
    title: 'Fonte de Texto / Prompt',
    desc: 'Fornece textos ou instruções para pipelines de NLP',
    category: 'input',
    badge: 'Texto',
  },

  // 6. Validation
  {
    type: 'human_review_gate',
    title: 'Human Review Gate',
    desc: 'Encaminha amostras de baixa certeza para inspeção manual antes de salvar',
    category: 'validation',
    badge: 'Revisão',
  },

  // 7. Outputs
  {
    type: 'save_to_dataset',
    title: 'Salvar no Dataset Ativo',
    desc: 'Grava todas as anotações do pipeline diretamente no dataset aberto',
    category: 'output',
    badge: 'Persistência',
  },
  {
    type: 'export_file',
    title: 'Exportar Arquivo',
    desc: 'Gera pacote de exportação em YOLO ZIP, COCO JSON, Parquet ou Pascal VOC',
    category: 'output',
    badge: 'Exportação',
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
    <div className="absolute top-14 left-4 z-40 w-80 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col max-h-[calc(100vh-120px)] overflow-hidden animate-fade-in select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Plus className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-white">Biblioteca de Nodos</h3>
            <p className="text-[10px] text-slate-400">Clique para inserir no pipeline</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="p-3 border-b border-slate-800 flex flex-col gap-2 bg-slate-950/40">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Buscar nó por nome ou função..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px]">
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
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 scrollbar-thin">
        {filtered.map((item) => (
          <div
            key={item.type}
            onClick={() => {
              onAddNode(item.type);
            }}
            className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex flex-col gap-0.5 flex-1 pr-2">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-slate-100 group-hover:text-blue-300 transition-colors">
                  {item.title}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400">
                  {item.badge}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                {item.desc}
              </p>
            </div>
            <div className="p-1 rounded-lg bg-slate-900 group-hover:bg-blue-600 text-slate-400 group-hover:text-white transition-colors shrink-0">
              <Plus className="w-3.5 h-3.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
