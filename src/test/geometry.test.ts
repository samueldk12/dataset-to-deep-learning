import { describe, it, expect } from 'vitest';
import {
  distance,
  getBoundingBox,
  calculatePolygonArea,
  computeConvexHull,
  isPointInPolygon,
  findNearbyVertexIndex,
  findClosestEdge,
  findBBoxHandle,
} from '../utils/geometry';
import { Point } from '../types/dataset';

describe('Geometry Utilities (Unit Tests)', () => {
  describe('distance', () => {
    it('calculates euclidean distance correctly', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 3, y: 4 };
      expect(distance(p1, p2)).toBe(5);
    });

    it('returns 0 for identical points', () => {
      const p: Point = { x: 10, y: 20 };
      expect(distance(p, p)).toBe(0);
    });
  });

  describe('getBoundingBox', () => {
    it('calculates bbox for rectangle points', () => {
      const points: Point[] = [
        { x: 10, y: 20 },
        { x: 100, y: 200 },
      ];
      const box = getBoundingBox(points, 'bbox');
      expect(box).toEqual({
        x: 10,
        y: 20,
        width: 90,
        height: 180,
      });
    });

    it('calculates bbox for irregular polygon', () => {
      const polygon: Point[] = [
        { x: 50, y: 50 },
        { x: 200, y: 80 },
        { x: 150, y: 300 },
        { x: 20, y: 150 },
      ];
      const box = getBoundingBox(polygon, 'polygon');
      expect(box).toEqual({
        x: 20,
        y: 50,
        width: 180,
        height: 250,
      });
    });

    it('calculates bbox for circle', () => {
      const circlePoints: Point[] = [
        { x: 100, y: 100 }, // Center
        { x: 150, y: 100 }, // Radius = 50
      ];
      const box = getBoundingBox(circlePoints, 'circle');
      expect(box).toEqual({
        x: 50,
        y: 50,
        width: 100,
        height: 100,
      });
    });
  });

  describe('calculatePolygonArea', () => {
    it('calculates area of square correctly', () => {
      const square: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ];
      expect(calculatePolygonArea(square)).toBe(10000);
    });

    it('calculates area of right triangle', () => {
      const triangle: Point[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 0, y: 20 },
      ];
      expect(calculatePolygonArea(triangle)).toBe(100);
    });
  });

  describe('computeConvexHull (Monotone Chain algorithm)', () => {
    it('computes convex hull correctly and excludes interior points', () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
        { x: 50, y: 50 }, // Interior point
        { x: 30, y: 40 }, // Interior point
      ];
      const hull = computeConvexHull(points);
      expect(hull.length).toBe(4);
      expect(hull.some((p) => p.x === 50 && p.y === 50)).toBe(false);
      expect(hull.some((p) => p.x === 30 && p.y === 40)).toBe(false);
    });

    it('returns original points if <= 3 points', () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 50, y: 50 },
      ];
      expect(computeConvexHull(points)).toEqual(points);
    });
  });

  describe('isPointInPolygon', () => {
    const square: Point[] = [
      { x: 10, y: 10 },
      { x: 100, y: 10 },
      { x: 100, y: 100 },
      { x: 10, y: 100 },
    ];

    it('detects point inside polygon', () => {
      expect(isPointInPolygon({ x: 50, y: 50 }, square)).toBe(true);
    });

    it('detects point outside polygon', () => {
      expect(isPointInPolygon({ x: 5, y: 5 }, square)).toBe(false);
      expect(isPointInPolygon({ x: 150, y: 150 }, square)).toBe(false);
    });
  });

  describe('findNearbyVertexIndex', () => {
    const polygon: Point[] = [
      { x: 10, y: 10 },
      { x: 100, y: 10 },
      { x: 100, y: 100 },
    ];

    it('finds vertex within threshold', () => {
      expect(findNearbyVertexIndex({ x: 12, y: 11 }, polygon, 5)).toBe(0);
      expect(findNearbyVertexIndex({ x: 98, y: 99 }, polygon, 5)).toBe(2);
    });

    it('returns -1 if no vertex is nearby', () => {
      expect(findNearbyVertexIndex({ x: 50, y: 50 }, polygon, 5)).toBe(-1);
    });
  });

  describe('findClosestEdge', () => {
    const polygon: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];

    it('finds closest edge and projection point for vertex insertion', () => {
      const res = findClosestEdge({ x: 50, y: 2 }, polygon, 5);
      expect(res).not.toBeNull();
      expect(res?.edgeIndex).toBe(0);
      expect(res?.insertPoint.x).toBeCloseTo(50);
      expect(res?.insertPoint.y).toBeCloseTo(0);
    });
  });

  describe('findBBoxHandle', () => {
    const box = { x: 50, y: 50, width: 100, height: 100 };

    it('finds corner handles correctly', () => {
      expect(findBBoxHandle({ x: 50, y: 50 }, box, 6)).toBe('nw');
      expect(findBBoxHandle({ x: 150, y: 50 }, box, 6)).toBe('ne');
      expect(findBBoxHandle({ x: 150, y: 150 }, box, 6)).toBe('se');
      expect(findBBoxHandle({ x: 50, y: 150 }, box, 6)).toBe('sw');
    });

    it('finds edge handles correctly', () => {
      expect(findBBoxHandle({ x: 100, y: 50 }, box, 6)).toBe('n');
      expect(findBBoxHandle({ x: 150, y: 100 }, box, 6)).toBe('e');
      expect(findBBoxHandle({ x: 100, y: 150 }, box, 6)).toBe('s');
      expect(findBBoxHandle({ x: 50, y: 100 }, box, 6)).toBe('w');
    });
  });
});
