import { Annotation, DatasetImage, Point } from '../types/dataset';
import { AugmentationPipelineConfig } from '../types/augmentation';
import { getBoundingBox } from './geometry';

export const AUGMENTATION_PRESETS: Record<'light' | 'medium' | 'aggressive', AugmentationPipelineConfig> = {
  light: {
    presetName: 'light',
    geometric: {
      horizontalFlip: true,
      horizontalFlipProb: 0.5,
      verticalFlip: false,
      verticalFlipProb: 0,
      rotation: true,
      rotationMinDeg: -10,
      rotationMaxDeg: 10,
      scale: true,
      scaleMin: 0.9,
      scaleMax: 1.1,
      shear: false,
      shearMaxDeg: 0,
      translate: false,
      translatePercent: 0,
      randomCrop: false,
      cropMinPercent: 90,
    },
    photometric: {
      brightness: true,
      brightnessJitter: 15,
      contrast: true,
      contrastJitter: 15,
      saturation: false,
      saturationJitter: 0,
      hue: false,
      hueShiftDeg: 0,
      grayscale: false,
      grayscaleProb: 0,
      blur: false,
      blurRadius: 1,
    },
    regularization: {
      gaussianNoise: false,
      noiseAmount: 0,
      cutout: false,
      cutoutNumHoles: 0,
      cutoutMaxSizePercent: 10,
    },
    multiplier: 2,
    preserveOriginals: true,
  },
  medium: {
    presetName: 'medium',
    geometric: {
      horizontalFlip: true,
      horizontalFlipProb: 0.5,
      verticalFlip: false,
      verticalFlipProb: 0.2,
      rotation: true,
      rotationMinDeg: -20,
      rotationMaxDeg: 20,
      scale: true,
      scaleMin: 0.8,
      scaleMax: 1.2,
      shear: true,
      shearMaxDeg: 8,
      translate: true,
      translatePercent: 10,
      randomCrop: false,
      cropMinPercent: 85,
    },
    photometric: {
      brightness: true,
      brightnessJitter: 25,
      contrast: true,
      contrastJitter: 25,
      saturation: true,
      saturationJitter: 20,
      hue: false,
      hueShiftDeg: 15,
      grayscale: true,
      grayscaleProb: 0.1,
      blur: true,
      blurRadius: 2,
    },
    regularization: {
      gaussianNoise: true,
      noiseAmount: 10,
      cutout: true,
      cutoutNumHoles: 2,
      cutoutMaxSizePercent: 15,
    },
    multiplier: 3,
    preserveOriginals: true,
  },
  aggressive: {
    presetName: 'aggressive',
    geometric: {
      horizontalFlip: true,
      horizontalFlipProb: 0.5,
      verticalFlip: true,
      verticalFlipProb: 0.5,
      rotation: true,
      rotationMinDeg: -45,
      rotationMaxDeg: 45,
      scale: true,
      scaleMin: 0.7,
      scaleMax: 1.3,
      shear: true,
      shearMaxDeg: 15,
      translate: true,
      translatePercent: 15,
      randomCrop: true,
      cropMinPercent: 75,
    },
    photometric: {
      brightness: true,
      brightnessJitter: 40,
      contrast: true,
      contrastJitter: 40,
      saturation: true,
      saturationJitter: 35,
      hue: true,
      hueShiftDeg: 30,
      grayscale: true,
      grayscaleProb: 0.2,
      blur: true,
      blurRadius: 3,
    },
    regularization: {
      gaussianNoise: true,
      noiseAmount: 20,
      cutout: true,
      cutoutNumHoles: 4,
      cutoutMaxSizePercent: 20,
    },
    multiplier: 5,
    preserveOriginals: true,
  },
};

export interface SampledTransforms {
  flipH: boolean;
  flipV: boolean;
  rotationDeg: number;
  scale: number;
  shearDeg: number;
  translateX: number;
  translateY: number;
  brightnessFactor: number;
  contrastFactor: number;
  saturationFactor: number;
  hueShiftDeg: number;
  isGrayscale: boolean;
  blurRadius: number;
  noiseAmount: number;
  cutoutHoles: Array<{ x: number; y: number; w: number; h: number }>;
}

export function sampleTransformsFromConfig(
  config: AugmentationPipelineConfig,
  imgWidth: number,
  imgHeight: number
): SampledTransforms {
  const g = config.geometric;
  const p = config.photometric;
  const r = config.regularization;

  const flipH = g.horizontalFlip && Math.random() < g.horizontalFlipProb;
  const flipV = g.verticalFlip && Math.random() < g.verticalFlipProb;

  const rotationDeg = g.rotation
    ? g.rotationMinDeg + Math.random() * (g.rotationMaxDeg - g.rotationMinDeg)
    : 0;

  const scale = g.scale
    ? g.scaleMin + Math.random() * (g.scaleMax - g.scaleMin)
    : 1;

  const shearDeg = g.shear
    ? (Math.random() * 2 - 1) * g.shearMaxDeg
    : 0;

  const maxTx = (imgWidth * (g.translatePercent || 0)) / 100;
  const maxTy = (imgHeight * (g.translatePercent || 0)) / 100;
  const translateX = g.translate ? (Math.random() * 2 - 1) * maxTx : 0;
  const translateY = g.translate ? (Math.random() * 2 - 1) * maxTy : 0;

  const brightnessFactor = p.brightness
    ? 1 + ((Math.random() * 2 - 1) * p.brightnessJitter) / 100
    : 1;

  const contrastFactor = p.contrast
    ? 1 + ((Math.random() * 2 - 1) * p.contrastJitter) / 100
    : 1;

  const saturationFactor = p.saturation
    ? 1 + ((Math.random() * 2 - 1) * p.saturationJitter) / 100
    : 1;

  const hueShiftDeg = p.hue
    ? (Math.random() * 2 - 1) * p.hueShiftDeg
    : 0;

  const isGrayscale = p.grayscale && Math.random() < p.grayscaleProb;
  const blurRadius = p.blur && Math.random() > 0.3 ? p.blurRadius : 0;
  const noiseAmount = r.gaussianNoise ? r.noiseAmount : 0;

  // Cutout holes
  const cutoutHoles: Array<{ x: number; y: number; w: number; h: number }> = [];
  if (r.cutout && r.cutoutNumHoles > 0) {
    const maxHoleW = (imgWidth * r.cutoutMaxSizePercent) / 100;
    const maxHoleH = (imgHeight * r.cutoutMaxSizePercent) / 100;
    for (let i = 0; i < r.cutoutNumHoles; i++) {
      const hw = Math.max(10, Math.random() * maxHoleW);
      const hh = Math.max(10, Math.random() * maxHoleH);
      const hx = Math.random() * (imgWidth - hw);
      const hy = Math.random() * (imgHeight - hh);
      cutoutHoles.push({ x: hx, y: hy, w: hw, h: hh });
    }
  }

  return {
    flipH,
    flipV,
    rotationDeg,
    scale,
    shearDeg,
    translateX,
    translateY,
    brightnessFactor,
    contrastFactor,
    saturationFactor,
    hueShiftDeg,
    isGrayscale,
    blurRadius,
    noiseAmount,
    cutoutHoles,
  };
}

/**
 * Transforms a single (x, y) point under sampled geometric transformations.
 */
export function transformPoint(
  pt: Point,
  width: number,
  height: number,
  t: SampledTransforms
): Point {
  const cx = width / 2;
  const cy = height / 2;

  // Must mirror the exact composition order the canvas renderer uses in
  // generateAugmentedImage (ctx.translate -> rotate -> scale -> flip -> shear):
  // since each ctx.* call pre-multiplies the CTM, a point is affected by the
  // *last*-called transform first. So per-point order is the reverse of the
  // ctx call order: shear -> flip -> scale -> rotate -> translate.
  let lx = pt.x - cx;
  let ly = pt.y - cy;

  // 1. Shear
  if (t.shearDeg !== 0) {
    const rad = (t.shearDeg * Math.PI) / 180;
    lx = lx + ly * Math.tan(rad);
  }

  // 2. Flip
  if (t.flipH) lx = -lx;
  if (t.flipV) ly = -ly;

  // 3. Scale around center
  if (t.scale !== 1) {
    lx *= t.scale;
    ly *= t.scale;
  }

  // 4. Rotation around center
  if (t.rotationDeg !== 0) {
    const rad = (t.rotationDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rx = lx * cos - ly * sin;
    const ry = lx * sin + ly * cos;
    lx = rx;
    ly = ry;
  }

  // 5. Translation
  const x = cx + t.translateX + lx;
  const y = cy + t.translateY + ly;

  return { x, y };
}

/**
 * Transforms an Annotation (BBox, Polygon, Keypoint) and clamps to image bounds.
 */
export function transformAnnotation(
  ann: Annotation,
  width: number,
  height: number,
  t: SampledTransforms
): Annotation | null {
  if (ann.type === 'bbox' && ann.points.length >= 2) {
    const box = getBoundingBox(ann.points, 'bbox');
    // Transform all 4 corners to accurately envelope rotated/sheared boxes
    const corners: Point[] = [
      { x: box.x, y: box.y },
      { x: box.x + box.width, y: box.y },
      { x: box.x + box.width, y: box.y + box.height },
      { x: box.x, y: box.y + box.height },
    ];

    const transformedCorners = corners.map((p) => transformPoint(p, width, height, t));
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const p of transformedCorners) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    // Clamp within image bounds
    minX = Math.max(0, Math.min(width, minX));
    minY = Math.max(0, Math.min(height, minY));
    maxX = Math.max(0, Math.min(width, maxX));
    maxY = Math.max(0, Math.min(height, maxY));

    // Reject degenerate or out-of-bounds bounding boxes
    if (maxX - minX < 4 || maxY - minY < 4) return null;

    return {
      ...ann,
      id: `ann_aug_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      points: [
        { x: minX, y: minY },
        { x: maxX, y: maxY },
      ],
    };
  }

  if (ann.type === 'polygon' && ann.points.length >= 3) {
    const transformedPoints = ann.points.map((p) => {
      const tp = transformPoint(p, width, height, t);
      return {
        x: Math.max(0, Math.min(width, tp.x)),
        y: Math.max(0, Math.min(height, tp.y)),
      };
    });

    return {
      ...ann,
      id: `ann_aug_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      points: transformedPoints,
    };
  }

  if (ann.type === 'keypoint' && ann.points.length > 0) {
    const tp = transformPoint(ann.points[0], width, height, t);
    if (tp.x < 0 || tp.x > width || tp.y < 0 || tp.y > height) return null;

    return {
      ...ann,
      id: `ann_aug_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      points: [{ x: Math.max(0, Math.min(width, tp.x)), y: Math.max(0, Math.min(height, tp.y)) }],
    };
  }

  // Polylines / Circles
  const transformedPoints = ann.points.map((p) => {
    const tp = transformPoint(p, width, height, t);
    return {
      x: Math.max(0, Math.min(width, tp.x)),
      y: Math.max(0, Math.min(height, tp.y)),
    };
  });

  return {
    ...ann,
    id: `ann_aug_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    points: transformedPoints,
  };
}

/**
 * Renders an augmented image canvas and returns a DataURL and transformed annotations.
 */
export async function generateAugmentedImage(
  sourceImage: DatasetImage,
  config: AugmentationPipelineConfig,
  variantIndex = 1
): Promise<DatasetImage | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = sourceImage.url;
    img.onload = () => {
      const width = sourceImage.width || img.naturalWidth || 800;
      const height = sourceImage.height || img.naturalHeight || 600;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      const t = sampleTransformsFromConfig(config, width, height);

      // Apply Canvas transformations
      ctx.save();

      // CSS Filters (Brightness, Contrast, Saturation, Hue, Grayscale, Blur)
      const filterList: string[] = [];
      if (t.brightnessFactor !== 1) filterList.push(`brightness(${Math.round(t.brightnessFactor * 100)}%)`);
      if (t.contrastFactor !== 1) filterList.push(`contrast(${Math.round(t.contrastFactor * 100)}%)`);
      if (t.saturationFactor !== 1) filterList.push(`saturate(${Math.round(t.saturationFactor * 100)}%)`);
      if (t.hueShiftDeg !== 0) filterList.push(`hue-rotate(${Math.round(t.hueShiftDeg)}deg)`);
      if (t.isGrayscale) filterList.push('grayscale(100%)');
      if (t.blurRadius > 0) filterList.push(`blur(${t.blurRadius}px)`);

      if (filterList.length > 0) {
        ctx.filter = filterList.join(' ');
      }

      const cx = width / 2;
      const cy = height / 2;

      ctx.translate(cx + t.translateX, cy + t.translateY);
      if (t.rotationDeg !== 0) ctx.rotate((t.rotationDeg * Math.PI) / 180);
      if (t.scale !== 1) ctx.scale(t.scale, t.scale);
      if (t.flipH || t.flipV) ctx.scale(t.flipH ? -1 : 1, t.flipV ? -1 : 1);
      if (t.shearDeg !== 0) ctx.transform(1, 0, Math.tan((t.shearDeg * Math.PI) / 180), 1, 0, 0);

      ctx.drawImage(img, -cx, -cy, width, height);
      ctx.restore();

      // Gaussian / Random Noise simulation
      if (t.noiseAmount > 0) {
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const factor = t.noiseAmount * 1.5;
        for (let i = 0; i < data.length; i += 4) {
          if (Math.random() < 0.25) {
            const noise = (Math.random() * 2 - 1) * factor;
            data[i] = Math.min(255, Math.max(0, data[i] + noise));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      // Cutout / Random Erasing
      if (t.cutoutHoles.length > 0) {
        ctx.fillStyle = '#7f7f7f'; // Neutral gray patch standard in DL Cutout
        for (const hole of t.cutoutHoles) {
          ctx.fillRect(hole.x, hole.y, hole.w, hole.h);
        }
      }

      const augmentedDataUrl = canvas.toDataURL('image/jpeg', 0.92);

      // Transform all annotations
      const transformedAnnotations: Annotation[] = [];
      for (const ann of sourceImage.annotations) {
        const transformed = transformAnnotation(ann, width, height, t);
        if (transformed) transformedAnnotations.push(transformed);
      }

      const baseName = sourceImage.name.replace(/\.[^/.]+$/, '');
      const ext = sourceImage.name.includes('.') ? sourceImage.name.split('.').pop() : 'jpg';

      resolve({
        id: `img_aug_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: `${baseName}_aug${variantIndex}.${ext}`,
        url: augmentedDataUrl,
        width,
        height,
        annotations: transformedAnnotations,
        tags: [...(sourceImage.tags || []), 'augmented'],
        status: transformedAnnotations.length > 0 ? 'completed' : 'unannotated',
      });
    };
    img.onerror = () => resolve(null);
  });
}
