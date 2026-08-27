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
  });

  describe('Pascal VOC XML Format', () => {
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
