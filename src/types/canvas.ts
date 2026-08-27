import { Point } from './dataset';

export type ToolType = 
  | 'select' 
  | 'move'
  | 'rotate'
  | 'zoom'
  | 'magic_wand'
  | 'bbox' 
  | 'polygon' 
  | 'polyline' 
  | 'keypoint' 
  | 'circle' 
  | 'cuboid3d'
  | 'skeleton'
  | 'brush'
  | 'tag'
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
  
  // Appearance Panel (CVAT / Label Studio style)
  colorBy: 'label' | 'instance' | 'group';
  annotationOpacity: number; // 0 to 1 (e.g. 0.35)
  selectedOpacity: number;   // 0 to 1 (e.g. 0.65)
  outlinedBorders: boolean;
  borderColor?: string;
  strokeWidth: number;       // 1 to 5 (e.g. 2)
  showBitmap: boolean;
  showProjections: boolean;  // Projections on X/Y axes
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
