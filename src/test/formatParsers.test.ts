import { describe, it, expect } from 'vitest';
import {
  exportImageToYOLO,
  parseYOLOLine,
  generateYOLODataYaml,
  exportToCOCO,
  parseCOCO,
  exportImageToPascalVOC,
  parsePascalVOC,
  exportToCSV,
} from '../utils/formatParsers';
import { DatasetClass, DatasetImage, DatasetProject } from '../types/dataset';

describe('Format Parsers & Exporters (Unit Tests)', () => {
  const sampleClasses: DatasetClass[] = [
    { id: 'cls_car', name: 'Car', color: '#3b82f6', shortcutKey: '1', visible: true, locked: false },
    { id: 'cls_ped', name: 'Pedestrian', color: '#10b981', shortcutKey: '2', visible: true, locked: false },
  ];

  const sampleImage: DatasetImage = {
    id: 'img_01',
    name: 'test_image.jpg',
    url: 'data:image/jpeg;base64,mock',
    width: 800,
    height: 600,
    annotations: [
      {
        id: 'ann_1',
        classId: 'cls_car',
        type: 'bbox',
        points: [
          { x: 100, y: 150 },
          { x: 300, y: 350 },
        ],
        visible: true,
        locked: false,
      },
      {
        id: 'ann_2',
        classId: 'cls_ped',
        type: 'polygon',
        points: [
          { x: 400, y: 200 },
          { x: 450, y: 200 },
          { x: 450, y: 400 },
          { x: 400, y: 400 },
        ],
        visible: true,
        locked: false,
      },
      {
        id: 'ann_3',
        classId: 'cls_ped',
        type: 'keypoint',
        points: [{ x: 500, y: 250 }],
        visible: true,
        locked: false,
      },
    ],
    tags: ['outdoor', 'sunny'],
    status: 'completed',
  };

  const sampleProject: DatasetProject = {
    id: 'proj_1',
    name: 'Autonomous Driving Demo',
    description: 'Test Dataset',
    domain: 'vision',
    taskType: 'object_detection',
    classSets: [{ id: 'c1', name: 'Main', classes: sampleClasses, createdAt: Date.now() }],
    activeClassSetId: 'c1',
    classes: sampleClasses,
    images: [sampleImage],
    activeImageId: 'img_01',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  describe('YOLO Export & Parsing', () => {
    const classMap = new Map<string, number>([
      ['cls_car', 0],
      ['cls_ped', 1],
    ]);

    it('exports YOLO Bounding Box format correctly (normalized coordinates)', () => {
      const yoloTxt = exportImageToYOLO(sampleImage, classMap, 'detection', 'v11');
      const lines = yoloTxt.split('\n');

      expect(lines.length).toBe(3);
      const parts = lines[0].split(' ');
      expect(parts[0]).toBe('0');
      expect(parseFloat(parts[1])).toBeCloseTo(0.25);
      expect(parseFloat(parts[2])).toBeCloseTo(0.416667);
      expect(parseFloat(parts[3])).toBeCloseTo(0.25);
      expect(parseFloat(parts[4])).toBeCloseTo(0.333333);
    });

    it('exports YOLO Segmentation polygon normalized coordinates', () => {
      const yoloTxt = exportImageToYOLO(sampleImage, classMap, 'segmentation', 'v11');
      const lines = yoloTxt.split('\n');

      const segParts = lines[1].split(' ');
      expect(segParts[0]).toBe('1');
      expect(parseFloat(segParts[1])).toBeCloseTo(400 / 800);
      expect(parseFloat(segParts[2])).toBeCloseTo(200 / 600);
    });

    it('exports YOLO Pose keypoint coordinates', () => {
      const yoloTxt = exportImageToYOLO(sampleImage, classMap, 'pose', 'v11');
      const lines = yoloTxt.split('\n');

      const poseParts = lines[2].split(' ');
      expect(poseParts[0]).toBe('1');
      expect(parseFloat(poseParts[1])).toBeCloseTo(500 / 800);
      expect(parseFloat(poseParts[2])).toBeCloseTo(250 / 600);
    });

    it('parses YOLO BBox line back into internal Annotation structure', () => {
      const line = '0 0.250000 0.416667 0.250000 0.333333';
      const ann = parseYOLOLine(line, 800, 600, sampleClasses);
      expect(ann).not.toBeNull();
      expect(ann?.type).toBe('bbox');
      expect(ann?.classId).toBe('cls_car');
      expect(ann?.points[0].x).toBeCloseTo(100);
      expect(ann?.points[0].y).toBeCloseTo(150);
      expect(ann?.points[1].x).toBeCloseTo(300);
      expect(ann?.points[1].y).toBeCloseTo(350);
    });

    it('generates YOLO data.yaml with train/val paths and class names', () => {
      const yaml = generateYOLODataYaml(sampleProject, 'v11', 'detection', true);
      expect(yaml).toContain('train: images/train');
      expect(yaml).toContain('nc: 2');
      expect(yaml).toContain('0: Car');
      expect(yaml).toContain('1: Pedestrian');
    });

    it('parses a YOLO prediction line with a trailing confidence score', () => {
      // Common real-world format: class x_center y_center width height confidence
      const line = '0 0.250000 0.416667 0.250000 0.333333 0.87';
      const ann = parseYOLOLine(line, 800, 600, sampleClasses);
      expect(ann).not.toBeNull();
      expect(ann?.type).toBe('bbox');
      expect(ann?.classId).toBe('cls_car');
      expect(ann?.points[0].x).toBeCloseTo(100);
      expect(ann?.points[1].x).toBeCloseTo(300);
    });

    it('keeps a mismatched/out-of-range class index visible instead of silently relabeling it as class 0', () => {
      // Only 2 classes exist (indices 0-1), but this line references index 7 --
      // e.g. a labels file exported against a different, larger classes.txt.
      const line = '7 0.5 0.5 0.2 0.2';
      const ann = parseYOLOLine(line, 800, 600, sampleClasses);
      expect(ann).not.toBeNull();
      expect(ann?.classId).not.toBe('cls_car'); // must NOT silently become class 0's id
      expect(ann?.classId).toContain('7');
    });

    it('generates YOLO Darknet obj.data configuration', () => {
      const darknet = generateYOLODataYaml(sampleProject, 'darknet', 'detection', false);
      expect(darknet).toContain('classes = 2');
      expect(darknet).toContain('train = data/train.txt');
      expect(darknet).toContain('names = data/obj.names');
    });
  });

  describe('COCO 1.0 JSON Format', () => {
    it('exports project to standard COCO format', () => {
      const coco = exportToCOCO(sampleProject);
      expect(coco.images.length).toBe(1);
      expect(coco.categories.length).toBe(2);
      expect(coco.annotations.length).toBe(3);
      expect(coco.categories[0].name).toBe('Car');
    });

    it('parses COCO JSON correctly', () => {
      const coco = exportToCOCO(sampleProject);
      const parsed = parseCOCO(coco);
      expect(parsed.classes.length).toBe(2);
      expect(parsed.imagesWithAnnotations.has('test_image.jpg')).toBe(true);
      expect(parsed.imagesWithAnnotations.get('test_image.jpg')?.length).toBe(3);
    });

    it('exports skeleton (pose) annotations as COCO keypoints instead of dropping them', () => {
      const skeletonImage: DatasetImage = {
        ...sampleImage,
        id: 'img_pose',
        name: 'pose_image.jpg',
        annotations: [
          {
            id: 'ann_skeleton',
            classId: 'cls_ped',
            type: 'skeleton',
            points: [
              { x: 10, y: 10 }, { x: 12, y: 8 }, { x: 8, y: 8 },
              { x: 0, y: 0 }, // unlabeled/occluded joint -> should be marked not-visible
            ],
            visible: true,
            locked: false,
          },
        ],
      };
      const project: DatasetProject = { ...sampleProject, images: [skeletonImage] };
      const coco = exportToCOCO(project);

      expect(coco.annotations.length).toBe(1);
      const ann = coco.annotations[0];
      expect(ann.keypoints).toBeDefined();
      expect(ann.keypoints!.length).toBe(4 * 3); // x, y, visibility per point
      expect(ann.num_keypoints).toBe(3); // the (0,0) point is treated as not visible
      expect(ann.keypoints![9]).toBe(0);
      expect(ann.keypoints![10]).toBe(0);
      expect(ann.keypoints![11]).toBe(0); // visibility flag for the (0,0) point
    });
  });

  describe('Pascal VOC XML Format', () => {
    it('never emits a zero-width/zero-height box for a tiny annotation at the image edge', () => {
      const tinyEdgeImage: DatasetImage = {
        ...sampleImage,
        annotations: [
          {
            id: 'ann_tiny',
            classId: 'cls_car',
            type: 'bbox',
            points: [{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }],
            visible: true,
            locked: false,
          },
        ],
      };
      const xml = exportImageToPascalVOC(tinyEdgeImage, sampleClasses);
      const xmin = Number(xml.match(/<xmin>(\d+)<\/xmin>/)?.[1]);
      const xmax = Number(xml.match(/<xmax>(\d+)<\/xmax>/)?.[1]);
      const ymin = Number(xml.match(/<ymin>(\d+)<\/ymin>/)?.[1]);
      const ymax = Number(xml.match(/<ymax>(\d+)<\/ymax>/)?.[1]);
      expect(xmax).toBeGreaterThan(xmin);
      expect(ymax).toBeGreaterThan(ymin);
    });

    it('exports image to Pascal VOC XML', () => {
      const xml = exportImageToPascalVOC(sampleImage, sampleClasses);
      expect(xml).toContain('<filename>test_image.jpg</filename>');
      expect(xml).toContain('<name>Car</name>');
      expect(xml).toContain('<xmin>100</xmin>');
      expect(xml).toContain('<ymin>150</ymin>');
    });

    it('parses Pascal VOC XML correctly', () => {
      const xml = exportImageToPascalVOC(sampleImage, sampleClasses);
      const parsed = parsePascalVOC(xml, sampleClasses);
      expect(parsed.fileName).toBe('test_image.jpg');
      expect(parsed.annotations.length).toBe(3);
    });
  });

  describe('CSV Export', () => {
    it('exports tabular annotation rows with coordinates and tags', () => {
      const csv = exportToCSV(sampleProject);
      const rows = csv.split('\n');
      expect(rows[0]).toContain('filename,image_width,image_height,class_name');
      expect(rows[1]).toContain('test_image.jpg');
      expect(rows[1]).toContain('Car');
      expect(rows[1]).toContain('outdoor;sunny');
    });
  });
});
