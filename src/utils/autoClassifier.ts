import { Annotation, DatasetClass, DatasetImage, Point } from '../types/dataset';
import { getBoundingBox, calculatePolygonArea } from './geometry';

// In-memory annotation clipboard for cross-image copy-pasting
let annotationClipboard: Annotation[] = [];

export function copyAnnotationsToClipboard(annotations: Annotation[]) {
  annotationClipboard = annotations.map((ann) => ({
    ...ann,
    id: `ann_copy_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    createdAt: Date.now(),
  }));
}

export function getAnnotationClipboard(): Annotation[] {
  return annotationClipboard.map((ann) => ({
    ...ann,
    id: `ann_pasted_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    createdAt: Date.now(),
  }));
}

export function hasAnnotationClipboard(): boolean {
  return annotationClipboard.length > 0;
}

/**
 * Auto-classifies an annotation using geometric heuristics (aspect ratio, area, vertex count).
 */
export function autoClassifyAnnotation(
  ann: Annotation,
  availableClasses: DatasetClass[],
  imageWidth = 1280,
  imageHeight = 720
): string {
  if (!availableClasses || availableClasses.length === 0) return ann.classId;

  const box = getBoundingBox(ann.points, ann.type);
  const aspectRatio = box.height > 0 ? box.width / box.height : 1.0;
  const relArea = (box.width * box.height) / (imageWidth * imageHeight);

  const lowerClassNames = availableClasses.map((c) => ({
    id: c.id,
    name: c.name.toLowerCase(),
  }));

  // Heuristic matching rules:
  // 1. Tall and narrow -> Person / Pedestrian
  if (aspectRatio < 0.65 && relArea < 0.3) {
    const personCls = lowerClassNames.find(c => 
      c.name.includes('person') || c.name.includes('pessoa') || c.name.includes('pedestre') || c.name.includes('pedestrian')
    );
    if (personCls) return personCls.id;
  }

  // 2. Wide rectangle -> Car / Vehicle / Truck
  if (aspectRatio >= 1.1 && aspectRatio <= 2.8 && relArea > 0.02) {
    const carCls = lowerClassNames.find(c => 
      c.name.includes('car') || c.name.includes('carro') || c.name.includes('veiculo') || c.name.includes('truck') || c.name.includes('caminhao')
    );
    if (carCls) return carCls.id;
  }

  // 3. Very small square / compact -> Traffic light / Sign / Ball
  if (relArea < 0.015 && aspectRatio >= 0.7 && aspectRatio <= 1.4) {
    const signCls = lowerClassNames.find(c => 
      c.name.includes('sign') || c.name.includes('placa') || c.name.includes('semaforo') || c.name.includes('light') || c.name.includes('traffic')
    );
    if (signCls) return signCls.id;
  }

  // 4. Large background coverage -> Background / Building / Road
  if (relArea > 0.35) {
    const bgCls = lowerClassNames.find(c => 
      c.name.includes('building') || c.name.includes('predio') || c.name.includes('road') || c.name.includes('rua') || c.name.includes('background')
    );
    if (bgCls) return bgCls.id;
  }

  // Default: retain current or return first available class
  return ann.classId || availableClasses[0].id;
}

/**
 * Propagates annotations from current image to the next image.
 */
export function propagateAnnotationsToTargetImage(
  sourceAnnotations: Annotation[],
  targetImage: DatasetImage
): DatasetImage {
  const clonedAnnotations: Annotation[] = sourceAnnotations.map((ann) => ({
    ...ann,
    id: `ann_prop_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    createdAt: Date.now(),
  }));

  return {
    ...targetImage,
    annotations: [...targetImage.annotations, ...clonedAnnotations],
    status: clonedAnnotations.length > 0 ? 'completed' : targetImage.status,
  };
}
