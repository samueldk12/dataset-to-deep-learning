import { Point } from './dataset';

export type ToolType = 
  | 'select' 
  | 'bbox' 
  | 'polygon' 
  | 'keypoint' 
  | 'polyline' 
  | 'circle' 
  | 'pan';

export interface CanvasTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface ImageFilters {
  brightness: number; // 0 to 200 (100 is normal)
  contrast: number;   // 0 to 200 (100 is normal)
  saturation: number; // 0 to 200 (100 is normal)
  invert: boolean;
  showGrid: boolean;
  showCrosshair: boolean;
  annotationOpacity: number; // 0 to 1 (e.g. 0.35)
  strokeWidth: number;       // 1 to 5 (e.g. 2)
  showLabels: boolean;
  showPoints: boolean;
}

export interface DrawingState {
  isDrawing: boolean;
  currentPoints: Point[];
  startPoint: Point | null;
  cursorPoint: Point | null;
  selectedAnnotationId: string | null;
  selectedVertexIndex: number | null;
  selectedHandle: ResizeHandle | null;
  isDraggingVertex: boolean;
  isDraggingShape: boolean;
  isPanning: boolean;
  panStart: Point | null;
  shapeDragStart: Point | null;
  initialShapePoints: Point[] | null;
}
