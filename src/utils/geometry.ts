import { Point, Annotation, AnnotationType } from '../types/dataset';
import { ResizeHandle } from '../types/canvas';

export function distance(p1: Point, p2: Point): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

export function distanceToSegment(p: Point, a: Point, b: Point): { dist: number; closest: Point; t: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) {
    return { dist: distance(p, a), closest: { ...a }, t: 0 };
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const closest = { x: a.x + t * dx, y: a.y + t * dy };
  return { dist: distance(p, closest), closest, t };
}

export function isPointInPolygon(p: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > p.y) !== (yj > p.y)) &&
      (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function getBoundingBox(points: Point[], type: AnnotationType): { x: number; y: number; width: number; height: number } {
  if (!points || points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  if (type === 'circle' && points.length >= 2) {
    const center = points[0];
    const r = distance(points[0], points[1]);
    return {
      x: center.x - r,
      y: center.y - r,
      width: r * 2,
      height: r * 2,
    };
  }

  if (type === 'bbox' && points.length >= 2) {
    const minX = Math.min(points[0].x, points[1].x);
    const minY = Math.min(points[0].y, points[1].y);
    const maxX = Math.max(points[0].x, points[1].x);
    const maxY = Math.max(points[0].y, points[1].y);
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}

export function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

export function calculatePolygonPerimeter(points: Point[]): number {
  if (points.length < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    perimeter += distance(points[i], points[j]);
  }
  return perimeter;
}

/**
 * Computes the 2D Convex Hull of a set of points (Monotone Chain algorithm).
 */
export function computeConvexHull(points: Point[]): Point[] {
  if (points.length <= 3) return [...points];

  const sorted = [...points].sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);

  function cross(o: Point, a: Point, b: Point): number {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  const lower: Point[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Checks if a point hits an annotation for selection.
 */
export function isPointInsideAnnotation(p: Point, ann: Annotation, tolerance = 8): boolean {
  if (!ann.points || ann.points.length === 0) return false;

  if (ann.type === 'keypoint') {
    return distance(p, ann.points[0]) <= tolerance * 1.5;
  }

  if (ann.type === 'skeleton') {
    for (const pt of ann.points) {
      if (distance(p, pt) <= tolerance * 1.5) return true;
    }
    for (const [i, j] of SKELETON_BONES) {
      if (ann.points[i] && ann.points[j]) {
        const seg = distanceToSegment(p, ann.points[i], ann.points[j]);
        if (seg.dist <= tolerance) return true;
      }
    }
    return false;
  }

  if (ann.type === 'cuboid3d' && ann.points.length >= 8) {
    for (const [i, j] of CUBOID_EDGES) {
      if (ann.points[i] && ann.points[j]) {
        const seg = distanceToSegment(p, ann.points[i], ann.points[j]);
        if (seg.dist <= tolerance) return true;
      }
    }
    // Check if inside front face
    const frontFace = ann.points.slice(0, 4);
    if (isPointInPolygon(p, frontFace)) return true;
    return false;
  }

  if (ann.type === 'circle' && ann.points.length >= 2) {
    const r = distance(ann.points[0], ann.points[1]);
    const distToCenter = distance(p, ann.points[0]);
    return distToCenter <= r + tolerance && distToCenter >= Math.max(0, r - tolerance - 10);
  }

  if (ann.type === 'bbox' && ann.points.length >= 2) {
    const box = getBoundingBox(ann.points, 'bbox');
    return (
      p.x >= box.x - tolerance &&
      p.x <= box.x + box.width + tolerance &&
      p.y >= box.y - tolerance &&
      p.y <= box.y + box.height + tolerance
    );
  }

  if (ann.type === 'polyline') {
    for (let i = 0; i < ann.points.length - 1; i++) {
      const seg = distanceToSegment(p, ann.points[i], ann.points[i + 1]);
      if (seg.dist <= tolerance) return true;
    }
    return false;
  }

  if (ann.type === 'polygon' || ann.type === 'brush') {
    if (isPointInPolygon(p, ann.points)) return true;
    for (let i = 0; i < ann.points.length; i++) {
      const next = ann.points[(i + 1) % ann.points.length];
      const seg = distanceToSegment(p, ann.points[i], next);
      if (seg.dist <= tolerance) return true;
    }
    return false;
  }

  return false;
}

/**
 * Finds index of vertex close to point.
 */
export function findNearbyVertexIndex(p: Point, points: Point[], threshold = 10): number {
  for (let i = 0; i < points.length; i++) {
    if (distance(p, points[i]) <= threshold) {
      return i;
    }
  }
  return -1;
}

/**
 * Finds edge on polygon closest to point to insert new vertex.
 */
export function findClosestEdge(p: Point, polygon: Point[], threshold = 8): { edgeIndex: number; insertPoint: Point } | null {
  if (polygon.length < 3) return null;
  let minDistance = Infinity;
  let bestEdge = -1;
  let bestPoint = p;

  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const seg = distanceToSegment(p, a, b);
    if (seg.dist < minDistance && seg.dist <= threshold && seg.t > 0.05 && seg.t < 0.95) {
      minDistance = seg.dist;
      bestEdge = i;
      bestPoint = seg.closest;
    }
  }

  if (bestEdge !== -1) {
    return { edgeIndex: bestEdge, insertPoint: bestPoint };
  }
  return null;
}

/**
 * Gets the 8 resize handle coordinates for a bbox.
 */
export function getBBoxHandles(bbox: { x: number; y: number; width: number; height: number }): Record<ResizeHandle, Point> {
  const { x, y, width, height } = bbox;
  return {
    nw: { x, y },
    n: { x: x + width / 2, y },
    ne: { x: x + width, y },
    e: { x: x + width, y: y + height / 2 },
    se: { x: x + width, y: y + height },
    s: { x: x + width / 2, y: y + height },
    sw: { x, y: y + height },
    w: { x, y: y + height / 2 },
  };
}

/**
 * Detects if cursor is near a bbox resize handle.
 */
export function findBBoxHandle(p: Point, bbox: { x: number; y: number; width: number; height: number }, threshold = 8): ResizeHandle | null {
  const handles = getBBoxHandles(bbox);
  for (const [key, handlePoint] of Object.entries(handles) as [ResizeHandle, Point][]) {
    if (distance(p, handlePoint) <= threshold) {
      return key;
    }
  }
  return null;
}

/**
 * Merges two or more annotations into a single unified annotation.
 * - If all are BBoxes: creates a new unified bounding box enclosing all bboxes.
 * - If polygons or mixed bbox+polygon: extracts all points and generates the Convex Hull polygon.
 * - If keypoints: unifies all landmark points.
 * - If polylines: joins sequential paths.
 */
export function mergeAnnotations(
  annotations: Annotation[],
  targetClassId?: string
): Annotation | null {
  if (!annotations || annotations.length < 2) return null;

  const base = annotations[0];
  const finalClassId = targetClassId || base.classId;

  // Extract all points
  const allPoints: Point[] = [];
  let allTypesAreBBox = true;
  let allTypesAreKeypoint = true;

  for (const ann of annotations) {
    if (ann.type !== 'bbox') allTypesAreBBox = false;
    if (ann.type !== 'keypoint') allTypesAreKeypoint = false;

    if (ann.type === 'bbox' && ann.points.length >= 2) {
      const box = getBoundingBox(ann.points, 'bbox');
      allPoints.push(
        { x: box.x, y: box.y },
        { x: box.x + box.width, y: box.y },
        { x: box.x + box.width, y: box.y + box.height },
        { x: box.x, y: box.y + box.height }
      );
    } else if (ann.type === 'circle' && ann.points.length >= 2) {
      const box = getBoundingBox(ann.points, 'circle');
      allPoints.push(
        { x: box.x, y: box.y },
        { x: box.x + box.width, y: box.y },
        { x: box.x + box.width, y: box.y + box.height },
        { x: box.x, y: box.y + box.height }
      );
    } else {
      allPoints.push(...ann.points);
    }
  }

  if (allPoints.length === 0) return null;

  // Case 1: All are BBoxes -> Result is an enclosing BBox
  if (allTypesAreBBox) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of allPoints) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return {
      id: `ann_merged_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      classId: finalClassId,
      type: 'bbox',
      points: [
        { x: minX, y: minY },
        { x: maxX, y: maxY },
      ],
      visible: true,
      locked: false,
      createdAt: Date.now(),
    };
  }

  // Case 2: All are Keypoints -> Result is combined keypoints
  if (allTypesAreKeypoint) {
    return {
      id: `ann_merged_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      classId: finalClassId,
      type: 'keypoint',
      points: allPoints,
      visible: true,
      locked: false,
      createdAt: Date.now(),
    };
  }

  // Case 3: Polygons / Mixed -> Result is a unified Convex Hull Polygon
  const hullPoints = computeConvexHull(allPoints);
  return {
    id: `ann_merged_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    classId: finalClassId,
    type: 'polygon',
    points: hullPoints,
    visible: true,
    locked: false,
    createdAt: Date.now(),
  };
}

/* ==========================================================================
   3D CUBOID ISOMETRIC ENGINE
   ========================================================================== */

export const CUBOID_EDGES = [
  // Front face (0, 1, 2, 3)
  [0, 1], [1, 2], [2, 3], [3, 0],
  // Back face (4, 5, 6, 7)
  [4, 5], [5, 6], [6, 7], [7, 4],
  // Connecting depth lines
  [0, 4], [1, 5], [2, 6], [3, 7]
];

export function create3DCuboid(p1: Point, p2: Point, depthRatio = 0.25): Point[] {
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);

  const width = Math.max(10, maxX - minX);
  const height = Math.max(10, maxY - minY);
  const depthX = width * depthRatio;
  const depthY = height * depthRatio;

  // Front face: [Top-Left, Top-Right, Bottom-Right, Bottom-Left]
  const f0: Point = { x: minX, y: minY };
  const f1: Point = { x: maxX, y: minY };
  const f2: Point = { x: maxX, y: maxY };
  const f3: Point = { x: minX, y: maxY };

  // Back face (offset in isometric perspective top-right)
  const b0: Point = { x: minX + depthX, y: minY - depthY };
  const b1: Point = { x: maxX + depthX, y: minY - depthY };
  const b2: Point = { x: maxX + depthX, y: maxY - depthY };
  const b3: Point = { x: minX + depthX, y: maxY - depthY };

  return [f0, f1, f2, f3, b0, b1, b2, b3];
}

/* ==========================================================================
   HUMAN ANATOMICAL SKELETON ENGINE (17 Keypoints + Bones Topology)
   ========================================================================== */

export const SKELETON_KEYPOINT_NAMES = [
  'nariz', 'olho_esq', 'olho_dir', 'orelha_esq', 'orelha_dir',
  'ombro_esq', 'ombro_dir', 'cotovelo_esq', 'cotovelo_dir', 'pulso_esq', 'pulso_dir',
  'quadril_esq', 'quadril_dir', 'joelho_esq', 'joelho_dir', 'tornozelo_esq', 'tornozelo_dir'
];

export const SKELETON_BONES = [
  // Head
  [0, 1], [0, 2], [1, 3], [2, 4],
  // Upper body
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
  // Torso / Spine
  [5, 11], [6, 12], [11, 12],
  // Lower body
  [11, 13], [13, 15], [12, 14], [14, 16]
];

export function createHumanSkeleton(center: Point, totalHeight = 180): Point[] {
  const headY = center.y - totalHeight * 0.45;
  const eyeOffset = totalHeight * 0.04;
  const earOffset = totalHeight * 0.08;
  const shoulderY = center.y - totalHeight * 0.28;
  const shoulderX = totalHeight * 0.16;
  const elbowY = center.y - totalHeight * 0.12;
  const elbowX = totalHeight * 0.22;
  const wristY = center.y + totalHeight * 0.04;
  const wristX = totalHeight * 0.24;

  const hipY = center.y + totalHeight * 0.05;
  const hipX = totalHeight * 0.10;
  const kneeY = center.y + totalHeight * 0.26;
  const kneeX = totalHeight * 0.12;
  const ankleY = center.y + totalHeight * 0.48;
  const ankleX = totalHeight * 0.13;

  return [
    { x: center.x, y: headY }, // 0: nose
    { x: center.x - eyeOffset, y: headY - eyeOffset * 0.5 }, // 1: left eye
    { x: center.x + eyeOffset, y: headY - eyeOffset * 0.5 }, // 2: right eye
    { x: center.x - earOffset, y: headY }, // 3: left ear
    { x: center.x + earOffset, y: headY }, // 4: right ear

    { x: center.x - shoulderX, y: shoulderY }, // 5: left shoulder
    { x: center.x + shoulderX, y: shoulderY }, // 6: right shoulder
    { x: center.x - elbowX, y: elbowY }, // 7: left elbow
    { x: center.x + elbowX, y: elbowY }, // 8: right elbow
    { x: center.x - wristX, y: wristY }, // 9: left wrist
    { x: center.x + wristX, y: wristY }, // 10: right wrist

    { x: center.x - hipX, y: hipY }, // 11: left hip
    { x: center.x + hipX, y: hipY }, // 12: right hip
    { x: center.x - kneeX, y: kneeY }, // 13: left knee
    { x: center.x + kneeX, y: kneeY }, // 14: right knee
    { x: center.x - ankleX, y: ankleY }, // 15: left ankle
    { x: center.x + ankleX, y: ankleY }, // 16: right ankle
  ];
}

/* ==========================================================================
   NODE / VERTEX INSERTION AT CLOSEST EDGE (KEYBOARD 'A' SHORTCUT)
   ========================================================================== */

export function insertVertexAtClosestEdge(points: Point[], newPoint: Point): Point[] {
  if (points.length < 2) return [...points, newPoint];

  let bestIndex = points.length;
  let minDistance = Infinity;

  for (let i = 0; i < points.length; i++) {
    const pA = points[i];
    const pB = points[(i + 1) % points.length];
    const res = distanceToSegment(newPoint, pA, pB);
    if (res.dist < minDistance) {
      minDistance = res.dist;
      bestIndex = i + 1;
    }
  }

  const updated = [...points];
  updated.splice(bestIndex, 0, newPoint);
  return updated;
}

/* ==========================================================================
   MAGIC WAND FLOOD FILL CONTOUR EXTRACTOR
   ========================================================================== */

export function extractMagicWandPolygon(
  imageData: ImageData,
  startX: number,
  startY: number,
  tolerance = 32
): Point[] {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  const sx = Math.floor(Math.max(0, Math.min(width - 1, startX)));
  const sy = Math.floor(Math.max(0, Math.min(height - 1, startY)));

  const startIdx = (sy * width + sx) * 4;
  const targetR = data[startIdx];
  const targetG = data[startIdx + 1];
  const targetB = data[startIdx + 2];

  const visited = new Uint8Array(width * height);
  const queue: number[] = [sx, sy];
  visited[sy * width + sx] = 1;

  let minX = sx, maxX = sx, minY = sy, maxY = sy;
  let matchingCount = 0;
  const maxPixels = width * height * 0.85;

  while (queue.length > 0 && matchingCount < maxPixels) {
    const cy = queue.pop()!;
    const cx = queue.pop()!;
    matchingCount++;

    if (cx < minX) minX = cx;
    if (cx > maxX) maxX = cx;
    if (cy < minY) minY = cy;
    if (cy > maxY) maxY = cy;

    // 4-directional neighbors
    const neighbors = [
      [cx + 1, cy], [cx - 1, cy],
      [cx, cy + 1], [cx, cy - 1]
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nPos = ny * width + nx;
        if (!visited[nPos]) {
          visited[nPos] = 1;
          const idx = nPos * 4;
          const diff = Math.abs(data[idx] - targetR) +
                       Math.abs(data[idx + 1] - targetG) +
                       Math.abs(data[idx + 2] - targetB);

          if (diff <= tolerance * 3) {
            queue.push(nx, ny);
          }
        }
      }
    }
  }

  // If too small, return circle around click point
  if (matchingCount < 16) {
    const r = 20;
    const pts: Point[] = [];
    for (let i = 0; i < 12; i++) {
      const rad = (i / 12) * Math.PI * 2;
      pts.push({ x: sx + Math.cos(rad) * r, y: sy + Math.sin(rad) * r });
    }
    return pts;
  }

  // Extract outer envelope points in radial directions from centroid
  const centroidX = (minX + maxX) / 2;
  const centroidY = (minY + maxY) / 2;
  const numRays = 24;
  const polygonPoints: Point[] = [];

  for (let i = 0; i < numRays; i++) {
    const angle = (i / numRays) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const maxRadius = Math.hypot(maxX - minX, maxY - minY);

    let farthestX = centroidX;
    let farthestY = centroidY;

    for (let r = 1; r < maxRadius; r += 2) {
      const sampleX = Math.round(centroidX + cosA * r);
      const sampleY = Math.round(centroidY + sinA * r);
      if (sampleX >= 0 && sampleX < width && sampleY >= 0 && sampleY < height) {
        if (visited[sampleY * width + sampleX]) {
          farthestX = sampleX;
          farthestY = sampleY;
        }
      } else {
        break;
      }
    }

    polygonPoints.push({ x: farthestX, y: farthestY });
  }

  return polygonPoints;
}

