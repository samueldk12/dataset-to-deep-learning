import { 
  PipelineNode, 
  PipelineEdge, 
  AnnotationPipeline, 
  PipelineNodeType, 
  NodeCategory,
  PipelinePort 
} from '../types/pipeline';

/**
 * Creates default ports and metadata for any node type.
 */
export function createDefaultNode(
  type: PipelineNodeType, 
  position: { x: number; y: number }, 
  customId?: string
): PipelineNode {
  const id = customId || `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  switch (type) {
    // 1. INPUTS
    case 'dataset_source':
      return {
        id,
        type,
        category: 'input',
        title: 'Fonte do Dataset',
        description: 'Carrega imagens ou amostras do dataset ativo',
        position,
        inputs: [],
        outputs: [
          { id: 'image', name: 'image', type: 'image', label: 'Imagem' },
          { id: 'annotations', name: 'annotations', type: 'annotations', label: 'Anotações Existentes' },
        ],
        params: {
          scope: 'active_image', // 'active_image' | 'all_images'
          filterSplit: 'all', // 'all' | 'train' | 'val' | 'test'
        },
      };

    case 'video_frame_source':
      return {
        id,
        type,
        category: 'input',
        title: 'Extrator de Vídeo',
        description: 'Extrai frames de vídeo com amostragem FPS',
        position,
        inputs: [],
        outputs: [
          { id: 'image', name: 'image', type: 'image', label: 'Frame' },
          { id: 'metadata', name: 'metadata', type: 'json', label: 'Metadados' },
        ],
        params: {
          fps: 1,
          maxFrames: 30,
        },
      };

    case 'text_source':
      return {
        id,
        type,
        category: 'input',
        title: 'Fonte de Texto / NLP',
        description: 'Fornece prompts, documentos ou frases',
        position,
        inputs: [],
        outputs: [
          { id: 'text', name: 'text', type: 'text', label: 'Texto' },
        ],
        params: {
          rawText: 'Exemplo de texto para anotação e extração de entidades.',
        },
      };

    // 2. AI MODELS
    case 'yolo_detector':
      return {
        id,
        type,
        category: 'ai_model',
        title: 'YOLOv11 Detector',
        description: 'Detecta bounding boxes de objetos automaticamente',
        position,
        inputs: [
          { id: 'image', name: 'image', type: 'image', label: 'Imagem' },
        ],
        outputs: [
          { id: 'annotations', name: 'annotations', type: 'annotations', label: 'Detecções (BBoxes)' },
          { id: 'image', name: 'image', type: 'image', label: 'Imagem Passthrough' },
        ],
        params: {
          modelId: 'yolov11n',
          confidenceThreshold: 0.35,
          iouThreshold: 0.45,
          targetClasses: [],
        },
      };

    case 'yolo_segmentation':
      return {
        id,
        type,
        category: 'ai_model',
        title: 'YOLOv11 Segmentação',
        description: 'Gera polígonos de segmentação de instâncias',
        position,
        inputs: [
          { id: 'image', name: 'image', type: 'image', label: 'Imagem' },
        ],
        outputs: [
          { id: 'annotations', name: 'annotations', type: 'annotations', label: 'Polígonos de Máscara' },
          { id: 'image', name: 'image', type: 'image', label: 'Imagem Passthrough' },
        ],
        params: {
          modelId: 'yolov11n-seg',
          confidenceThreshold: 0.40,
        },
      };

    case 'yolo_pose':
      return {
        id,
        type,
        category: 'ai_model',
        title: 'YOLOv11 Pose / Esqueletos',
        description: 'Detecta 17 keypoints anatômicos e esqueletos humanos',
        position,
        inputs: [
          { id: 'image', name: 'image', type: 'image', label: 'Imagem' },
        ],
        outputs: [
          { id: 'annotations', name: 'annotations', type: 'annotations', label: 'Esqueletos Pose' },
        ],
        params: {
          modelId: 'yolov11n-pose',
          confidenceThreshold: 0.50,
        },
      };

    case 'gemini_multimodal':
      return {
        id,
        type,
        category: 'ai_model',
        title: 'Google Gemini Flash LLM',
        description: 'Anotação visual multimodal ou geração textual via Gemini',
        position,
        inputs: [
          { id: 'image', name: 'image', type: 'image', label: 'Imagem (Opcional)' },
          { id: 'text', name: 'text', type: 'text', label: 'Prompt de Instrução' },
        ],
        outputs: [
          { id: 'annotations', name: 'annotations', type: 'annotations', label: 'Anotações Extraídas' },
          { id: 'text', name: 'text', type: 'text', label: 'Resposta Texto/JSON' },
        ],
        params: {
          model: 'gemini-2.5-flash-lite',
          prompt: 'Identifique todos os objetos principais na imagem e retorne as caixas delimitadoras normalizadas [ymin, xmin, ymax, xmax] e o label de cada um.',
          temperature: 0.2,
        },
      };

    // 3. CODE & SCRIPTS
    case 'custom_python_code':
      return {
        id,
        type,
        category: 'code_script',
        title: 'Python Script Node',
        description: 'Executa código Python customizado sobre anotações',
        position,
        inputs: [
          { id: 'annotations', name: 'annotations', type: 'annotations', label: 'Entrada de Anotações' },
          { id: 'json', name: 'json', type: 'json', label: 'Contexto JSON' },
        ],
        outputs: [
          { id: 'annotations', name: 'annotations', type: 'annotations', label: 'Anotações Filtradas' },
          { id: 'json', name: 'json', type: 'json', label: 'Log / Resultado' },
        ],
        params: {
          code: `# Python Transformation Node
# Input: 'annotations' (list of dicts)
# Output: assign 'result_annotations' (list of dicts)

result_annotations = []
for ann in annotations:
    # Exemplo: descartar caixas muito pequenas ou com conf < 0.3
    pts = ann.get('points', [])
    if len(pts) >= 2:
        w = abs(pts[1]['x'] - pts[0]['x'])
        h = abs(pts[1]['y'] - pts[0]['y'])
        area = w * h
        if area > 100:  # área mínima em pixels
            result_annotations.append(ann)
`,
        },
      };

    case 'custom_js_code':
      return {
        id,
        type,
        category: 'code_script',
        title: 'JavaScript Code Node',
        description: 'Transformação rápida de dados em JavaScript',
        position,
        inputs: [
          { id: 'annotations', name: 'annotations', type: 'annotations', label: 'Anotações' },
          { id: 'image', name: 'image', type: 'image', label: 'Imagem' },
        ],
        outputs: [
          { id: 'annotations', name: 'annotations', type: 'annotations', label: 'Anotações Modificadas' },
        ],
        params: {
          code: `// JavaScript Code Node
// Recebe: annotations (Array), image (Object)
// Retorne: Array de anotações resultante

return annotations.map(ann => {
  // Exemplo: aplicar prefixo nos nomes ou ajustar coordenadas
  return {
    ...ann,
    score: (ann.score || 1.0) * 1.05
  };
});`,
        },
      };

    // 4. TOOLS & FILTERS
    case 'confidence_filter':
      return {
        id,
        type,
        category: 'tool_filter',
        title: 'Filtro de Confiança',
        description: 'Remove detecções abaixo do limiar de probabilidade',
        position,
        inputs: [
          { id: 'annotations', name: 'annotations', type: 'annotations', label: 'Anotações' },
        ],
        outputs: [
          { id: 'annotations', name: 'annotations', type: 'annotations', label: 'Aprovadas' },
          { id: 'rejected', name: 'rejected', type: 'annotations', label: 'Rejeitadas' },
        ],
        params: {
          minConfidence: 0.40,
        },
      };

    case 'class_filter_remap':
      return {
        id,
        type,
        category: 'tool_filter',
        title: 'Filtro & Remapeamento de Classes',
        description: 'Filtra classes permitidas ou renomeia rótulos',
        position,
        inputs: [
          { id: 'annotations', name: 'annotations', type: 'annotations', label: 'Anotações' },
        ],
        outputs: [
          { id: 'annotations', name: 'annotations', type: 'annotations', label: 'Anotações Mapeadas' },
        ],
        params: {
          allowedClasses: ['Pessoa', 'Veículo', 'Defeito'],
          mapping: { 'person': 'Pessoa', 'car': 'Veículo', 'truck': 'Veículo' },
        },
      };

    case 'box_geometry_filter':
      return {
        id,
        type,
        category: 'tool_filter',
        title: 'Filtro Geométrico de Caixas',
        description: 'Filtra por área mínima/máxima e proporção (Aspect Ratio)',
        position,
        inputs: [
          { id: 'annotations', name: 'annotations', type: 'annotations', label: 'Anotações' },
        ],
        outputs: [
          { id: 'annotations', name: 'annotations', type: 'annotations', label: 'Caixas Válidas' },
        ],
        params: {
          minAreaPixels: 200,
          maxAreaPercentage: 95,
          minAspectRatio: 0.1,
          maxAspectRatio: 10.0,
        },
      };

    case 'nms_ensemble':
      return {
        id,
        type,
        category: 'tool_filter',
        title: 'NMS / Ensemble de Modelos',
        description: 'Funde e remove detecções duplicadas de múltiplos nós',
        position,
        inputs: [
          { id: 'annotations_a', name: 'annotations_a', type: 'annotations', label: 'Modelo A (ex: YOLO)' },
          { id: 'annotations_b', name: 'annotations_b', type: 'annotations', label: 'Modelo B (ex: Gemini)' },
        ],
        outputs: [
          { id: 'annotations', name: 'annotations', type: 'annotations', label: 'Fusão Ensemble' },
        ],
        params: {
          iouThreshold: 0.50,
          method: 'wbf', // 'nms' | 'wbf' (Weighted Boxes Fusion)
        },
      };

    // 5. AUGMENTATION
    case 'augmentation_pipe':
      return {
        id,
        type,
        category: 'augmentation',
        title: 'Pipeline de Augmentation',
        description: 'Gera variações com flip, rotação, ruído e jitter',
        position,
        inputs: [
          { id: 'image', name: 'image', type: 'image', label: 'Imagem' },
          { id: 'annotations', name: 'annotations', type: 'annotations', label: 'Anotações' },
        ],
        outputs: [
          { id: 'image', name: 'image', type: 'image', label: 'Imagens Aumentadas' },
          { id: 'annotations', name: 'annotations', type: 'annotations', label: 'Anotações Ajustadas' },
        ],
        params: {
          multiplier: 2,
          horizontalFlip: true,
          brightnessRange: [-20, 20],
          gaussianBlurProb: 0.3,
          randomNoiseProb: 0.3,
        },
      };

    // 6. VALIDATION & GATE
    case 'human_review_gate':
      return {
        id,
        type,
        category: 'validation',
        title: 'Human Review Gate',
        description: 'Envia para revisão humana se a confiança for duvidosa',
        position,
        inputs: [
          { id: 'annotations', name: 'annotations', type: 'annotations', label: 'Anotações' },
        ],
        outputs: [
          { id: 'auto_approved', name: 'auto_approved', type: 'annotations', label: 'Auto-Aprovadas (Alta Confiança)' },
          { id: 'flagged_for_human', name: 'flagged_for_human', type: 'annotations', label: 'Requer Inspeção Manual' },
        ],
        params: {
          autoApproveMinScore: 0.80,
          flagBelowScore: 0.50,
        },
      };

    // 7. OUTPUTS
    case 'save_to_dataset':
      return {
        id,
        type,
        category: 'output',
        title: 'Salvar no Dataset Ativo',
        description: 'Grava as anotações geradas diretamente no dataset aberto',
        position,
        inputs: [
          { id: 'annotations', name: 'annotations', type: 'annotations', label: 'Anotações Finais' },
          { id: 'image', name: 'image', type: 'image', label: 'Imagem (Opcional)' },
        ],
        outputs: [],
        params: {
          mergeMode: 'append', // 'append' | 'replace'
          markAsCompleted: true,
        },
      };

    case 'export_file':
      return {
        id,
        type,
        category: 'output',
        title: 'Exportar Arquivo',
        description: 'Gera arquivo de exportação no formato desejado',
        position,
        inputs: [
          { id: 'annotations', name: 'annotations', type: 'annotations', label: 'Anotações' },
        ],
        outputs: [],
        params: {
          format: 'yolo_zip', // 'yolo_zip' | 'coco_json' | 'parquet' | 'csv'
        },
      };

    default:
      return {
        id,
        type: 'dataset_source',
        category: 'input',
        title: 'Nó Genérico',
        position,
        inputs: [],
        outputs: [],
        params: {},
      };
  }
}

/**
 * Pre-built Templates Library
 */
export const PIPELINE_TEMPLATES: AnnotationPipeline[] = [
  // 1. Template: Auto-Anotação YOLOv11 + Filtro de Confiança + Salvar
  {
    id: 'tpl_yolo_filter_save',
    name: 'Auto-Anotação YOLOv11 com Filtro',
    description: 'Carrega imagem, roda YOLOv11, descarta caixas com confiança < 40% e grava no dataset.',
    domain: 'vision',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [
      createDefaultNode('dataset_source', { x: 50, y: 150 }, 'node_src'),
      createDefaultNode('yolo_detector', { x: 340, y: 150 }, 'node_yolo'),
      createDefaultNode('confidence_filter', { x: 650, y: 150 }, 'node_filter'),
      createDefaultNode('save_to_dataset', { x: 960, y: 150 }, 'node_save'),
    ],
    edges: [
      { id: 'e1', fromNodeId: 'node_src', fromPortId: 'image', toNodeId: 'node_yolo', toPortId: 'image' },
      { id: 'e2', fromNodeId: 'node_yolo', fromPortId: 'annotations', toNodeId: 'node_filter', toPortId: 'annotations' },
      { id: 'e3', fromNodeId: 'node_filter', fromPortId: 'annotations', toNodeId: 'node_save', toPortId: 'annotations' },
    ],
  },

  // 2. Template: Ensemble Multi-Modelo (YOLO + Gemini Multimodal + WBF Fusion)
  {
    id: 'tpl_multi_model_ensemble',
    name: 'Ensemble Multi-Modelo (YOLO + Gemini + WBF)',
    description: 'Executa YOLOv11 e Gemini Flash em paralelo, unindo as detecções com Weighted Boxes Fusion.',
    domain: 'vision',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [
      createDefaultNode('dataset_source', { x: 50, y: 180 }, 'node_src'),
      createDefaultNode('yolo_detector', { x: 340, y: 80 }, 'node_yolo'),
      createDefaultNode('gemini_multimodal', { x: 340, y: 300 }, 'node_gemini'),
      createDefaultNode('nms_ensemble', { x: 670, y: 180 }, 'node_ensemble'),
      createDefaultNode('save_to_dataset', { x: 980, y: 180 }, 'node_save'),
    ],
    edges: [
      { id: 'e1', fromNodeId: 'node_src', fromPortId: 'image', toNodeId: 'node_yolo', toPortId: 'image' },
      { id: 'e2', fromNodeId: 'node_src', fromPortId: 'image', toNodeId: 'node_gemini', toPortId: 'image' },
      { id: 'e3', fromNodeId: 'node_yolo', fromPortId: 'annotations', toNodeId: 'node_ensemble', toPortId: 'annotations_a' },
      { id: 'e4', fromNodeId: 'node_gemini', fromPortId: 'annotations', toNodeId: 'node_ensemble', toPortId: 'annotations_b' },
      { id: 'e5', fromNodeId: 'node_ensemble', fromPortId: 'annotations', toNodeId: 'node_save', toPortId: 'annotations' },
    ],
  },

  // 3. Template: Python Code Filter Pipeline
  {
    id: 'tpl_python_code_filter',
    name: 'Pipeline com Nó de Código Python Customizado',
    description: 'Executa YOLO e filtra anotações usando um script Python que calcula área e proporções.',
    domain: 'vision',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [
      createDefaultNode('dataset_source', { x: 50, y: 150 }, 'node_src'),
      createDefaultNode('yolo_detector', { x: 340, y: 150 }, 'node_yolo'),
      createDefaultNode('custom_python_code', { x: 650, y: 150 }, 'node_python'),
      createDefaultNode('save_to_dataset', { x: 980, y: 150 }, 'node_save'),
    ],
    edges: [
      { id: 'e1', fromNodeId: 'node_src', fromPortId: 'image', toNodeId: 'node_yolo', toPortId: 'image' },
      { id: 'e2', fromNodeId: 'node_yolo', fromPortId: 'annotations', toNodeId: 'node_python', toPortId: 'annotations' },
      { id: 'e3', fromNodeId: 'node_python', fromPortId: 'annotations', toNodeId: 'node_save', toPortId: 'annotations' },
    ],
  },

  // 4. Template: Data Augmentation Pipeline
  {
    id: 'tpl_augmentation_pipe',
    name: 'Pipeline de Augmentation & Exportação',
    description: 'Aplica transformações geométricas, ruído e brilho gerando cópias aumentadas com anotações ajustadas.',
    domain: 'vision',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [
      createDefaultNode('dataset_source', { x: 50, y: 150 }, 'node_src'),
      createDefaultNode('augmentation_pipe', { x: 380, y: 150 }, 'node_aug'),
      createDefaultNode('export_file', { x: 740, y: 150 }, 'node_export'),
    ],
    edges: [
      { id: 'e1', fromNodeId: 'node_src', fromPortId: 'image', toNodeId: 'node_aug', toPortId: 'image' },
      { id: 'e2', fromNodeId: 'node_src', fromPortId: 'annotations', toNodeId: 'node_aug', toPortId: 'annotations' },
      { id: 'e3', fromNodeId: 'node_aug', fromPortId: 'annotations', toNodeId: 'node_export', toPortId: 'annotations' },
    ],
  },
];
