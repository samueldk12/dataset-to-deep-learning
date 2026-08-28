import { describe, it, expect } from 'vitest';
import { 
  createDefaultNode, 
  PIPELINE_TEMPLATES 
} from '../utils/pipelineTemplates';
import { 
  getTopologicalExecutionOrder, 
  executePipeline 
} from '../utils/pipelineEngine';
import { 
  AnnotationPipeline, 
  PipelineNode, 
  PipelineEdge 
} from '../types/pipeline';
import { createSampleDataset } from '../utils/sampleDatasets';
import { Annotation } from '../types/dataset';

describe('Pipeline Studio - Node Factory & Templates', () => {
  it('creates all standard node types with expected ports and categories', () => {
    const nodeTypes = [
      'dataset_source',
      'yolo_detector',
      'yolo_segmentation',
      'yolo_pose',
      'gemini_multimodal',
      'custom_python_code',
      'custom_js_code',
      'confidence_filter',
      'class_filter_remap',
      'box_geometry_filter',
      'nms_ensemble',
      'augmentation_pipe',
      'save_to_dataset',
      'export_file',
    ] as const;

    nodeTypes.forEach((type) => {
      const node = createDefaultNode(type, { x: 100, y: 100 });
      expect(node.id).toBeDefined();
      expect(node.type).toBe(type);
      expect(Array.isArray(node.inputs)).toBe(true);
      expect(Array.isArray(node.outputs)).toBe(true);
      expect(node.category).toBeDefined();
    });
  });

  it('validates pre-built pipeline templates', () => {
    expect(PIPELINE_TEMPLATES.length).toBeGreaterThanOrEqual(4);

    PIPELINE_TEMPLATES.forEach((tpl) => {
      expect(tpl.id).toBeDefined();
      expect(tpl.name).toBeDefined();
      expect(tpl.nodes.length).toBeGreaterThan(0);
      expect(tpl.edges.length).toBeGreaterThan(0);

      // Verify all edges connect to existing nodes
      const nodeIds = new Set(tpl.nodes.map((n) => n.id));
      tpl.edges.forEach((edge) => {
        expect(nodeIds.has(edge.fromNodeId)).toBe(true);
        expect(nodeIds.has(edge.toNodeId)).toBe(true);
      });
    });
  });
});

describe('Pipeline Studio - Topological Sorting & Execution Order', () => {
  it('correctly sorts graph dependencies in topological order', () => {
    const nodes: PipelineNode[] = [
      createDefaultNode('dataset_source', { x: 0, y: 0 }, 'n_src'),
      createDefaultNode('yolo_detector', { x: 200, y: 0 }, 'n_ai'),
      createDefaultNode('confidence_filter', { x: 400, y: 0 }, 'n_filt'),
      createDefaultNode('save_to_dataset', { x: 600, y: 0 }, 'n_save'),
    ];

    const edges: PipelineEdge[] = [
      { id: 'e1', fromNodeId: 'n_src', fromPortId: 'image', toNodeId: 'n_ai', toPortId: 'image' },
      { id: 'e2', fromNodeId: 'n_ai', fromPortId: 'annotations', toNodeId: 'n_filt', toPortId: 'annotations' },
      { id: 'e3', fromNodeId: 'n_filt', fromPortId: 'annotations', toNodeId: 'n_save', toPortId: 'annotations' },
    ];

    const sorted = getTopologicalExecutionOrder(nodes, edges);
    const sortedIds = sorted.map((n) => n.id);

    expect(sortedIds).toEqual(['n_src', 'n_ai', 'n_filt', 'n_save']);
  });
});

describe('Pipeline Studio - Graph Execution Engine', () => {
  it('executes YOLO + Confidence Filter + Save pipeline', async () => {
    const project = createSampleDataset();
    const tpl = PIPELINE_TEMPLATES[0]; // Auto-Anotação YOLOv11 com Filtro

    const progressSteps: string[] = [];
    const result = await executePipeline(tpl, {
      project,
      activeImage: project.images[0],
      onProgress: (p, step) => progressSteps.push(step),
    });

    expect(result.success).toBe(true);
    expect(result.executedNodeCount).toBe(4);
    expect(progressSteps.length).toBeGreaterThan(0);
    expect(result.finalAnnotations).toBeDefined();
  });

  it('executes custom JavaScript code node transformations', async () => {
    const project = createSampleDataset();

    const customPipe: AnnotationPipeline = {
      id: 'pipe_test_js',
      name: 'Test JS Script',
      description: 'JS test',
      domain: 'vision',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: [
        createDefaultNode('dataset_source', { x: 0, y: 0 }, 'n_src'),
        {
          ...createDefaultNode('custom_js_code', { x: 200, y: 0 }, 'n_js'),
          params: {
            code: `return annotations.map(a => ({ ...a, score: 0.99, customTag: 'tested' }));`,
          },
        },
      ],
      edges: [
        { id: 'e1', fromNodeId: 'n_src', fromPortId: 'annotations', toNodeId: 'n_js', toPortId: 'annotations' },
      ],
    };

    const result = await executePipeline(customPipe, {
      project,
      activeImage: project.images[0],
    });

    expect(result.success).toBe(true);
    expect(result.finalAnnotations).toBeDefined();
    if (result.finalAnnotations && result.finalAnnotations.length > 0) {
      expect(result.finalAnnotations[0].score).toBe(0.99);
      expect((result.finalAnnotations[0] as any).customTag).toBe('tested');
    }
  });

  it('executes Box Geometry Filter and filters out small bounding boxes', async () => {
    const project = createSampleDataset();

    // Create a mock image with 1 large box and 1 tiny box
    const testImage = {
      ...project.images[0],
      annotations: [
        {
          id: 'large_box',
          classId: 'c1',
          type: 'bbox' as const,
          points: [{ x: 10, y: 10 }, { x: 200, y: 200 }], // 190x190 = 36100 px
          score: 0.9,
          visible: true,
          locked: false,
          createdAt: Date.now(),
        },
        {
          id: 'tiny_box',
          classId: 'c1',
          type: 'bbox' as const,
          points: [{ x: 10, y: 10 }, { x: 15, y: 15 }], // 5x5 = 25 px (below 200px)
          score: 0.9,
          visible: true,
          locked: false,
          createdAt: Date.now(),
        },
      ],
    };

    const geomPipe: AnnotationPipeline = {
      id: 'pipe_test_geom',
      name: 'Test Geometry Filter',
      description: 'Filter test',
      domain: 'vision',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: [
        createDefaultNode('dataset_source', { x: 0, y: 0 }, 'n_src'),
        {
          ...createDefaultNode('box_geometry_filter', { x: 200, y: 0 }, 'n_geom'),
          params: { minAreaPixels: 200, minAspectRatio: 0.1, maxAspectRatio: 10.0 },
        },
      ],
      edges: [
        { id: 'e1', fromNodeId: 'n_src', fromPortId: 'annotations', toNodeId: 'n_geom', toPortId: 'annotations' },
      ],
    };

    const result = await executePipeline(geomPipe, {
      project,
      activeImage: testImage,
    });

    expect(result.success).toBe(true);
    expect(result.finalAnnotations?.length).toBe(1);
    expect(result.finalAnnotations?.[0].id).toBe('large_box');
  });

  it('executes NMS Ensemble and merges overlapping bounding boxes', async () => {
    const project = createSampleDataset();

    const boxA: Annotation = {
      id: 'box_a',
      classId: 'c1',
      type: 'bbox',
      points: [{ x: 100, y: 100 }, { x: 200, y: 200 }],
      score: 0.8,
      visible: true,
      locked: false,
      createdAt: Date.now(),
    };

    const boxB: Annotation = {
      id: 'box_b',
      classId: 'c1',
      type: 'bbox',
      points: [{ x: 105, y: 102 }, { x: 202, y: 198 }], // Almost identical box
      score: 0.9,
      visible: true,
      locked: false,
      createdAt: Date.now(),
    };

    const ensembleNode = createDefaultNode('nms_ensemble', { x: 200, y: 0 }, 'n_ens');
    ensembleNode.params.iouThreshold = 0.5;

    const ensemblePipe: AnnotationPipeline = {
      id: 'pipe_test_ensemble',
      name: 'Test Ensemble',
      description: 'Ensemble test',
      domain: 'vision',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: [
        createDefaultNode('dataset_source', { x: 0, y: 0 }, 'n_src'),
        ensembleNode,
      ],
      edges: [
        { id: 'e1', fromNodeId: 'n_src', fromPortId: 'annotations', toNodeId: 'n_ens', toPortId: 'annotations_a' },
      ],
    };

    const testImg = {
      ...project.images[0],
      annotations: [boxA, boxB],
    };

    const result = await executePipeline(ensemblePipe, {
      project,
      activeImage: testImg,
    });

    expect(result.success).toBe(true);
    // 2 overlapping boxes should fuse into 1 merged box
    expect(result.finalAnnotations?.length).toBe(1);
  });
});
