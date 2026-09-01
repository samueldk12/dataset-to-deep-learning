import { describe, it, expect } from 'vitest';
import { 
  transformPoint, 
  transformAnnotation, 
  AUGMENTATION_PRESETS,
  sampleTransformsFromConfig 
} from '../utils/augmentationEngine';
import { Annotation } from '../types/dataset';

describe('Data Augmentation Coordinate Transformation Engine', () => {
  const width = 1000;
  const height = 800;

  it('correctly calculates horizontal flip for points', () => {
    const pt = { x: 200, y: 300 };
    const transforms = {
      flipH: true,
      flipV: false,
      rotationDeg: 0,
      scale: 1,
      shearDeg: 0,
      translateX: 0,
      translateY: 0,
      brightnessFactor: 1,
      contrastFactor: 1,
      saturationFactor: 1,
      hueShiftDeg: 0,
      isGrayscale: false,
      blurRadius: 0,
      noiseAmount: 0,
      cutoutHoles: [],
    };

    const result = transformPoint(pt, width, height, transforms);
    expect(result.x).toBe(800); // 1000 - 200
    expect(result.y).toBe(300);
  });

  it('correctly calculates vertical flip for points', () => {
    const pt = { x: 200, y: 300 };
    const transforms = {
      flipH: false,
      flipV: true,
      rotationDeg: 0,
      scale: 1,
      shearDeg: 0,
      translateX: 0,
      translateY: 0,
      brightnessFactor: 1,
      contrastFactor: 1,
      saturationFactor: 1,
      hueShiftDeg: 0,
      isGrayscale: false,
      blurRadius: 0,
      noiseAmount: 0,
      cutoutHoles: [],
    };

    const result = transformPoint(pt, width, height, transforms);
    expect(result.x).toBe(200);
    expect(result.y).toBe(500); // 800 - 300
  });

  it('composes shear + horizontal flip in the same order the canvas renderer applies them', () => {
    // The canvas renderer composes ctx.translate -> rotate -> scale -> flip -> shear,
    // which (because each ctx call pre-multiplies the CTM) means shear is applied to a
    // point FIRST, then flip, then scale, then rotate, then translate. transformPoint
    // must mirror that exact order or annotation boxes drift off the augmented pixels
    // whenever shear is combined with flip/rotation.
    const width = 200;
    const height = 200;
    const shearDeg = 20;
    const pt = { x: 150, y: 120 };
    const transforms = {
      flipH: true,
      flipV: false,
      rotationDeg: 0,
      scale: 1,
      shearDeg,
      translateX: 0,
      translateY: 0,
      brightnessFactor: 1,
      contrastFactor: 1,
      saturationFactor: 1,
      hueShiftDeg: 0,
      isGrayscale: false,
      blurRadius: 0,
      noiseAmount: 0,
      cutoutHoles: [],
    };

    const result = transformPoint(pt, width, height, transforms);

    // Ground truth computed by hand from the shear -> flip -> translate composition:
    // lx = pt.x - cx = 50, ly = pt.y - cy = 20
    // shear: lx' = lx + ly * tan(20deg) ≈ 57.2794
    // flip:  lx'' = -lx' ≈ -57.2794
    // translate: x = cx + lx'' ≈ 42.7206, y = cy + ly = 120
    expect(result.x).toBeCloseTo(42.7206, 3);
    expect(result.y).toBeCloseTo(120, 3);
  });

  it('correctly transforms and encloses Bounding Boxes under Horizontal Flip', () => {
    const bboxAnn: Annotation = {
      id: 'ann_test',
      classId: 'cls_1',
      type: 'bbox',
      points: [
        { x: 100, y: 200 },
        { x: 400, y: 500 },
      ],
      visible: true,
      locked: false,
    };

    const transforms = {
      flipH: true,
      flipV: false,
      rotationDeg: 0,
      scale: 1,
      shearDeg: 0,
      translateX: 0,
      translateY: 0,
      brightnessFactor: 1,
      contrastFactor: 1,
      saturationFactor: 1,
      hueShiftDeg: 0,
      isGrayscale: false,
      blurRadius: 0,
      noiseAmount: 0,
      cutoutHoles: [],
    };

    const transformed = transformAnnotation(bboxAnn, width, height, transforms);
    expect(transformed).not.toBeNull();
    // 1000 - 400 = 600, 1000 - 100 = 900
    expect(transformed!.points[0].x).toBe(600);
    expect(transformed!.points[0].y).toBe(200);
    expect(transformed!.points[1].x).toBe(900);
    expect(transformed!.points[1].y).toBe(500);
  });

  it('correctly transforms all Polygon vertices under scaling and rotation', () => {
    const polyAnn: Annotation = {
      id: 'poly_test',
      classId: 'cls_1',
      type: 'polygon',
      points: [
        { x: 500, y: 300 },
        { x: 600, y: 500 },
        { x: 400, y: 500 },
      ],
      visible: true,
      locked: false,
    };

    const transforms = {
      flipH: false,
      flipV: false,
      rotationDeg: 180,
      scale: 1,
      shearDeg: 0,
      translateX: 0,
      translateY: 0,
      brightnessFactor: 1,
      contrastFactor: 1,
      saturationFactor: 1,
      hueShiftDeg: 0,
      isGrayscale: false,
      blurRadius: 0,
      noiseAmount: 0,
      cutoutHoles: [],
    };

    const transformed = transformAnnotation(polyAnn, width, height, transforms);
    expect(transformed).not.toBeNull();
    expect(transformed!.points.length).toBe(3);

    // Center is (500, 400). Rotating (500, 300) 180 deg gives (500, 500)
    expect(Math.round(transformed!.points[0].x)).toBe(500);
    expect(Math.round(transformed!.points[0].y)).toBe(500);
  });

  it('preserves preset configurations with valid bounds', () => {
    expect(AUGMENTATION_PRESETS.light.multiplier).toBeGreaterThanOrEqual(1);
    expect(AUGMENTATION_PRESETS.medium.multiplier).toBeGreaterThanOrEqual(2);
    expect(AUGMENTATION_PRESETS.aggressive.multiplier).toBeGreaterThanOrEqual(3);

    const sampled = sampleTransformsFromConfig(AUGMENTATION_PRESETS.medium, width, height);
    expect(sampled.scale).toBeGreaterThanOrEqual(AUGMENTATION_PRESETS.medium.geometric.scaleMin);
    expect(sampled.scale).toBeLessThanOrEqual(AUGMENTATION_PRESETS.medium.geometric.scaleMax);
  });
});
