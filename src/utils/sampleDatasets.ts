import { 
  DatasetProject, 
  DatasetClass, 
  DatasetImage, 
  ClassSet, 
  TextDatasetItem, 
  ReIDItem, 
  LLMDatasetItem,
  ExtractiveQAItem,
  TextToSQLItem,
  ChainOfThoughtItem,
  ToolCallItem,
  RAGRetrievalItem,
  AudioDatasetItem
} from '../types/dataset';

function createSyntheticImage(
  title: string,
  bgColor: string,
  elements: Array<{ type: 'car' | 'person' | 'sign'; x: number; y: number; color: string }>
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 800, 600);

  // Road / Floor
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 360, 800, 240);

  // Road markings
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.setLineDash([30, 20]);
  ctx.beginPath();
  ctx.moveTo(0, 480);
  ctx.lineTo(800, 480);
  ctx.stroke();
  ctx.setLineDash([]);

  // Render elements
  elements.forEach((el) => {
    ctx.fillStyle = el.color;
    if (el.type === 'car') {
      ctx.fillRect(el.x, el.y, 220, 90);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(el.x + 35, el.y - 35, 150, 40);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(el.x + 50, el.y + 90, 26, 0, Math.PI * 2);
      ctx.arc(el.x + 170, el.y + 90, 26, 0, Math.PI * 2);
      ctx.fill();
    } else if (el.type === 'person') {
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.arc(el.x + 20, el.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = el.color;
      ctx.fillRect(el.x, el.y + 16, 40, 85);
    } else if (el.type === 'sign') {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(el.x + 18, el.y + 40, 8, 120);
      ctx.fillStyle = el.color;
      ctx.beginPath();
      ctx.arc(el.x + 22, el.y + 20, 28, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Text title
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(title, 20, 35);

  return canvas.toDataURL('image/jpeg', 0.9);
}

export function createSampleDataset(): DatasetProject {
  const classesSetA: DatasetClass[] = [
    { id: 'c1', name: 'Veículo', color: '#3b82f6', shortcutKey: '1', visible: true, locked: false },
    { id: 'c2', name: 'Pedestre', color: '#10b981', shortcutKey: '2', visible: true, locked: false },
    { id: 'c3', name: 'Placa_Pare', color: '#ef4444', shortcutKey: '3', visible: true, locked: false },
    { id: 'c4', name: 'Semáforo', color: '#f59e0b', shortcutKey: '4', visible: true, locked: false },
  ];

  const classSets: ClassSet[] = [
    {
      id: 'set_standard',
      name: 'YOLOv11 Trânsito Geral',
      classes: classesSetA,
      createdAt: Date.now(),
    },
  ];

  const img1 = createSyntheticImage('Câmera_01_Avenida_Central', '#0f172a', [
    { type: 'car', x: 80, y: 380, color: '#2563eb' },
    { type: 'person', x: 420, y: 390, color: '#059669' },
    { type: 'sign', x: 700, y: 320, color: '#dc2626' },
  ]);

  const img2 = createSyntheticImage('Câmera_02_Cruzamento_Norte', '#1e1b4b', [
    { type: 'car', x: 300, y: 390, color: '#9333ea' },
    { type: 'car', x: 550, y: 370, color: '#ea580c' },
    { type: 'person', x: 120, y: 410, color: '#059669' },
  ]);

  const images: DatasetImage[] = [
    {
      id: 'img_sample_1',
      name: 'avenida_central_01.jpg',
      url: img1,
      width: 800,
      height: 600,
      annotations: [
        {
          id: 'ann_1',
          classId: 'c1',
          type: 'bbox',
          points: [
            { x: 80, y: 345 },
            { x: 300, y: 495 },
          ],
        },
        {
          id: 'ann_2',
          classId: 'c2',
          type: 'polygon',
          points: [
            { x: 420, y: 374 },
            { x: 460, y: 374 },
            { x: 460, y: 491 },
            { x: 420, y: 491 },
          ],
        },
        {
          id: 'ann_3',
          classId: 'c3',
          type: 'circle',
          points: [
            { x: 722, y: 340 },
            { x: 750, y: 340 },
          ],
        },
      ],
      tags: ['urbano', 'diurno'],
      status: 'completed',
    },
    {
      id: 'img_sample_2',
      name: 'cruzamento_norte_02.jpg',
      url: img2,
      width: 800,
      height: 600,
      annotations: [
        {
          id: 'ann_4',
          classId: 'c1',
          type: 'bbox',
          points: [
            { x: 300, y: 355 },
            { x: 520, y: 505 },
          ],
        },
      ],
      tags: ['cruzamento'],
      status: 'in_progress',
    },
  ];

  // NLP Samples
  const qaItems: ExtractiveQAItem[] = [
    {
      id: 'qa_1',
      context: 'A arquitetura Transformer foi introduzida no artigo Attention Is All You Need em 2017 por pesquisadores do Google Brain.',
      question: 'Em que ano a arquitetura Transformer foi introduzida?',
      answerStart: 66,
      answerEnd: 70,
      answerText: '2017',
    },
    {
      id: 'qa_2',
      context: 'O algoritmo YOLO processa a imagem inteira em uma única passagem para detectar caixas delimitadoras e classes simultaneamente.',
      question: 'Como o algoritmo YOLO detecta objetos?',
      answerStart: 24,
      answerEnd: 60,
      answerText: 'em uma única passagem para detectar',
    },
  ];

  const sqlItems: TextToSQLItem[] = [
    {
      id: 'sql_1',
      question: 'Quais clientes fizeram compras com valor superior a R$ 500 no mês passado?',
      databaseSchema: 'CREATE TABLE pedidos (\n  id INT,\n  cliente_id INT,\n  valor DECIMAL(10,2),\n  data_pedido DATE\n);',
      sql: 'SELECT cliente_id, SUM(valor) AS total\nFROM pedidos\nWHERE valor > 500\n  AND data_pedido >= DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH)\nGROUP BY cliente_id;',
    },
  ];

  const cotItems: ChainOfThoughtItem[] = [
    {
      id: 'cot_1',
      prompt: 'Se uma fábrica produz 120 peças por hora e funciona 8 horas por dia durante 5 dias, quantas peças são produzidas por semana?',
      thought: '1. Calculo a produção diária: 120 peças/hora * 8 horas = 960 peças por dia.\n2. Multiplico pelo número de dias da semana: 960 peças/dia * 5 dias = 4800 peças por semana.',
      response: 'A fábrica produz exatamente 4.800 peças por semana.',
      difficulty: 'easy',
    },
  ];

  const toolCallItems: ToolCallItem[] = [
    {
      id: 'tc_1',
      prompt: 'Qual o saldo atual da conta bancária 88921?',
      availableTools: [
        {
          name: 'get_account_balance',
          description: 'Consulta saldo de conta bancária por ID',
          parameters: { type: 'object', properties: { account_id: { type: 'string' } } },
        },
      ],
      chosenToolCall: { name: 'get_account_balance', arguments: { account_id: '88921' } },
      finalResponse: 'O saldo da conta bancária 88921 é de R$ 14.520,00.',
    },
  ];

  const ragItems: RAGRetrievalItem[] = [
    {
      id: 'rag_1',
      query: 'Como calcular métricas de mAP em detecção de objetos?',
      positivePassage: 'A métrica Mean Average Precision (mAP) é a média da área sob a curva Precision-Recall calculada para todas as classes em limiares de IoU (tipicamente 0.50 a 0.95).',
      negativePassages: [
        'A acurácia tradicional mede a proporção de acertos sobre o total de amostras.',
        'O gradiente descendente estocástico atualiza os pesos da rede.',
      ],
    },
  ];

  // Audio Samples
  const audioItems: AudioDatasetItem[] = [
    {
      id: 'aud_1',
      name: 'chamada_central_seguranca_01.wav',
      audioUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_ambience.ogg',
      durationSec: 8.4,
      transcription: 'Operador 1 confirmando liberação de acesso na guarita norte.',
      status: 'completed',
      diarizationSegments: [
        { id: 'd1', start: 0.0, end: 3.8, speaker: 'Operador_1', text: 'Confirmando liberação de acesso na guarita norte.' },
        { id: 'd2', start: 4.2, end: 8.0, speaker: 'Central_Segurança', text: 'Acesso liberado com sucesso.' },
      ],
      soundEvents: [
        { id: 'e1', start: 0.5, end: 2.0, event: 'voz_humana' },
        { id: 'e2', start: 3.9, end: 4.1, event: 'beep_radio' },
      ],
      alignmentWords: [
        { word: 'Operador', start: 0.0, end: 0.6 },
        { word: '1', start: 0.65, end: 0.9 },
        { word: 'confirmando', start: 0.95, end: 1.6 },
        { word: 'liberação', start: 1.65, end: 2.3 },
      ],
      label: 'Segurança_Operacional',
    },
  ];

  return {
    id: 'proj_default_vision',
    name: 'Dataset de Visão & Trânsito Urbano',
    description: 'Dataset multimodal com caixas delimitadoras, segmentação poligonal e keypoints.',
    domain: 'vision',
    taskType: 'object_detection',
    classSets,
    activeClassSetId: 'set_standard',
    classes: classesSetA,
    images,
    qaItems,
    sqlItems,
    cotItems,
    toolCallItems,
    ragItems,
    audioItems,
    activeImageId: images[0].id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function getSampleDatasets(): DatasetProject[] {
  return [createSampleDataset()];
}

