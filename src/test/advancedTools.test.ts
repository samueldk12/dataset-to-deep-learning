import { describe, it, expect } from 'vitest';
import { 
  create3DCuboid, 
  CUBOID_EDGES, 
  createHumanSkeleton, 
  SKELETON_BONES, 
  SKELETON_KEYPOINT_NAMES,
  insertVertexAtClosestEdge,
  extractMagicWandPolygon
} from '../utils/geometry';

describe('Advanced Annotation Tools & Geometry', () => {
  it('creates 3D Isometric Cuboid with 8 vertices and valid edges', () => {
    const p1 = { x: 100, y: 100 };
    const p2 = { x: 300, y: 250 };
    const cuboid = create3DCuboid(p1, p2, 0.25);

    expect(cuboid.length).toBe(8);
    // Front face (0 to 3)
    expect(cuboid[0]).toEqual({ x: 100, y: 100 });
    expect(cuboid[1]).toEqual({ x: 300, y: 100 });
    expect(cuboid[2]).toEqual({ x: 300, y: 250 });
    expect(cuboid[3]).toEqual({ x: 100, y: 250 });

    // Back face (4 to 7) offset
    expect(cuboid[4].x).toBeGreaterThan(cuboid[0].x);
    expect(cuboid[4].y).toBeLessThan(cuboid[0].y);

    // Verify 12 isometric edges
    expect(CUBOID_EDGES.length).toBe(12);
  });

  it('creates Human Anatomical Skeleton with 17 keypoints and connected bones', () => {
    const center = { x: 400, y: 300 };
    const skeleton = createHumanSkeleton(center, 200);

    expect(skeleton.length).toBe(17);
    expect(SKELETON_KEYPOINT_NAMES.length).toBe(17);
    expect(SKELETON_BONES.length).toBe(16);

    // Head is at top, feet at bottom
    expect(skeleton[0].y).toBeLessThan(skeleton[5].y); // Nose higher than shoulders
    expect(skeleton[5].y).toBeLessThan(skeleton[11].y); // Shoulders higher than hips
    expect(skeleton[11].y).toBeLessThan(skeleton[15].y); // Hips higher than ankles
  });

  it('correctly inserts a new vertex at closest edge when pressing shortcut A', () => {
    // Square polygon: (0,0), (100,0), (100,100), (0,100)
    const square = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];

    // Point near top edge (between 0,0 and 100,0)
    const newPt = { x: 50, y: 2 };
    const updated = insertVertexAtClosestEdge(square, newPt);

    expect(updated.length).toBe(5);
    // Should be inserted at index 1 (between (0,0) and (100,0))
    expect(updated[1]).toEqual(newPt);
  });

  it('extracts magic wand contour polygon from synthetic pixel data', () => {
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4);

    // Fill background with black (0,0,0)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }

    // Draw white square in center (40 to 60)
    for (let y = 40; y <= 60; y++) {
      for (let x = 40; x <= 60; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = 255;
      }
    }

    const imgData = { width, height, data } as ImageData;
    const poly = extractMagicWandPolygon(imgData, 50, 50, 20);

    expect(poly.length).toBeGreaterThanOrEqual(3);
    // Centroid should be around (50, 50)
    const avgX = poly.reduce((s, p) => s + p.x, 0) / poly.length;
    const avgY = poly.reduce((s, p) => s + p.y, 0) / poly.length;
    expect(Math.round(avgX)).toBeGreaterThanOrEqual(45);
    expect(Math.round(avgX)).toBeLessThanOrEqual(55);
    expect(Math.round(avgY)).toBeGreaterThanOrEqual(45);
    expect(Math.round(avgY)).toBeLessThanOrEqual(55);
  });
});
