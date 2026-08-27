import { Annotation, Point } from './dataset';

export interface GeometricAugConfig {
  horizontalFlip: boolean;
  horizontalFlipProb: number; // 0 to 1
  verticalFlip: boolean;
  verticalFlipProb: number; // 0 to 1
  rotation: boolean;
  rotationMinDeg: number; // -180 to 180
  rotationMaxDeg: number; // -180 to 180
  scale: boolean;
  scaleMin: number; // 0.5 to 1.0
  scaleMax: number; // 1.0 to 1.5
  shear: boolean;
  shearMaxDeg: number; // 0 to 30
  translate: boolean;
  translatePercent: number; // 0 to 30%
  randomCrop: boolean;
  cropMinPercent: number; // 60 to 95%
}

export interface PhotometricAugConfig {
  brightness: boolean;
  brightnessJitter: number; // 0 to 50%
  contrast: boolean;
  contrastJitter: number; // 0 to 50%
  saturation: boolean;
  saturationJitter: number; // 0 to 50%
  hue: boolean;
  hueShiftDeg: number; // 0 to 60 deg
  grayscale: boolean;
  grayscaleProb: number; // 0 to 1
  blur: boolean;
  blurRadius: number; // 1 to 10 px
}

export interface RegularizationAugConfig {
  gaussianNoise: boolean;
  noiseAmount: number; // 1 to 50%
  cutout: boolean;
  cutoutNumHoles: number; // 1 to 8
  cutoutMaxSizePercent: number; // 5 to 25%
}

export interface AugmentationPipelineConfig {
  presetName?: 'light' | 'medium' | 'aggressive' | 'custom';
  geometric: GeometricAugConfig;
  photometric: PhotometricAugConfig;
  regularization: RegularizationAugConfig;
  multiplier: number; // 1 to 10 variations per image
  preserveOriginals: boolean;
}

export interface TransformedAnnotationResult {
  annotations: Annotation[];
  canvasWidth: number;
  canvasHeight: number;
}
