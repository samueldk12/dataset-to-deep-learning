import { parquetWriteBuffer, ColumnSource } from 'hyparquet-writer';
import { saveAs } from 'file-saver';
import { DatasetProject } from '../types/dataset';
import { exportImageToYOLO } from './formatParsers';
import { getBoundingBox } from './geometry';

export interface ParquetExportOptions {
  imageFormat: 'jpg' | 'png' | 'webp';
  quality?: number;
  includeRawImages: boolean;
  targetClassSetId?: string;
}

/**
 * Converts a data URL to a Uint8Array byte buffer.
 */
async function dataUrlToUint8Array(dataUrl: string, targetFormat: 'jpg' | 'png' | 'webp' = 'jpg', quality = 0.9): Promise<Uint8Array> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 600;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const mime = targetFormat === 'png' ? 'image/png' : targetFormat === 'webp' ? 'image/webp' : 'image/jpeg';
      canvas.toBlob((blob) => {
        if (!blob) {
          return resolve(new Uint8Array(0));
        }
        const reader = new FileReader();
        reader.onload = () => {
          resolve(new Uint8Array(reader.result as ArrayBuffer));
        };
        reader.readAsArrayBuffer(blob);
      }, mime, quality);
    };
    img.onerror = () => resolve(new Uint8Array(0));
    img.src = dataUrl;
  });
}

/**
 * Exports the entire dataset to a single standard Apache Parquet (.parquet) file.
 * Compatible with Hugging Face Datasets, PyArrow, DuckDB, Polars and Pandas.
 */
export async function exportDatasetToParquet(
  project: DatasetProject,
  options: ParquetExportOptions,
  onProgress?: (percent: number, status: string) => void
): Promise<void> {
  const total = project.images.length;
  const projectName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'dataset';

  onProgress?.(10, 'Preparando colunas e esquema Parquet...');

  const classMap = new Map<string, number>();
  project.classes.forEach((c, idx) => classMap.set(c.id, idx));
  const classNamesMap = new Map<string, string>();
  project.classes.forEach((c) => classNamesMap.set(c.id, c.name));

  const image_id: string[] = [];
  const filename: string[] = [];
  const width: number[] = [];
  const height: number[] = [];
  const image_bytes: Uint8Array[] = [];
  const format: string[] = [];
  const num_annotations: number[] = [];
  const yolo_annotations: string[] = [];
  const annotations_json: string[] = [];
  const tags: string[] = [];
  const split: string[] = [];

  for (let i = 0; i < project.images.length; i++) {
    const img = project.images[i];
    const percent = Math.round(10 + (i / total) * 75);
    onProgress?.(percent, `Codificando imagem ${i + 1}/${total} para Parquet...`);

    const bytes = options.includeRawImages 
      ? await dataUrlToUint8Array(img.url, options.imageFormat, options.quality || 0.9)
      : new Uint8Array(0);

    const yoloTxt = exportImageToYOLO(img, classMap, 'detection');
    const annotationsFormatted = img.annotations.map((a) => ({
      id: a.id,
      class_id: a.classId,
      class_name: classNamesMap.get(a.classId) || 'unknown',
      type: a.type,
      points: a.points,
      bbox: getBoundingBox(a.points, a.type),
    }));

    image_id.push(img.id);
    filename.push(img.name);
    width.push(img.width);
    height.push(img.height);
    image_bytes.push(bytes);
    format.push(options.imageFormat);
    num_annotations.push(img.annotations.length);
    yolo_annotations.push(yoloTxt);
    annotations_json.push(JSON.stringify(annotationsFormatted));
    tags.push(img.tags.join(', '));
    split.push(i % 5 === 0 ? 'val' : 'train');
  }

  onProgress?.(88, 'Construindo arquivo Parquet colunar...');

  const columnData: ColumnSource[] = [
    { name: 'image_id', data: image_id },
    { name: 'filename', data: filename },
    { name: 'width', data: width },
    { name: 'height', data: height },
    { name: 'image', data: image_bytes },
    { name: 'format', data: format },
    { name: 'num_annotations', data: num_annotations },
    { name: 'yolo_annotations', data: yolo_annotations },
    { name: 'annotations_json', data: annotations_json },
    { name: 'tags', data: tags },
    { name: 'split', data: split },
  ];

  try {
    const arrayBuffer = parquetWriteBuffer({
      columnData,
    });

    onProgress?.(100, 'Download iniciado!');
    const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `${projectName}.parquet`);
  } catch (err) {
    console.error('Erro na serialização Parquet:', err);
    const rows = image_id.map((_, i) => ({
      image_id: image_id[i],
      filename: filename[i],
      width: width[i],
      height: height[i],
      format: format[i],
      num_annotations: num_annotations[i],
      yolo_annotations: yolo_annotations[i],
      annotations_json: annotations_json[i],
      tags: tags[i],
      split: split[i],
    }));

    const jsonl = rows.map((r) => JSON.stringify(r)).join('\n');
    const blob = new Blob([jsonl], { type: 'application/json' });
    saveAs(blob, `${projectName}_dataset.jsonl`);
  }
}
