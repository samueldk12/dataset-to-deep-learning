import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Annotation, DatasetClass, DatasetImage, Point } from '../types/dataset';
import { ToolType, CanvasTransform, ImageFilters, DrawingState, ResizeHandle } from '../types/canvas';
import { 
  distance, 
  getBoundingBox, 
  isPointInsideAnnotation, 
  findNearbyVertexIndex, 
  findClosestEdge, 
  findBBoxHandle, 
  getBBoxHandles,
  computeConvexHull,
  create3DCuboid,
  CUBOID_EDGES,
  createHumanSkeleton,
  SKELETON_BONES,
  SKELETON_KEYPOINT_NAMES,
  insertVertexAtClosestEdge,
  extractMagicWandPolygon
} from '../utils/geometry';

interface CanvasProps {
  image: DatasetImage | null;
  classes: DatasetClass[];
  activeClassId: string;
  activeTool: ToolType;
  filters: ImageFilters;
  transform: CanvasTransform;
  selectedAnnotationId: string | null;
  selectedAnnotationIds?: string[];
  onTransformChange: (transform: CanvasTransform) => void;
  onSelectAnnotation: (id: string | null, multi?: boolean) => void;
  onAddAnnotation: (annotation: Annotation) => void;
  onUpdateAnnotation: (annotation: Annotation) => void;
  onDeleteAnnotation: (id: string) => void;
  onMergeAnnotations?: (ids: string[]) => void;
  onPropagateToNext?: () => void;
  onCloneFromPrevious?: () => void;
  onSelectTool?: (tool: ToolType) => void;
  onFitScreen?: () => void;
  onOpenAIModal?: () => void;
}

// Generate distinct deterministic color for instance-based coloring
function getInstanceColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 85%, 55%)`;
}

export const Canvas: React.FC<CanvasProps> = ({
  image,
  classes,
  activeClassId,
  activeTool,
  filters,
  transform,
  selectedAnnotationId,
  selectedAnnotationIds = [],
  onTransformChange,
  onSelectAnnotation,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onMergeAnnotations,
  onPropagateToNext,
  onCloneFromPrevious,
  onSelectTool,
  onFitScreen,
  onOpenAIModal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  const effectiveSelectedIds = selectedAnnotationIds.length > 0
    ? selectedAnnotationIds
    : (selectedAnnotationId ? [selectedAnnotationId] : []);

  // Drawing and interaction state
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    currentPoints: [],
    startPoint: null,
    cursorPoint: null,
    selectedAnnotationId: null,
    selectedVertexIndex: null,
    selectedHandle: null,
    isDraggingVertex: false,
    isDraggingShape: false,
    isPanning: false,
    panStart: null,
    shapeDragStart: null,
    initialShapePoints: null,
  });

  const [hoveredEdge, setHoveredEdge] = useState<{ edgeIndex: number; insertPoint: Point } | null>(null);
  const [hoveredVertex, setHoveredVertex] = useState<{ annId: string; vertexIndex: number } | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Sync selected annotation from props
  useEffect(() => {
    setDrawingState((prev) => ({
      ...prev,
      selectedAnnotationId: effectiveSelectedIds[0] || null,
      selectedVertexIndex: null,
      selectedHandle: null,
    }));
  }, [selectedAnnotationId, selectedAnnotationIds]);

  // Load image element
  useEffect(() => {
    if (!image?.url) {
      imageElementRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = image.url;
    img.onload = () => {
      imageElementRef.current = img;
      render();
    };
  }, [image?.url]);

  // Convert screen / canvas mouse coordinates to Image coordinates
  const screenToImageCoords = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const canvasX = clientX - rect.left;
      const canvasY = clientY - rect.top;

      const imgX = (canvasX - transform.offsetX) / transform.scale;
      const imgY = (canvasY - transform.offsetY) / transform.scale;

      return { x: imgX, y: imgY };
    },
    [transform]
  );

  // Keyboard Shortcuts Listener (M for Merge, Shift+D for Propagate, Delete/Backspace, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        setIsSpacePressed(true);
      }

      if (e.key === 'Escape') {
        setDrawingState((prev) => ({
          ...prev,
          isDrawing: false,
          currentPoints: [],
          startPoint: null,
        }));
      }

      // 1. Add Node / Vertex (A)
      if ((e.key === 'a' || e.key === 'A') && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        if (effectiveSelectedIds[0] && drawingState.cursorPoint && image) {
          const ann = image.annotations.find((a) => a.id === effectiveSelectedIds[0]);
          if (ann && (ann.type === 'polygon' || ann.type === 'polyline' || ann.type === 'skeleton' || ann.type === 'brush')) {
            e.preventDefault();
            const updatedPts = insertVertexAtClosestEdge(ann.points, drawingState.cursorPoint);
            onUpdateAnnotation({ ...ann, points: updatedPts });
            return;
          }
        }
        onSelectTool?.('polygon');
      }

      // 2. Clone / Paste from Previous Image (Shift+A or Shift+D)
      if (((e.key === 'a' || e.key === 'A' || e.key === 'd' || e.key === 'D') && e.shiftKey) && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (onCloneFromPrevious) onCloneFromPrevious();
        else onPropagateToNext?.();
        return;
      }

      // 3. Merge (M)
      if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        if (effectiveSelectedIds.length >= 2 && onMergeAnnotations) {
          e.preventDefault();
          onMergeAnnotations(effectiveSelectedIds);
          return;
        }
      }

      // 4. Quick Tool Selection Shortcuts (when not holding Ctrl/Alt)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        const key = e.key.toLowerCase();
        if (key === 'v') { e.preventDefault(); onSelectTool?.('select'); }
        else if (key === 'b') { e.preventDefault(); onSelectTool?.('bbox'); }
        else if (key === 'p') { e.preventDefault(); onSelectTool?.('polygon'); }
        else if (key === 'l') { e.preventDefault(); onSelectTool?.('polyline'); }
        else if (key === 'k') { e.preventDefault(); onSelectTool?.('keypoint'); }
        else if (key === 'c') { e.preventDefault(); onSelectTool?.('circle'); }
        else if (key === '3' || key === 'u') { e.preventDefault(); onSelectTool?.('cuboid3d'); }
        else if (key === 's') { e.preventDefault(); onSelectTool?.('skeleton'); }
        else if (key === 'w') { e.preventDefault(); onSelectTool?.('magic_wand'); }
        else if (key === 'e') { e.preventDefault(); onSelectTool?.('brush'); }
        else if (key === 't') { e.preventDefault(); onSelectTool?.('tag'); }
        else if (key === 'z') { e.preventDefault(); onSelectTool?.('zoom'); }
        else if (key === 'r') { e.preventDefault(); onSelectTool?.('rotate'); }
        else if (key === 'h') { e.preventDefault(); onSelectTool?.('pan'); }
        else if (key === 'f') { e.preventDefault(); onFitScreen?.(); }
        else if (key === 'i') { e.preventDefault(); onOpenAIModal?.(); }
      }

      if (e.key === 'Enter' && drawingState.isDrawing) {
        if (activeTool === 'polygon') finishPolygon(drawingState.currentPoints);
        else if (activeTool === 'polyline') finishPolyline(drawingState.currentPoints);
      }

      // 5. Delete Single Vertex or Entire Annotation (Delete / Backspace / X)
      if (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'x' || e.key === 'X') {
        const targetVertexIdx = drawingState.selectedVertexIndex !== null 
          ? drawingState.selectedVertexIndex 
          : (hoveredVertex ? hoveredVertex.vertexIndex : null);
        const targetAnnId = (drawingState.selectedVertexIndex !== null && effectiveSelectedIds[0])
          ? effectiveSelectedIds[0]
          : (hoveredVertex ? hoveredVertex.annId : null);

        if (targetVertexIdx !== null && targetAnnId && image) {
          const targetAnn = image.annotations.find((a) => a.id === targetAnnId);
          if (targetAnn && (targetAnn.type === 'polygon' || targetAnn.type === 'polyline' || targetAnn.type === 'brush')) {
            e.preventDefault();
            if (targetAnn.points.length > 3) {
              const updatedPts = targetAnn.points.filter((_, idx) => idx !== targetVertexIdx);
              onUpdateAnnotation({ ...targetAnn, points: updatedPts });
              setDrawingState((prev) => ({ ...prev, selectedVertexIndex: null }));
              setHoveredVertex(null);
              return;
            } else {
              onDeleteAnnotation(targetAnn.id);
              setDrawingState((prev) => ({ ...prev, selectedVertexIndex: null }));
              setHoveredVertex(null);
              return;
            }
          }
        }

        // Delete entire selected annotation(s)
        if (effectiveSelectedIds.length > 0) {
          e.preventDefault();
          effectiveSelectedIds.forEach((id) => onDeleteAnnotation(id));
          setDrawingState((prev) => ({ ...prev, selectedVertexIndex: null }));
          setHoveredVertex(null);
          return;
        }
      }

      if (e.altKey && (e.key === 'c' || e.key === 'C') && effectiveSelectedIds[0] && image) {
        const ann = image.annotations.find((a) => a.id === effectiveSelectedIds[0]);
        if (ann && ann.type === 'polygon') {
          const hull = computeConvexHull(ann.points);
          onUpdateAnnotation({ ...ann, points: hull });
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    drawingState,
    activeTool,
    effectiveSelectedIds,
    image,
    onSelectAnnotation,
    onDeleteAnnotation,
    onUpdateAnnotation,
    onMergeAnnotations,
    onPropagateToNext,
  ]);

  const finishPolygon = useCallback(
    (points: Point[]) => {
      if (points.length < 3) return;
      const newAnn: Annotation = {
        id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        classId: activeClassId,
        type: 'polygon',
        points: [...points],
        visible: true,
        locked: false,
        createdAt: Date.now(),
      };
      onAddAnnotation(newAnn);
      setDrawingState((prev) => ({
        ...prev,
        isDrawing: false,
        currentPoints: [],
        startPoint: null,
      }));
    },
    [activeClassId, onAddAnnotation]
  );

  const finishPolyline = useCallback(
    (points: Point[]) => {
      if (points.length < 2) return;
      const newAnn: Annotation = {
        id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        classId: activeClassId,
        type: 'polyline',
        points: [...points],
        visible: true,
        locked: false,
        createdAt: Date.now(),
      };
      onAddAnnotation(newAnn);
      setDrawingState((prev) => ({
        ...prev,
        isDrawing: false,
        currentPoints: [],
        startPoint: null,
      }));
    },
    [activeClassId, onAddAnnotation]
  );

  /* ==========================================================================
     MOUSE EVENT HANDLERS
     ========================================================================== */

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;

    // Pan canvas with middle click, Space, or Pan tool
    if (e.button === 1 || isSpacePressed || activeTool === 'pan') {
      setDrawingState((prev) => ({
        ...prev,
        isPanning: true,
        panStart: { x: e.clientX - transform.offsetX, y: e.clientY - transform.offsetY },
      }));
      return;
    }

    if (e.button !== 0) return; // Left click only

    const imgCoord = screenToImageCoords(e.clientX, e.clientY);
    if (!imgCoord || !image) return;

    const threshold = 10 / transform.scale;

    // 1. SELECT / MOVE / EDIT TOOL
    if (activeTool === 'select' || activeTool === 'move') {
      // Check if clicking existing selected shape handles or vertices
      if (effectiveSelectedIds.length > 0) {
        const selAnn = image.annotations.find((a) => a.id === effectiveSelectedIds[0]);
        if (selAnn) {
          // BBox: check handles
          if (selAnn.type === 'bbox') {
            const box = getBoundingBox(selAnn.points, 'bbox');
            const handle = findBBoxHandle(imgCoord, box, threshold);
            if (handle) {
              setDrawingState((prev) => ({
                ...prev,
                selectedHandle: handle,
                isDraggingShape: false,
                isDraggingVertex: false,
                shapeDragStart: imgCoord,
                initialShapePoints: [...selAnn.points],
              }));
              return;
            }
          }

          // Polygon / Polyline vertex
          if (selAnn.type === 'polygon' || selAnn.type === 'polyline') {
            const vIdx = findNearbyVertexIndex(imgCoord, selAnn.points, threshold);
            if (vIdx !== -1) {
              setDrawingState((prev) => ({
                ...prev,
                selectedVertexIndex: vIdx,
                isDraggingVertex: true,
                isDraggingShape: false,
              }));
              return;
            }
          }
        }
      }

      // Check if clicking on any annotation on canvas
      const hit = [...image.annotations].reverse().find((a) => 
        a.visible !== false && !a.locked && isPointInsideAnnotation(imgCoord, a, threshold)
      );

      if (hit) {
        onSelectAnnotation(hit.id, isMultiSelect);
        setDrawingState((prev) => ({
          ...prev,
          selectedAnnotationId: hit.id,
          selectedVertexIndex: null,
          selectedHandle: null,
          isDraggingShape: true,
          shapeDragStart: imgCoord,
          initialShapePoints: hit.points.map((p) => ({ ...p })),
        }));
      } else {
        if (!isMultiSelect) {
          onSelectAnnotation(null);
        }
        setDrawingState((prev) => ({
          ...prev,
          selectedAnnotationId: null,
          selectedVertexIndex: null,
          selectedHandle: null,
        }));
      }
      return;
    }

    // 2. POLYGON TOOL
    if (activeTool === 'polygon') {
      if (!drawingState.isDrawing) {
        setDrawingState((prev) => ({
          ...prev,
          isDrawing: true,
          currentPoints: [imgCoord],
          startPoint: imgCoord,
          cursorPoint: imgCoord,
        }));
      } else {
        const start = drawingState.currentPoints[0];
        const snapDist = 14 / transform.scale;
        if (drawingState.currentPoints.length >= 3 && distance(imgCoord, start) <= snapDist) {
          finishPolygon(drawingState.currentPoints);
        } else {
          setDrawingState((prev) => ({
            ...prev,
            currentPoints: [...prev.currentPoints, imgCoord],
          }));
        }
      }
      return;
    }

    // 3. POLYLINE TOOL
    if (activeTool === 'polyline') {
      if (!drawingState.isDrawing) {
        setDrawingState((prev) => ({
          ...prev,
          isDrawing: true,
          currentPoints: [imgCoord],
          startPoint: imgCoord,
          cursorPoint: imgCoord,
        }));
      } else {
        setDrawingState((prev) => ({
          ...prev,
          currentPoints: [...prev.currentPoints, imgCoord],
        }));
      }
      return;
    }

    // 4. BOUNDING BOX TOOL / CUBOID 3D
    if (activeTool === 'bbox' || activeTool === 'cuboid3d') {
      setDrawingState((prev) => ({
        ...prev,
        isDrawing: true,
        startPoint: imgCoord,
        cursorPoint: imgCoord,
        currentPoints: [imgCoord],
      }));
      return;
    }

    // 5. CIRCLE TOOL
    if (activeTool === 'circle') {
      setDrawingState((prev) => ({
        ...prev,
        isDrawing: true,
        startPoint: imgCoord,
        cursorPoint: imgCoord,
        currentPoints: [imgCoord],
      }));
      return;
    }

    // 6. KEYPOINT TOOL
    if (activeTool === 'keypoint') {
      const newAnn: Annotation = {
        id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        classId: activeClassId,
        type: 'keypoint',
        points: [imgCoord],
        visible: true,
        locked: false,
        createdAt: Date.now(),
      };
      onAddAnnotation(newAnn);
      return;
    }

    // 7. HUMAN SKELETON TOOL (17 Anatomical Landmarks)
    if (activeTool === 'skeleton') {
      const skeletonPts = createHumanSkeleton(imgCoord, 180);
      const newAnn: Annotation = {
        id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        classId: activeClassId,
        type: 'skeleton',
        points: skeletonPts,
        visible: true,
        locked: false,
        createdAt: Date.now(),
      };
      onAddAnnotation(newAnn);
      return;
    }

    // 8. MAGIC WAND (Flood Fill & Auto-Contour)
    if (activeTool === 'magic_wand') {
      const imgElem = imageElementRef.current;
      if (imgElem && imgElem.complete && imgElem.naturalWidth > 0) {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = image.width || imgElem.naturalWidth;
        offCanvas.height = image.height || imgElem.naturalHeight;
        const offCtx = offCanvas.getContext('2d');
        if (offCtx) {
          offCtx.drawImage(imgElem, 0, 0, offCanvas.width, offCanvas.height);
          const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
          const contourPts = extractMagicWandPolygon(imgData, imgCoord.x, imgCoord.y, 35);
          if (contourPts.length >= 3) {
            const newAnn: Annotation = {
              id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              classId: activeClassId,
              type: 'polygon',
              points: contourPts,
              visible: true,
              locked: false,
              createdAt: Date.now(),
            };
            onAddAnnotation(newAnn);
          }
        }
      }
      return;
    }

    // 9. BRUSH TOOL (Continuous Stroke Painting)
    if (activeTool === 'brush') {
      setDrawingState((prev) => ({
        ...prev,
        isDrawing: true,
        startPoint: imgCoord,
        cursorPoint: imgCoord,
        currentPoints: [imgCoord],
      }));
      return;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawingState.isPanning && drawingState.panStart) {
      onTransformChange({
        ...transform,
        offsetX: e.clientX - drawingState.panStart.x,
        offsetY: e.clientY - drawingState.panStart.y,
      });
      return;
    }

    const imgCoord = screenToImageCoords(e.clientX, e.clientY);
    if (!imgCoord || !image) return;

    setDrawingState((prev) => ({ ...prev, cursorPoint: imgCoord }));

    // Continuous brush stroke accumulation
    if (activeTool === 'brush' && drawingState.isDrawing) {
      setDrawingState((prev) => ({
        ...prev,
        currentPoints: [...prev.currentPoints, imgCoord],
      }));
      return;
    }

    const threshold = 10 / transform.scale;

    // Handle vertex drag
    if (drawingState.isDraggingVertex && effectiveSelectedIds[0] && drawingState.selectedVertexIndex !== null) {
      const ann = image.annotations.find((a) => a.id === effectiveSelectedIds[0]);
      if (ann) {
        const newPoints = [...ann.points];
        newPoints[drawingState.selectedVertexIndex] = imgCoord;
        onUpdateAnnotation({ ...ann, points: newPoints });
      }
      return;
    }

    // Handle shape translation drag
    if (drawingState.isDraggingShape && effectiveSelectedIds[0] && drawingState.shapeDragStart && drawingState.initialShapePoints) {
      const dx = imgCoord.x - drawingState.shapeDragStart.x;
      const dy = imgCoord.y - drawingState.shapeDragStart.y;
      const ann = image.annotations.find((a) => a.id === effectiveSelectedIds[0]);
      if (ann) {
        const translatedPoints = drawingState.initialShapePoints.map((p) => ({
          x: p.x + dx,
          y: p.y + dy,
        }));
        onUpdateAnnotation({ ...ann, points: translatedPoints });
      }
      return;
    }

    // Check vertex hover
    if (activeTool === 'select' && !drawingState.isDrawing) {
      let foundVertex: { annId: string; vertexIndex: number } | null = null;
      for (const ann of image.annotations) {
        if (ann.visible === false || ann.locked) continue;
        const vIdx = findNearbyVertexIndex(imgCoord, ann.points, threshold);
        if (vIdx !== -1) {
          foundVertex = { annId: ann.id, vertexIndex: vIdx };
          break;
        }
      }
      setHoveredVertex(foundVertex);
    }
  };

  const handleMouseUp = () => {
    if (drawingState.isPanning) {
      setDrawingState((prev) => ({ ...prev, isPanning: false, panStart: null }));
      return;
    }

    if (drawingState.isDraggingVertex || drawingState.isDraggingShape || drawingState.selectedHandle) {
      setDrawingState((prev) => ({
        ...prev,
        isDraggingVertex: false,
        isDraggingShape: false,
        selectedHandle: null,
        shapeDragStart: null,
        initialShapePoints: null,
      }));
      return;
    }

    // Finish 3D Cuboid
    if (drawingState.isDrawing && activeTool === 'cuboid3d' && drawingState.startPoint && drawingState.cursorPoint) {
      const p1 = drawingState.startPoint;
      const p2 = drawingState.cursorPoint;
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);

      if (w > 6 && h > 6) {
        const cuboidPts = create3DCuboid(p1, p2);
        const newAnn: Annotation = {
          id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          classId: activeClassId,
          type: 'cuboid3d',
          points: cuboidPts,
          visible: true,
          locked: false,
          createdAt: Date.now(),
        };
        onAddAnnotation(newAnn);
      }

      setDrawingState((prev) => ({
        ...prev,
        isDrawing: false,
        startPoint: null,
        currentPoints: [],
      }));
      return;
    }

    // Finish BBox
    if (drawingState.isDrawing && activeTool === 'bbox' && drawingState.startPoint && drawingState.cursorPoint) {
      const p1 = drawingState.startPoint;
      const p2 = drawingState.cursorPoint;
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);

      if (w > 4 && h > 4) {
        const newAnn: Annotation = {
          id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          classId: activeClassId,
          type: 'bbox',
          points: [
            { x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y) },
            { x: Math.max(p1.x, p2.x), y: Math.max(p1.y, p2.y) },
          ],
          visible: true,
          locked: false,
          createdAt: Date.now(),
        };
        onAddAnnotation(newAnn);
      }

      setDrawingState((prev) => ({
        ...prev,
        isDrawing: false,
        startPoint: null,
        currentPoints: [],
      }));
      return;
    }

    // Finish Brush
    if (drawingState.isDrawing && activeTool === 'brush' && drawingState.currentPoints.length > 2) {
      const hullPts = computeConvexHull(drawingState.currentPoints);
      if (hullPts.length >= 3) {
        const newAnn: Annotation = {
          id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          classId: activeClassId,
          type: 'brush',
          points: hullPts,
          visible: true,
          locked: false,
          createdAt: Date.now(),
        };
        onAddAnnotation(newAnn);
      }

      setDrawingState((prev) => ({
        ...prev,
        isDrawing: false,
        startPoint: null,
        currentPoints: [],
      }));
      return;
    }

    // Finish Circle
    if (drawingState.isDrawing && activeTool === 'circle' && drawingState.startPoint && drawingState.cursorPoint) {
      const r = distance(drawingState.startPoint, drawingState.cursorPoint);
      if (r > 4) {
        const newAnn: Annotation = {
          id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          classId: activeClassId,
          type: 'circle',
          points: [drawingState.startPoint, drawingState.cursorPoint],
          visible: true,
          locked: false,
          createdAt: Date.now(),
        };
        onAddAnnotation(newAnn);
      }

      setDrawingState((prev) => ({
        ...prev,
        isDrawing: false,
        startPoint: null,
        currentPoints: [],
      }));
      return;
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawingState.isDrawing && activeTool === 'polygon') {
      finishPolygon(drawingState.currentPoints);
      return;
    }
    if (drawingState.isDrawing && activeTool === 'polyline') {
      finishPolyline(drawingState.currentPoints);
      return;
    }

    // Double-click on a vertex deletes that vertex
    const imgCoord = screenToImageCoords(e.clientX, e.clientY);
    if (imgCoord && image) {
      const threshold = 12 / transform.scale;
      for (const ann of image.annotations) {
        if (ann.visible === false || ann.locked) continue;
        if (ann.type === 'polygon' || ann.type === 'polyline' || ann.type === 'brush') {
          const vIdx = findNearbyVertexIndex(imgCoord, ann.points, threshold);
          if (vIdx !== -1) {
            if (ann.points.length > 3) {
              const updatedPts = ann.points.filter((_, idx) => idx !== vIdx);
              onUpdateAnnotation({ ...ann, points: updatedPts });
              setDrawingState((prev) => ({ ...prev, selectedVertexIndex: null }));
              setHoveredVertex(null);
            } else {
              onDeleteAnnotation(ann.id);
            }
            return;
          }
        }
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newScale = Math.max(0.1, Math.min(25, transform.scale * zoomFactor));

    const newOffsetX = mouseX - (mouseX - transform.offsetX) * (newScale / transform.scale);
    const newOffsetY = mouseY - (mouseY - transform.offsetY) * (newScale / transform.scale);

    onTransformChange({
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    });
  };

  /* ==========================================================================
     CANVAS RENDERING ENGINE
     ========================================================================== */

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 800;
    const height = canvas.parentElement?.clientHeight || 600;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    ctx.translate(transform.offsetX, transform.offsetY);
    ctx.scale(transform.scale, transform.scale);

    // 1. Draw Image with Visual Filters
    const imgElement = imageElementRef.current;
    if (imgElement && imgElement.complete && imgElement.naturalWidth > 0) {
      ctx.save();
      const filterParts: string[] = [];
      if (filters.brightness !== 100) filterParts.push(`brightness(${filters.brightness}%)`);
      if (filters.contrast !== 100) filterParts.push(`contrast(${filters.contrast}%)`);
      if (filters.saturation !== 100) filterParts.push(`saturate(${filters.saturation}%)`);
      if (filters.invert) filterParts.push(`invert(100%)`);
      if (filterParts.length > 0) ctx.filter = filterParts.join(' ');

      ctx.drawImage(imgElement, 0, 0, image?.width || imgElement.naturalWidth, image?.height || imgElement.naturalHeight);
      ctx.restore();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1 / transform.scale;
      ctx.strokeRect(0, 0, image?.width || imgElement.naturalWidth, image?.height || imgElement.naturalHeight);
    }

    // 2. Draw Grid
    if (filters.showGrid && image) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1 / transform.scale;
      const gridSize = 50;
      for (let x = 0; x <= image.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, image.height); ctx.stroke();
      }
      for (let y = 0; y <= image.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(image.width, y); ctx.stroke();
      }
      ctx.restore();
    }

    const classMap = new Map<string, DatasetClass>(classes.map((c) => [c.id, c]));

    // 3. Render Annotations with Appearance Panel Rules
    if (image?.annotations) {
      image.annotations.forEach((ann) => {
        if (ann.visible === false) return;
        const cls = classMap.get(ann.classId) || { name: 'Desconhecido', color: '#3b82f6', visible: true, locked: false, id: '' };
        if (!cls.visible) return;

        const isSelected = effectiveSelectedIds.includes(ann.id);
        drawAnnotation(ctx, ann, cls, isSelected, filters, transform.scale, hoveredVertex);

        // Draw Projections if enabled
        if (filters.showProjections && image) {
          const box = getBoundingBox(ann.points, ann.type);
          ctx.save();
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
          ctx.lineWidth = 1 / transform.scale;
          ctx.setLineDash([3 / transform.scale, 3 / transform.scale]);

          // Vertical projections
          ctx.beginPath();
          ctx.moveTo(box.x, 0); ctx.lineTo(box.x, image.height);
          ctx.moveTo(box.x + box.width, 0); ctx.lineTo(box.x + box.width, image.height);
          // Horizontal projections
          ctx.moveTo(0, box.y); ctx.lineTo(image.width, box.y);
          ctx.moveTo(0, box.y + box.height); ctx.lineTo(image.width, box.y + box.height);
          ctx.stroke();
          ctx.restore();
        }
      });
    }

    // 4. Render Active In-Progress Shape
    if (drawingState.isDrawing) {
      const activeClass = classes.find((c) => c.id === activeClassId) || {
        name: 'Ativo',
        color: '#3b82f6',
        visible: true,
        locked: false,
        id: activeClassId,
      };

      drawInProgressShape(ctx, activeTool, drawingState, activeClass, transform.scale);
    }

    // 5. Draw Crosshair Cursor
    if (filters.showCrosshair && drawingState.cursorPoint && image) {
      ctx.save();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 1 / transform.scale;
      ctx.setLineDash([4 / transform.scale, 4 / transform.scale]);
      
      ctx.beginPath();
      ctx.moveTo(0, drawingState.cursorPoint.y);
      ctx.lineTo(image.width, drawingState.cursorPoint.y);
      ctx.moveTo(drawingState.cursorPoint.x, 0);
      ctx.lineTo(drawingState.cursorPoint.x, image.height);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }, [
    image,
    classes,
    activeClassId,
    activeTool,
    filters,
    transform,
    effectiveSelectedIds,
    drawingState,
    hoveredVertex,
  ]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => render());
    observer.observe(container);
    return () => observer.disconnect();
  }, [render]);

  let cursorClass = 'cursor-crosshair';
  if (isSpacePressed || activeTool === 'pan') cursorClass = 'cursor-grab active:cursor-grabbing';
  else if (drawingState.isDraggingVertex || drawingState.isDraggingShape) cursorClass = 'cursor-move';
  else if (hoveredVertex) cursorClass = 'cursor-pointer';

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden checkerboard-pattern select-none ${cursorClass}`}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        className="absolute inset-0 block"
      />

      {/* Floating coordinates badge */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur border border-slate-800 text-xs font-mono text-slate-300 shadow-xl pointer-events-none">
        <span className="text-blue-400 font-semibold">{Math.round(transform.scale * 100)}%</span>
        <span className="text-slate-600">|</span>
        <span>X: {drawingState.cursorPoint ? Math.round(drawingState.cursorPoint.x) : 0}px</span>
        <span>Y: {drawingState.cursorPoint ? Math.round(drawingState.cursorPoint.y) : 0}px</span>
        {effectiveSelectedIds.length > 1 && (
          <>
            <span className="text-slate-600">|</span>
            <span className="text-purple-400 font-semibold">{effectiveSelectedIds.length} selecionadas (Pressione M para mesclar)</span>
          </>
        )}
      </div>
    </div>
  );
};

/* ==========================================================================
   CANVAS RENDERING HELPERS (Appearance Engine)
   ========================================================================== */

function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  ann: Annotation,
  cls: DatasetClass,
  isSelected: boolean,
  filters: ImageFilters,
  scale: number,
  hoveredVertex: { annId: string; vertexIndex: number } | null
) {
  // Determine color based on Color By mode (Label / Instance / Group)
  let color = cls.color || '#3b82f6';
  if (filters.colorBy === 'instance') {
    color = getInstanceColor(ann.id);
  }

  const strokeWidth = (filters.strokeWidth || 2) / scale;
  const currentOpacity = isSelected 
    ? (filters.selectedOpacity ?? 0.65) 
    : (filters.annotationOpacity ?? 0.35);

  const opacityHex = Math.round(Math.max(0, Math.min(1, currentOpacity)) * 255)
    .toString(16)
    .padStart(2, '0');
  const fillColor = `${color}${opacityHex}`;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = fillColor;
  ctx.lineWidth = strokeWidth;

  if (isSelected) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 10 / scale;
  }

  // 1. POLYGON
  if (ann.type === 'polygon' && ann.points.length >= 3) {
    ctx.beginPath();
    ctx.moveTo(ann.points[0].x, ann.points[0].y);
    for (let i = 1; i < ann.points.length; i++) {
      ctx.lineTo(ann.points[i].x, ann.points[i].y);
    }
    ctx.closePath();
    ctx.fill();
    if (filters.outlinedBorders !== false) ctx.stroke();

    ann.points.forEach((p, idx) => {
      const isVertexHovered = hoveredVertex?.annId === ann.id && hoveredVertex?.vertexIndex === idx;
      ctx.fillStyle = isVertexHovered ? '#10b981' : (isSelected ? '#ffffff' : color);
      ctx.strokeStyle = isVertexHovered ? '#ffffff' : color;
      ctx.lineWidth = (isVertexHovered ? 3 : 2) / scale;
      ctx.beginPath();
      const r = (isVertexHovered ? 7 : (isSelected ? 5.5 : 4)) / scale;
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  // 2. BOUNDING BOX
  if (ann.type === 'bbox' && ann.points.length >= 2) {
    const box = getBoundingBox(ann.points, 'bbox');
    ctx.fillRect(box.x, box.y, box.width, box.height);
    if (filters.outlinedBorders !== false) ctx.strokeRect(box.x, box.y, box.width, box.height);

    if (isSelected) {
      const handles = getBBoxHandles(box);
      Object.values(handles).forEach((h) => {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 / scale;
        ctx.beginPath();
        ctx.arc(h.x, h.y, 5 / scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }
  }

  // 3. 3D ISOMETRIC CUBOID
  if (ann.type === 'cuboid3d' && ann.points.length >= 8) {
    const pts = ann.points;
    // Front face (0, 1, 2, 3)
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.lineTo(pts[3].x, pts[3].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Back face (4, 5, 6, 7) - dashed
    ctx.save();
    ctx.setLineDash([4 / scale, 4 / scale]);
    ctx.beginPath();
    ctx.moveTo(pts[4].x, pts[4].y);
    ctx.lineTo(pts[5].x, pts[5].y);
    ctx.lineTo(pts[6].x, pts[6].y);
    ctx.lineTo(pts[7].x, pts[7].y);
    ctx.closePath();
    ctx.stroke();

    // Depth connecting edges
    CUBOID_EDGES.slice(8).forEach(([i, j]) => {
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[j].x, pts[j].y);
      ctx.stroke();
    });
    ctx.restore();

    // 8 Draggable Corner Handles
    pts.forEach((p, idx) => {
      const isHovered = hoveredVertex?.annId === ann.id && hoveredVertex?.vertexIndex === idx;
      ctx.fillStyle = idx < 4 ? '#ffffff' : '#38bdf8';
      ctx.strokeStyle = isHovered ? '#10b981' : color;
      ctx.lineWidth = 2 / scale;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (isHovered ? 6.5 : (isSelected ? 5 : 3.5)) / scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  // 4. HUMAN ANATOMICAL SKELETON (17 Landmarks & Bones)
  if (ann.type === 'skeleton' && ann.points.length >= 17) {
    const pts = ann.points;

    // Draw Bones
    ctx.save();
    ctx.lineWidth = (strokeWidth * 1.5);
    SKELETON_BONES.forEach(([i, j], boneIdx) => {
      if (pts[i] && pts[j]) {
        // Anatomical bone coloring (Limbs left: Amber, Limbs right: Cyan, Spine/Head: Emerald)
        let boneColor = '#10b981';
        if ([5, 7, 11, 13].includes(i)) boneColor = '#f59e0b';
        else if ([6, 8, 12, 14].includes(i)) boneColor = '#06b6d4';

        ctx.strokeStyle = isSelected ? color : boneColor;
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[j].x, pts[j].y);
        ctx.stroke();
      }
    });
    ctx.restore();

    // Draw 17 Joint Handles
    pts.forEach((p, idx) => {
      const isHovered = hoveredVertex?.annId === ann.id && hoveredVertex?.vertexIndex === idx;
      ctx.fillStyle = isHovered ? '#ffffff' : (idx === 0 ? '#ef4444' : color);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5 / scale;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (isHovered ? 7 : (isSelected ? 5.5 : 4)) / scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  // 5. KEYPOINT
  if (ann.type === 'keypoint' && ann.points.length > 0) {
    const p = ann.points[0];
    const isHovered = hoveredVertex?.annId === ann.id;

    ctx.fillStyle = isHovered ? '#10b981' : color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, (isHovered ? 8 : (isSelected ? 7 : 5)) / scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 / scale;
    ctx.stroke();
  }

  // 6. POLYLINE
  if (ann.type === 'polyline' && ann.points.length >= 2) {
    ctx.beginPath();
    ctx.moveTo(ann.points[0].x, ann.points[0].y);
    for (let i = 1; i < ann.points.length; i++) {
      ctx.lineTo(ann.points[i].x, ann.points[i].y);
    }
    ctx.stroke();
  }

  // 7. BRUSH MASK / CONTINUOUS CONTOUR
  if (ann.type === 'brush' && ann.points.length >= 3) {
    ctx.beginPath();
    ctx.moveTo(ann.points[0].x, ann.points[0].y);
    for (let i = 1; i < ann.points.length; i++) {
      ctx.lineTo(ann.points[i].x, ann.points[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 8. CIRCLE
  if (ann.type === 'circle' && ann.points.length >= 2) {
    const center = ann.points[0];
    const r = distance(ann.points[0], ann.points[1]);
    ctx.beginPath();
    ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
    ctx.fill();
    if (filters.outlinedBorders !== false) ctx.stroke();
  }

  // 9. LABEL BADGE
  if (filters.showLabels) {
    const box = getBoundingBox(ann.points, ann.type);
    drawLabelBadge(ctx, cls.name, box.x, box.y, color, scale);
  }

  ctx.restore();
}

function drawLabelBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  scale: number
) {
  ctx.save();
  const fontSize = Math.max(10, Math.min(14, 12 / scale));
  ctx.font = `600 ${fontSize}px Inter, sans-serif`;
  const textWidth = ctx.measureText(text).width;
  const padX = 6 / scale;
  const padY = 3 / scale;
  const badgeHeight = fontSize + padY * 2;
  const badgeWidth = textWidth + padX * 2;
  const badgeY = y - badgeHeight - (2 / scale);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, badgeY, badgeWidth, badgeHeight, 3 / scale);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x + padX, badgeY + fontSize);
  ctx.restore();
}

function drawInProgressShape(
  ctx: CanvasRenderingContext2D,
  tool: ToolType,
  state: DrawingState,
  cls: DatasetClass,
  scale: number
) {
  const color = cls.color || '#3b82f6';
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = `${color}40`;
  ctx.lineWidth = 2 / scale;
  ctx.setLineDash([4 / scale, 4 / scale]);

  if (tool === 'cuboid3d' && state.startPoint && state.cursorPoint) {
    const cuboidPts = create3DCuboid(state.startPoint, state.cursorPoint);
    // Front face
    ctx.beginPath();
    ctx.moveTo(cuboidPts[0].x, cuboidPts[0].y);
    ctx.lineTo(cuboidPts[1].x, cuboidPts[1].y);
    ctx.lineTo(cuboidPts[2].x, cuboidPts[2].y);
    ctx.lineTo(cuboidPts[3].x, cuboidPts[3].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Back face
    ctx.beginPath();
    ctx.moveTo(cuboidPts[4].x, cuboidPts[4].y);
    ctx.lineTo(cuboidPts[5].x, cuboidPts[5].y);
    ctx.lineTo(cuboidPts[6].x, cuboidPts[6].y);
    ctx.lineTo(cuboidPts[7].x, cuboidPts[7].y);
    ctx.closePath();
    ctx.stroke();
    // Connecting edges
    CUBOID_EDGES.slice(8).forEach(([i, j]) => {
      ctx.beginPath();
      ctx.moveTo(cuboidPts[i].x, cuboidPts[i].y);
      ctx.lineTo(cuboidPts[j].x, cuboidPts[j].y);
      ctx.stroke();
    });
  } else if (tool === 'bbox' && state.startPoint && state.cursorPoint) {
    const x = Math.min(state.startPoint.x, state.cursorPoint.x);
    const y = Math.min(state.startPoint.y, state.cursorPoint.y);
    const w = Math.abs(state.cursorPoint.x - state.startPoint.x);
    const h = Math.abs(state.cursorPoint.y - state.startPoint.y);
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  } else if (tool === 'circle' && state.startPoint && state.cursorPoint) {
    const r = distance(state.startPoint, state.cursorPoint);
    ctx.beginPath();
    ctx.arc(state.startPoint.x, state.startPoint.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (tool === 'brush' && state.currentPoints.length > 0) {
    ctx.fillStyle = `${color}60`;
    state.currentPoints.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 14 / scale, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if ((tool === 'polygon' || tool === 'polyline') && state.currentPoints.length > 0) {
    ctx.beginPath();
    ctx.moveTo(state.currentPoints[0].x, state.currentPoints[0].y);
    for (let i = 1; i < state.currentPoints.length; i++) {
      ctx.lineTo(state.currentPoints[i].x, state.currentPoints[i].y);
    }
    if (state.cursorPoint) ctx.lineTo(state.cursorPoint.x, state.cursorPoint.y);
    if (tool === 'polygon') {
      ctx.closePath();
      ctx.fill();
    }
    ctx.stroke();
  }

  ctx.restore();
}
