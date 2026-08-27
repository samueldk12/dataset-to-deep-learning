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
  computeConvexHull 
} from '../utils/geometry';

interface CanvasProps {
  image: DatasetImage | null;
  classes: DatasetClass[];
  activeClassId: string;
  activeTool: ToolType;
  filters: ImageFilters;
  transform: CanvasTransform;
  selectedAnnotationId: string | null;
  onTransformChange: (transform: CanvasTransform) => void;
  onSelectAnnotation: (id: string | null) => void;
  onAddAnnotation: (annotation: Annotation) => void;
  onUpdateAnnotation: (annotation: Annotation) => void;
  onDeleteAnnotation: (id: string) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  image,
  classes,
  activeClassId,
  activeTool,
  filters,
  transform,
  selectedAnnotationId,
  onTransformChange,
  onSelectAnnotation,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

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
      selectedAnnotationId,
      selectedVertexIndex: null,
      selectedHandle: null,
    }));
  }, [selectedAnnotationId]);

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

  // Fit image to canvas viewport
  const fitToScreen = useCallback(() => {
    if (!image || !containerRef.current) return;
    const container = containerRef.current;
    const padding = 40;
    const availWidth = container.clientWidth - padding * 2;
    const availHeight = container.clientHeight - padding * 2;

    const scaleX = availWidth / image.width;
    const scaleY = availHeight / image.height;
    const scale = Math.min(scaleX, scaleY, 2);

    const offsetX = (container.clientWidth - image.width * scale) / 2;
    const offsetY = (container.clientHeight - image.height * scale) / 2;

    onTransformChange({ scale, offsetX, offsetY });
  }, [image, onTransformChange]);

  // On image change or initial load, auto-fit
  useEffect(() => {
    if (image) {
      fitToScreen();
    }
  }, [image?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }

      if (e.key === 'Escape') {
        if (drawingState.isDrawing) {
          setDrawingState((prev) => ({
            ...prev,
            isDrawing: false,
            currentPoints: [],
            startPoint: null,
          }));
        } else {
          onSelectAnnotation(null);
        }
      }

      if (e.key === 'Enter' && drawingState.isDrawing && activeTool === 'polygon') {
        if (drawingState.currentPoints.length >= 3) {
          finishPolygon(drawingState.currentPoints);
        }
      }

      if (e.key === 'Enter' && drawingState.isDrawing && activeTool === 'polyline') {
        if (drawingState.currentPoints.length >= 2) {
          finishPolyline(drawingState.currentPoints);
        }
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotationId) {
        if (drawingState.selectedVertexIndex !== null && image) {
          const ann = image.annotations.find((a) => a.id === selectedAnnotationId);
          if (ann && ann.type === 'polygon' && ann.points.length > 3) {
            const newPoints = ann.points.filter((_, idx) => idx !== drawingState.selectedVertexIndex);
            onUpdateAnnotation({ ...ann, points: newPoints });
            setDrawingState((prev) => ({ ...prev, selectedVertexIndex: null }));
            return;
          }
        }
        onDeleteAnnotation(selectedAnnotationId);
      }

      if (e.altKey && (e.key === 'c' || e.key === 'C') && selectedAnnotationId && image) {
        const ann = image.annotations.find((a) => a.id === selectedAnnotationId);
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
    selectedAnnotationId,
    image,
    onSelectAnnotation,
    onDeleteAnnotation,
    onUpdateAnnotation,
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
    if (!image) return;

    if (isSpacePressed || e.button === 1 || activeTool === 'pan') {
      setDrawingState((prev) => ({
        ...prev,
        isPanning: true,
        panStart: { x: e.clientX, y: e.clientY },
      }));
      return;
    }

    if (e.button !== 0) return;

    const imgCoord = screenToImageCoords(e.clientX, e.clientY);
    if (!imgCoord) return;

    const threshold = 14 / transform.scale;

    // 1. SELECT TOOL & DIRECT VERTEX / POINT DRAGGING
    if (activeTool === 'select' || (!drawingState.isDrawing && activeTool === 'polygon')) {
      // Check if clicking ANY existing vertex across visible annotations to drag it
      for (let i = image.annotations.length - 1; i >= 0; i--) {
        const ann = image.annotations[i];
        if (ann.visible === false || ann.locked) continue;

        // Keypoint: dragging single point
        if (ann.type === 'keypoint' && ann.points.length > 0) {
          if (distance(imgCoord, ann.points[0]) <= threshold * 1.3) {
            onSelectAnnotation(ann.id);
            setDrawingState((prev) => ({
              ...prev,
              selectedAnnotationId: ann.id,
              selectedVertexIndex: 0,
              isDraggingVertex: true,
              isDraggingShape: false,
            }));
            return;
          }
        }

        // Polygon / Polyline: dragging specific vertex
        if (ann.type === 'polygon' || ann.type === 'polyline') {
          const vIdx = findNearbyVertexIndex(imgCoord, ann.points, threshold);
          if (vIdx !== -1) {
            onSelectAnnotation(ann.id);
            setDrawingState((prev) => ({
              ...prev,
              selectedAnnotationId: ann.id,
              selectedVertexIndex: vIdx,
              isDraggingVertex: true,
              isDraggingShape: false,
            }));
            return;
          }
        }

        // Circle: dragging center or perimeter point
        if (ann.type === 'circle' && ann.points.length >= 2) {
          const centerDist = distance(imgCoord, ann.points[0]);
          const radius = distance(ann.points[0], ann.points[1]);
          const perimeterDist = Math.abs(centerDist - radius);

          if (perimeterDist <= threshold) {
            // Drag radius
            onSelectAnnotation(ann.id);
            setDrawingState((prev) => ({
              ...prev,
              selectedAnnotationId: ann.id,
              selectedVertexIndex: 1,
              isDraggingVertex: true,
              isDraggingShape: false,
            }));
            return;
          } else if (centerDist <= threshold) {
            // Drag center
            onSelectAnnotation(ann.id);
            setDrawingState((prev) => ({
              ...prev,
              selectedAnnotationId: ann.id,
              selectedVertexIndex: 0,
              isDraggingVertex: true,
              isDraggingShape: false,
            }));
            return;
          }
        }

        // BBox: check handles if already selected
        if (ann.type === 'bbox' && ann.id === selectedAnnotationId) {
          const box = getBoundingBox(ann.points, 'bbox');
          const handle = findBBoxHandle(imgCoord, box, threshold);
          if (handle) {
            setDrawingState((prev) => ({
              ...prev,
              selectedHandle: handle,
              isDraggingShape: false,
              isDraggingVertex: false,
              shapeDragStart: imgCoord,
              initialShapePoints: [...ann.points],
            }));
            return;
          }
        }
      }

      // Check if clicking on edge of selected polygon to insert a new vertex
      if (selectedAnnotationId) {
        const selAnn = image.annotations.find((a) => a.id === selectedAnnotationId);
        if (selAnn && (selAnn.type === 'polygon' || selAnn.type === 'polyline')) {
          const edge = findClosestEdge(imgCoord, selAnn.points, threshold);
          if (edge) {
            const newPoints = [...selAnn.points];
            newPoints.splice(edge.edgeIndex + 1, 0, edge.insertPoint);
            onUpdateAnnotation({ ...selAnn, points: newPoints });
            setDrawingState((prev) => ({
              ...prev,
              selectedVertexIndex: edge.edgeIndex + 1,
              isDraggingVertex: true,
              isDraggingShape: false,
            }));
            return;
          }
        }
      }

      // Check if clicking inside whole shape to select/drag it
      if (activeTool === 'select') {
        const hit = [...image.annotations].reverse().find((a) => 
          a.visible !== false && !a.locked && isPointInsideAnnotation(imgCoord, a, threshold)
        );

        if (hit) {
          onSelectAnnotation(hit.id);
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
          onSelectAnnotation(null);
          setDrawingState((prev) => ({
            ...prev,
            selectedAnnotationId: null,
            selectedVertexIndex: null,
            selectedHandle: null,
          }));
        }
        return;
      }
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

    // 4. BOUNDING BOX TOOL
    if (activeTool === 'bbox') {
      setDrawingState((prev) => ({
        ...prev,
        isDrawing: true,
        startPoint: imgCoord,
        cursorPoint: imgCoord,
        currentPoints: [imgCoord, imgCoord],
      }));
      return;
    }

    // 5. KEYPOINT TOOL
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

    // 6. CIRCLE TOOL
    if (activeTool === 'circle') {
      setDrawingState((prev) => ({
        ...prev,
        isDrawing: true,
        startPoint: imgCoord,
        cursorPoint: imgCoord,
        currentPoints: [imgCoord, imgCoord],
      }));
      return;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // 1. Panning
    if (drawingState.isPanning && drawingState.panStart) {
      const dx = e.clientX - drawingState.panStart.x;
      const dy = e.clientY - drawingState.panStart.y;
      onTransformChange({
        ...transform,
        offsetX: transform.offsetX + dx,
        offsetY: transform.offsetY + dy,
      });
      setDrawingState((prev) => ({
        ...prev,
        panStart: { x: e.clientX, y: e.clientY },
      }));
      return;
    }

    const imgCoord = screenToImageCoords(e.clientX, e.clientY);
    if (!imgCoord || !image) return;

    setDrawingState((prev) => ({ ...prev, cursorPoint: imgCoord }));

    // 2. Dragging Existing Vertex or Point
    if (drawingState.isDraggingVertex && selectedAnnotationId && drawingState.selectedVertexIndex !== null) {
      const ann = image.annotations.find((a) => a.id === selectedAnnotationId);
      if (ann) {
        if (ann.type === 'circle') {
          if (drawingState.selectedVertexIndex === 0) {
            // Dragging center: shift whole circle
            const r = distance(ann.points[0], ann.points[1]);
            const newPoints = [imgCoord, { x: imgCoord.x + r, y: imgCoord.y }];
            onUpdateAnnotation({ ...ann, points: newPoints });
          } else {
            // Dragging radius handle
            const newPoints = [ann.points[0], imgCoord];
            onUpdateAnnotation({ ...ann, points: newPoints });
          }
        } else {
          const newPoints = [...ann.points];
          newPoints[drawingState.selectedVertexIndex] = imgCoord;
          onUpdateAnnotation({ ...ann, points: newPoints });
        }
      }
      return;
    }

    // 3. Resizing BBox via Handle
    if (drawingState.selectedHandle && selectedAnnotationId && drawingState.initialShapePoints && drawingState.shapeDragStart) {
      const ann = image.annotations.find((a) => a.id === selectedAnnotationId);
      if (ann && ann.type === 'bbox') {
        const p1 = drawingState.initialShapePoints[0];
        const p2 = drawingState.initialShapePoints[1];
        let minX = Math.min(p1.x, p2.x);
        let minY = Math.min(p1.y, p2.y);
        let maxX = Math.max(p1.x, p2.x);
        let maxY = Math.max(p1.y, p2.y);

        const handle = drawingState.selectedHandle;
        if (handle.includes('w')) minX = imgCoord.x;
        if (handle.includes('e')) maxX = imgCoord.x;
        if (handle.includes('n')) minY = imgCoord.y;
        if (handle.includes('s')) maxY = imgCoord.y;

        onUpdateAnnotation({
          ...ann,
          points: [
            { x: minX, y: minY },
            { x: maxX, y: maxY },
          ],
        });
      }
      return;
    }

    // 4. Dragging Whole Shape
    if (drawingState.isDraggingShape && selectedAnnotationId && drawingState.shapeDragStart && drawingState.initialShapePoints) {
      const ann = image.annotations.find((a) => a.id === selectedAnnotationId);
      if (ann) {
        const dx = imgCoord.x - drawingState.shapeDragStart.x;
        const dy = imgCoord.y - drawingState.shapeDragStart.y;
        const shiftedPoints = drawingState.initialShapePoints.map((p) => ({
          x: p.x + dx,
          y: p.y + dy,
        }));
        onUpdateAnnotation({ ...ann, points: shiftedPoints });
      }
      return;
    }

    // 5. In-progress Drawing BBox or Circle
    if (drawingState.isDrawing && (activeTool === 'bbox' || activeTool === 'circle') && drawingState.startPoint) {
      setDrawingState((prev) => ({
        ...prev,
        currentPoints: [prev.startPoint!, imgCoord],
      }));
      return;
    }

    // 6. Hover detection for vertices
    const threshold = 14 / transform.scale;
    let foundHoveredV: { annId: string; vertexIndex: number } | null = null;

    for (let i = image.annotations.length - 1; i >= 0; i--) {
      const ann = image.annotations[i];
      if (ann.visible === false) continue;
      const vIdx = findNearbyVertexIndex(imgCoord, ann.points, threshold);
      if (vIdx !== -1) {
        foundHoveredV = { annId: ann.id, vertexIndex: vIdx };
        break;
      }
    }
    setHoveredVertex(foundHoveredV);

    // Hover edge for insertion
    if (activeTool === 'select' && selectedAnnotationId) {
      const ann = image.annotations.find((a) => a.id === selectedAnnotationId);
      if (ann && (ann.type === 'polygon' || ann.type === 'polyline') && !foundHoveredV) {
        const edge = findClosestEdge(imgCoord, ann.points, 10 / transform.scale);
        setHoveredEdge(edge);
      } else {
        setHoveredEdge(null);
      }
    } else {
      setHoveredEdge(null);
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

  const handleDoubleClick = () => {
    if (drawingState.isDrawing && activeTool === 'polygon') {
      finishPolygon(drawingState.currentPoints);
    } else if (drawingState.isDrawing && activeTool === 'polyline') {
      finishPolyline(drawingState.currentPoints);
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

    // 3. Render Annotations
    if (image?.annotations) {
      image.annotations.forEach((ann) => {
        if (ann.visible === false) return;
        const cls = classMap.get(ann.classId) || { name: 'Desconhecido', color: '#3b82f6', visible: true, locked: false, id: '' };
        if (!cls.visible) return;

        const isSelected = ann.id === selectedAnnotationId;
        drawAnnotation(ctx, ann, cls, isSelected, filters, transform.scale, hoveredVertex);
      });
    }

    // 4. Render Active In-Progress Annotation
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

    // 5. Draw Edge Insertion Indicator
    if (hoveredEdge && activeTool === 'select') {
      ctx.save();
      ctx.fillStyle = '#10b981';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / transform.scale;
      ctx.beginPath();
      ctx.arc(hoveredEdge.insertPoint.x, hoveredEdge.insertPoint.y, 6 / transform.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 6. Draw Crosshair Cursor
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
    selectedAnnotationId,
    drawingState,
    hoveredEdge,
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

  // Determine cursor styling
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

      {/* Floating coordinates and zoom badge */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur border border-slate-800 text-xs font-mono text-slate-300 shadow-xl pointer-events-none">
        <span className="text-blue-400 font-semibold">{Math.round(transform.scale * 100)}%</span>
        <span className="text-slate-600">|</span>
        <span>
          X: {drawingState.cursorPoint ? Math.round(drawingState.cursorPoint.x) : 0}px
        </span>
        <span>
          Y: {drawingState.cursorPoint ? Math.round(drawingState.cursorPoint.y) : 0}px
        </span>
        {hoveredVertex && (
          <>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400 font-semibold">Ponto #{hoveredVertex.vertexIndex + 1} (Arraste para mover)</span>
          </>
        )}
        {image && (
          <>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              {image.width} × {image.height}px
            </span>
          </>
        )}
      </div>

      {/* Hints */}
      {drawingState.isDrawing && activeTool === 'polygon' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600/95 backdrop-blur text-white text-xs font-medium shadow-2xl animate-fade-in">
          <span>
            {drawingState.currentPoints.length} pontos • Clique para adicionar • Pressione <b>Enter</b> ou clique no ponto inicial para fechar • <b>Esc</b> cancela
          </span>
        </div>
      )}
    </div>
  );
};

/* ==========================================================================
   CANVAS RENDERING SUB-ROUTINES
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
  const color = cls.color || '#3b82f6';
  const strokeWidth = (filters.strokeWidth || 2) / scale;
  const opacityHex = Math.round((filters.annotationOpacity || 0.35) * 255)
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
    ctx.stroke();

    // Render vertices
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
    ctx.strokeRect(box.x, box.y, box.width, box.height);

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

  // 3. KEYPOINT
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

    ctx.beginPath();
    ctx.arc(p.x, p.y, 12 / scale, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 4. POLYLINE
  if (ann.type === 'polyline' && ann.points.length >= 2) {
    ctx.beginPath();
    ctx.moveTo(ann.points[0].x, ann.points[0].y);
    for (let i = 1; i < ann.points.length; i++) {
      ctx.lineTo(ann.points[i].x, ann.points[i].y);
    }
    ctx.stroke();

    ann.points.forEach((p, idx) => {
      const isVertexHovered = hoveredVertex?.annId === ann.id && hoveredVertex?.vertexIndex === idx;
      ctx.fillStyle = isVertexHovered ? '#10b981' : '#ffffff';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 / scale;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (isVertexHovered ? 6.5 : 4) / scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  // 5. CIRCLE
  if (ann.type === 'circle' && ann.points.length >= 2) {
    const center = ann.points[0];
    const r = distance(ann.points[0], ann.points[1]);
    ctx.beginPath();
    ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Center point & radius handle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(center.x, center.y, (isSelected ? 5 : 3.5) / scale, 0, Math.PI * 2);
    ctx.arc(ann.points[1].x, ann.points[1].y, (isSelected ? 5 : 3.5) / scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // 6. LABEL BADGE
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
  activeClass: DatasetClass,
  scale: number
) {
  const color = activeClass.color || '#3b82f6';
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = `${color}40`;
  ctx.lineWidth = 2 / scale;

  if (tool === 'polygon') {
    const points = state.currentPoints;
    const cursor = state.cursorPoint;

    if (points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      if (cursor) {
        ctx.lineTo(cursor.x, cursor.y);
      }
      ctx.stroke();

      points.forEach((p, idx) => {
        ctx.fillStyle = idx === 0 ? '#10b981' : '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 / scale;
        ctx.beginPath();
        const r = (idx === 0 ? 7 : 4) / scale;
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      if (cursor && points.length >= 3 && distance(cursor, points[0]) <= 14 / scale) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3 / scale;
        ctx.beginPath();
        ctx.arc(points[0].x, points[0].y, 10 / scale, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  } else if (tool === 'polyline') {
    const points = state.currentPoints;
    const cursor = state.cursorPoint;
    if (points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      if (cursor) {
        ctx.lineTo(cursor.x, cursor.y);
      }
      ctx.stroke();
      points.forEach((p) => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 / scale, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  } else if (tool === 'bbox' && state.startPoint && state.cursorPoint) {
    const p1 = state.startPoint;
    const p2 = state.cursorPoint;
    const minX = Math.min(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const w = Math.abs(p2.x - p1.x);
    const h = Math.abs(p2.y - p1.y);

    ctx.fillRect(minX, minY, w, h);
    ctx.strokeRect(minX, minY, w, h);
  } else if (tool === 'circle' && state.startPoint && state.cursorPoint) {
    const center = state.startPoint;
    const r = distance(center, state.cursorPoint);
    ctx.beginPath();
    ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}
