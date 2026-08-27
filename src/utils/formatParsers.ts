import { Annotation, DatasetClass, DatasetImage, DatasetProject, Point } from '../types/dataset';
import { getBoundingBox, calculatePolygonArea } from './geometry';

export type YOLOVersion = 'v11' | 'v8' | 'v9' | 'v10' | 'v5' | 'v7' | 'darknet';
export type YOLOTask = 'detection' | 'segmentation' | 'pose' | 'classification';

/* ==========================================================================
   COCO FORMAT
   ========================================================================== */

export interface COCODataset {
  info?: {
    description?: string;
    version?: string;
    year?: number;
    date_created?: string;
  };
  licenses?: Array<{ id: number; name: string; url?: string }>;
  images: Array<{
    id: number | string;
    file_name: string;
    width: number;
    height: number;
  }>;
  annotations: Array<{
    id: number | string;
    image_id: number | string;
    category_id: number | string;
    segmentation?: number[][];
    area?: number;
    bbox?: [number, number, number, number]; // [x, y, width, height]
    iscrowd?: number;
    keypoints?: number[];
  }>;
  categories: Array<{
    id: number | string;
    name: string;
    supercategory?: string;
    color?: string;
  }>;
}

export function exportToCOCO(project: DatasetProject): COCODataset {
  const categories = project.classes.map((cls, index) => ({
    id: index + 1,
    name: cls.name,
    supercategory: 'object',
    color: cls.color,
  }));

  const classIdToCocoId = new Map<string, number>();
  project.classes.forEach((cls, index) => {
    classIdToCocoId.set(cls.id, index + 1);
  });

  const images: COCODataset['images'] = [];
  const annotations: COCODataset['annotations'] = [];
  let annCounter = 1;

  project.images.forEach((img, imgIndex) => {
    const imageId = imgIndex + 1;
    images.push({
      id: imageId,
      file_name: img.name,
      width: img.width,
      height: img.height,
    });

    img.annotations.forEach((ann) => {
      const cocoCategoryId = classIdToCocoId.get(ann.classId) || 1;
      const box = getBoundingBox(ann.points, ann.type);
      const area = ann.type === 'polygon' 
        ? calculatePolygonArea(ann.points) 
        : (box.width * box.height);

      let segmentation: number[][] | undefined = undefined;
      let keypoints: number[] | undefined = undefined;

      if (ann.type === 'polygon' && ann.points.length >= 3) {
        const segPoints: number[] = [];
        ann.points.forEach((p) => {
          segPoints.push(Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100);
        });
        segmentation = [segPoints];
      } else if (ann.type === 'keypoint' && ann.points.length > 0) {
        keypoints = [ann.points[0].x, ann.points[0].y, 2];
      }

      annotations.push({
        id: annCounter++,
        image_id: imageId,
        category_id: cocoCategoryId,
        segmentation: segmentation,
        area: Math.round(area * 100) / 100,
        bbox: [
          Math.round(box.x * 100) / 100,
          Math.round(box.y * 100) / 100,
          Math.round(box.width * 100) / 100,
          Math.round(box.height * 100) / 100,
        ],
        iscrowd: 0,
        ...(keypoints ? { keypoints } : {}),
      });
    });
  });

  return {
    info: {
      description: project.name || 'AnnotateX Dataset Export',
      version: '1.0',
      year: new Date().getFullYear(),
      date_created: new Date().toISOString(),
    },
    images,
    annotations,
    categories,
  };
}

export function parseCOCO(
  cocoJson: COCODataset, 
  existingClasses: DatasetClass[] = []
): { classes: DatasetClass[]; imagesWithAnnotations: Map<string, Annotation[]> } {
  const classes: DatasetClass[] = [...existingClasses];
  const catIdToClassId = new Map<string | number, string>();

  cocoJson.categories.forEach((cat, idx) => {
    let existing = classes.find((c) => c.name.toLowerCase() === cat.name.toLowerCase());
    if (!existing) {
      existing = {
        id: `cls_${Date.now()}_${idx}`,
        name: cat.name,
        color: cat.color || getRandomColor(classes.length),
        visible: true,
        locked: false,
        shortcutKey: String((classes.length % 9) + 1),
      };
      classes.push(existing);
    }
    catIdToClassId.set(cat.id, existing.id);
  });

  const imgIdToFileName = new Map<string | number, string>();
  cocoJson.images.forEach((img) => {
    imgIdToFileName.set(img.id, img.file_name);
  });

  const imagesWithAnnotations = new Map<string, Annotation[]>();

  cocoJson.annotations.forEach((ann) => {
    const fileName = imgIdToFileName.get(ann.image_id);
    if (!fileName) return;

    const classId = catIdToClassId.get(ann.category_id) || classes[0]?.id || 'cls_default';
    let annotationObj: Annotation | null = null;

    if (ann.segmentation && Array.isArray(ann.segmentation) && ann.segmentation.length > 0 && ann.segmentation[0].length >= 6) {
      const flat = ann.segmentation[0];
      const points: Point[] = [];
      for (let i = 0; i < flat.length; i += 2) {
        points.push({ x: flat[i], y: flat[i + 1] });
      }
      annotationObj = {
        id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        classId,
        type: 'polygon',
        points,
        visible: true,
        locked: false,
      };
    } else if (ann.keypoints && ann.keypoints.length >= 2) {
      annotationObj = {
        id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        classId,
        type: 'keypoint',
        points: [{ x: ann.keypoints[0], y: ann.keypoints[1] }],
        visible: true,
        locked: false,
      };
    } else if (ann.bbox && ann.bbox.length === 4) {
      const [x, y, w, h] = ann.bbox;
      annotationObj = {
        id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        classId,
        type: 'bbox',
        points: [
          { x, y },
          { x: x + w, y: y + h },
        ],
        visible: true,
        locked: false,
      };
    }

    if (annotationObj) {
      if (!imagesWithAnnotations.has(fileName)) {
        imagesWithAnnotations.set(fileName, []);
      }
      imagesWithAnnotations.get(fileName)!.push(annotationObj);
    }
  });

  return { classes, imagesWithAnnotations };
}

/* ==========================================================================
   YOLO FORMAT & VERSIONS (v11, v8, v9, v10, v5, v7, Darknet)
   ========================================================================== */

export function exportImageToYOLO(
  image: DatasetImage,
  classMap: Map<string, number>,
  task: YOLOTask = 'detection',
  version: YOLOVersion = 'v11'
): string {
  const lines: string[] = [];
  const { width, height } = image;
  if (!width || !height) return '';

  image.annotations.forEach((ann) => {
    const classIdx = classMap.get(ann.classId) ?? 0;

    // 1. Instance Segmentation (v8-seg, v11-seg)
    if (task === 'segmentation' && ann.type === 'polygon' && ann.points.length >= 3) {
      const normalizedCoords = ann.points
        .map((p) => `${(p.x / width).toFixed(6)} ${(p.y / height).toFixed(6)}`)
        .join(' ');
      lines.push(`${classIdx} ${normalizedCoords}`);
    } 
    // 2. Pose / Keypoint (v8-pose, v11-pose)
    else if (task === 'pose' && ann.type === 'keypoint' && ann.points.length > 0) {
      const p = ann.points[0];
      const normX = (p.x / width).toFixed(6);
      const normY = (p.y / height).toFixed(6);
      // Pose format: class_id x_center y_center width height kx1 ky1 v1
      lines.push(`${classIdx} ${normX} ${normY} 0.020000 0.020000 ${normX} ${normY} 2`);
    } 
    // 3. Object Detection (BBox default)
    else {
      const box = getBoundingBox(ann.points, ann.type);
      const xCenter = (box.x + box.width / 2) / width;
      const yCenter = (box.y + box.height / 2) / height;
      const normWidth = box.width / width;
      const normHeight = box.height / height;

      lines.push(
        `${classIdx} ${xCenter.toFixed(6)} ${yCenter.toFixed(6)} ${normWidth.toFixed(6)} ${normHeight.toFixed(6)}`
      );
    }
  });

  return lines.join('\n');
}

export function parseYOLOLine(
  line: string,
  imgWidth: number,
  imgHeight: number,
  classes: DatasetClass[]
): Annotation | null {
  const parts = line.trim().split(/\s+/).map(Number);
  if (parts.length < 5 || isNaN(parts[0])) return null;

  const classIdx = parts[0];
  const targetClass = classes[classIdx] || classes[0];
  const classId = targetClass ? targetClass.id : 'cls_0';

  if (parts.length === 5) {
    const [, xcNorm, ycNorm, wNorm, hNorm] = parts;
    const xc = xcNorm * imgWidth;
    const yc = ycNorm * imgHeight;
    const w = wNorm * imgWidth;
    const h = hNorm * imgHeight;
    const x1 = xc - w / 2;
    const y1 = yc - h / 2;
    const x2 = xc + w / 2;
    const y2 = yc + h / 2;

    return {
      id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      classId,
      type: 'bbox',
      points: [
        { x: x1, y: y1 },
        { x: x2, y: y2 },
      ],
      visible: true,
      locked: false,
    };
  } else if (parts.length > 5 && parts.length % 2 === 1) {
    const points: Point[] = [];
    for (let i = 1; i < parts.length; i += 2) {
      points.push({
        x: parts[i] * imgWidth,
        y: parts[i + 1] * imgHeight,
      });
    }

    return {
      id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      classId,
      type: 'polygon',
      points,
      visible: true,
      locked: false,
    };
  }

  return null;
}

export function generateYOLODataYaml(
  project: DatasetProject,
  version: YOLOVersion = 'v11',
  task: YOLOTask = 'detection',
  hasSplit = true
): string {
  const classNames = project.classes.map((c) => `  ${project.classes.indexOf(c)}: ${c.name}`).join('\n');
  const nc = project.classes.length;

  if (version === 'darknet') {
    return `# Darknet obj.data configuration
classes = ${nc}
train = data/train.txt
valid = data/val.txt
names = data/obj.names
backup = backup/
`;
  }

  return `# YOLO ${version.toUpperCase()} (${task.toUpperCase()}) Dataset Config generated by AnnotateX Studio
path: .
${hasSplit ? 'train: images/train\nval: images/val\ntest: images/test' : 'train: images/\nval: images/'}

nc: ${nc}
names:
${classNames}
`;
}

export function generateConfigYaml(
  project: DatasetProject,
  version: YOLOVersion = 'v11',
  task: YOLOTask = 'detection'
): string {
  const classList = project.classes
    .map((c, idx) => `  - id: ${idx}\n    name: "${c.name}"\n    color: "${c.color}"`)
    .join('\n');
  const classNamesDict = project.classes
    .map((c, idx) => `  ${idx}: "${c.name}"`)
    .join('\n');

  return `# ==============================================================================
# AnnotateX Studio - Unified Dataset Configuration (config.yaml)
# Generated: ${new Date().toISOString()}
# ==============================================================================

project_id: "${project.id}"
project_name: "${project.name.replace(/"/g, '\\"')}"
domain: "${project.domain || 'vision'}"
task_type: "${project.taskType || task}"
yolo_version: "${version}"

# Dataset Splits & Paths
path: .
train: images/
val: images/
test: images/

# Classes & Taxonomy
nc: ${project.classes.length}
names:
${classNamesDict}

classes_detailed:
${classList}

# Default Training Hyperparameters (Recommended)
training_hyperparameters:
  imgsz: 640
  epochs: 100
  batch: 16
  lr0: 0.01
  lrf: 0.01
  momentum: 0.937
  weight_decay: 0.0005
  warmup_epochs: 3.0
  optimizer: "auto"
  augment: true
  mosaic: 1.0
  mixup: 0.1
`;
}

export function generateClassesTxt(classes: DatasetClass[]): string {
  return classes.map((c) => c.name).join('\n');
}

/* ==========================================================================
   PASCAL VOC FORMAT (XML)
   ========================================================================== */

export function exportImageToPascalVOC(image: DatasetImage, classes: DatasetClass[]): string {
  const classLookup = new Map<string, string>(classes.map((c) => [c.id, c.name]));

  const objectsXml = image.annotations
    .map((ann) => {
      const className = classLookup.get(ann.classId) || 'object';
      const box = getBoundingBox(ann.points, ann.type);
      const xmin = Math.max(1, Math.round(box.x));
      const ymin = Math.max(1, Math.round(box.y));
      const xmax = Math.min(image.width, Math.round(box.x + box.width));
      const ymax = Math.min(image.height, Math.round(box.y + box.height));

      return `  <object>
    <name>${escapeXml(className)}</name>
    <pose>Unspecified</pose>
    <truncated>0</truncated>
    <difficult>0</difficult>
    <bndbox>
      <xmin>${xmin}</xmin>
      <ymin>${ymin}</ymin>
      <xmax>${xmax}</xmax>
      <ymax>${ymax}</ymax>
    </bndbox>
  </object>`;
    })
    .join('\n');

  return `<annotation>
  <folder>images</folder>
  <filename>${escapeXml(image.name)}</filename>
  <path>${escapeXml(image.name)}</path>
  <source>
    <database>AnnotateX Database</database>
  </source>
  <size>
    <width>${image.width}</width>
    <height>${image.height}</height>
    <depth>3</depth>
  </size>
  <segmented>0</segmented>
${objectsXml}
</annotation>`;
}

export function parsePascalVOC(
  xmlString: string,
  existingClasses: DatasetClass[] = []
): { fileName: string; width: number; height: number; annotations: Annotation[]; updatedClasses: DatasetClass[] } {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  const classes = [...existingClasses];

  const fileName = xmlDoc.getElementsByTagName('filename')[0]?.textContent || 'unknown.jpg';
  const width = parseInt(xmlDoc.getElementsByTagName('width')[0]?.textContent || '0', 10);
  const height = parseInt(xmlDoc.getElementsByTagName('height')[0]?.textContent || '0', 10);

  const annotations: Annotation[] = [];
  const objectNodes = xmlDoc.getElementsByTagName('object');

  for (let i = 0; i < objectNodes.length; i++) {
    const node = objectNodes[i];
    const name = node.getElementsByTagName('name')[0]?.textContent || 'object';
    const bndbox = node.getElementsByTagName('bndbox')[0];
    if (!bndbox) continue;

    let targetClass = classes.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (!targetClass) {
      targetClass = {
        id: `cls_${Date.now()}_${classes.length}`,
        name,
        color: getRandomColor(classes.length),
        visible: true,
        locked: false,
        shortcutKey: String((classes.length % 9) + 1),
      };
      classes.push(targetClass);
    }

    const xmin = parseFloat(bndbox.getElementsByTagName('xmin')[0]?.textContent || '0');
    const ymin = parseFloat(bndbox.getElementsByTagName('ymin')[0]?.textContent || '0');
    const xmax = parseFloat(bndbox.getElementsByTagName('xmax')[0]?.textContent || '0');
    const ymax = parseFloat(bndbox.getElementsByTagName('ymax')[0]?.textContent || '0');

    annotations.push({
      id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      classId: targetClass.id,
      type: 'bbox',
      points: [
        { x: xmin, y: ymin },
        { x: xmax, y: ymax },
      ],
      visible: true,
      locked: false,
    });
  }

  return { fileName, width, height, annotations, updatedClasses: classes };
}

/* ==========================================================================
   CSV EXPORT
   ========================================================================== */

export function exportToCSV(project: DatasetProject): string {
  const rows: string[] = [];
  rows.push('filename,image_width,image_height,class_name,annotation_type,x_min,y_min,x_max,y_max,points_json,image_tags');

  const classLookup = new Map<string, string>(project.classes.map((c) => [c.id, c.name]));

  project.images.forEach((img) => {
    const tagsString = `"${img.tags.join(';')}"`;

    if (img.annotations.length === 0) {
      rows.push(`"${img.name}",${img.width},${img.height},"","","","","","","",${tagsString}`);
      return;
    }

    img.annotations.forEach((ann) => {
      const clsName = classLookup.get(ann.classId) || 'unknown';
      const box = getBoundingBox(ann.points, ann.type);
      const pointsJson = `"${JSON.stringify(ann.points).replace(/"/g, '""')}"`;
      rows.push(
        `"${img.name}",${img.width},${img.height},"${clsName}","${ann.type}",${box.x.toFixed(2)},${box.y.toFixed(2)},${(box.x + box.width).toFixed(2)},${(box.y + box.height).toFixed(2)},${pointsJson},${tagsString}`
      );
    });
  });

  return rows.join('\n');
}

/* ==========================================================================
   HELPERS & PALETTE
   ========================================================================== */

const PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', 
  '#14b8a6', '#a855f7', '#eab308', '#84cc16',
];

export function getRandomColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
