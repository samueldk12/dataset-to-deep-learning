import JSZip from 'jszip';
import { 
  DatasetProject, 
  DatasetImage, 
  DatasetClass, 
  Annotation, 
  DomainCategory, 
  DatasetTaskType, 
  TextDatasetItem, 
  AudioDatasetItem,
  Point
} from '../types/dataset';
import { 
  parseCOCO, 
  parsePascalVOC, 
  parseYOLOLine, 
  getRandomColor, 
  COCODataset 
} from './formatParsers';
import { getImageDimensions } from './zipHandler';

export interface ImportedDatasetResult {
  name: string;
  description: string;
  domain: DomainCategory;
  taskType: DatasetTaskType;
  classes: DatasetClass[];
  images: DatasetImage[];
  textItems: TextDatasetItem[];
  audioItems: AudioDatasetItem[];
  totalAnnotations: number;
  fileCount: number;
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function fileToText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Parses a collection of files (ZIP archive or multiple loose images and annotation files)
 * and returns a ready-to-use DatasetProject structure.
 */
export async function parseImportFiles(
  files: File[] | FileList,
  onProgress?: (percent: number, status: string) => void
): Promise<ImportedDatasetResult> {
  const fileArray = Array.from(files);
  if (fileArray.length === 0) {
    throw new Error('Nenhum arquivo fornecido para importação.');
  }
  if (fileArray.length > 10000) {
    throw new Error('A importação está limitada a 10.000 arquivos por operação.');
  }
  const totalBytes = fileArray.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > 2 * 1024 * 1024 * 1024) {
    throw new Error('O tamanho total da importação não pode exceder 2 GB.');
  }

  // 1. Check if a ZIP file is present
  const zipFile = fileArray.find((f) => f.name.toLowerCase().endsWith('.zip'));
  if (zipFile) {
    return parseZipArchive(zipFile, onProgress);
  }

  // 2. Parse collection of loose files (images + annotations)
  return parseLooseFiles(fileArray, onProgress);
}

/**
 * Parses a ZIP file containing images, annotations, configs, etc.
 */
async function parseZipArchive(
  zipFile: File,
  onProgress?: (percent: number, status: string) => void
): Promise<ImportedDatasetResult> {
  onProgress?.(10, `Lendo arquivo ZIP: ${zipFile.name}...`);
  const zip = await JSZip.loadAsync(zipFile);

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'];
  const imageFiles: Array<{ name: string; zipObj: JSZip.JSZipObject }> = [];
  const yoloTxtFiles = new Map<string, JSZip.JSZipObject>();
  const vocXmlFiles = new Map<string, JSZip.JSZipObject>();
  let foundCocoFile: JSZip.JSZipObject | null = null;
  let foundProjectJson: JSZip.JSZipObject | null = null;
  let foundClassesTxt: JSZip.JSZipObject | null = null;
  let foundDataYaml: JSZip.JSZipObject | null = null;

  zip.forEach((path, entry) => {
    if (entry.dir) return;
    const lower = path.toLowerCase();
    const baseName = path.split('/').pop() || path;

    if (imageExtensions.some((ext) => lower.endsWith(ext))) {
      imageFiles.push({ name: baseName, zipObj: entry });
    } else if (lower.endsWith('_annotations.coco.json') || lower.endsWith('instances_default.json') || (lower.endsWith('.json') && lower.includes('coco'))) {
      foundCocoFile = entry;
    } else if (lower.endsWith('dataset.json') || lower.endsWith('config.json') || lower.endsWith('project.json')) {
      foundProjectJson = entry;
    } else if (lower.endsWith('classes.txt') || lower.endsWith('labels.txt')) {
      foundClassesTxt = entry;
    } else if (lower.endsWith('data.yaml') || lower.endsWith('dataset.yaml')) {
      foundDataYaml = entry;
    } else if (lower.endsWith('.txt')) {
      const cleanBase = baseName.replace(/\.txt$/, '');
      yoloTxtFiles.set(cleanBase, entry);
    } else if (lower.endsWith('.xml')) {
      const cleanBase = baseName.replace(/\.xml$/, '');
      vocXmlFiles.set(cleanBase, entry);
    }
  });

  const classes: DatasetClass[] = [];
  let discoveredDomain: DomainCategory = 'vision';
  let discoveredTask: DatasetTaskType = 'object_detection';
  let datasetName = zipFile.name.replace(/\.zip$/i, '').replace(/[-_]/g, ' ');
  let datasetDescription = `Dataset importado de ${zipFile.name}`;

  // Parse classes.txt if present
  if (foundClassesTxt) {
    const text = await (foundClassesTxt as JSZip.JSZipObject).async('text');
    const lines = text.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
    lines.forEach((name: string, idx: number) => {
      if (!classes.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        classes.push({
          id: `cls_${Date.now()}_${idx}`,
          name,
          color: getRandomColor(classes.length),
          visible: true,
          locked: false,
          shortcutKey: idx < 9 ? String(idx + 1) : undefined,
        });
      }
    });
  }

  // Parse data.yaml if present
  if (foundDataYaml && classes.length === 0) {
    const yamlText = await (foundDataYaml as JSZip.JSZipObject).async('text');
    const namesMatch = yamlText.match(/names:\s*\[(.*?)\]/s) || yamlText.match(/names:\s*\n((?:\s*-\s*.*\n?)+)/);
    if (namesMatch) {
      const rawNames = namesMatch[1]
        .split(/[\n,]/)
        .map((s: string) => s.replace(/['"-\s]/g, '').trim())
        .filter(Boolean);
      rawNames.forEach((name: string, idx: number) => {
        if (!classes.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
          classes.push({
            id: `cls_${Date.now()}_${idx}`,
            name,
            color: getRandomColor(classes.length),
            visible: true,
            locked: false,
            shortcutKey: idx < 9 ? String(idx + 1) : undefined,
          });
        }
      });
    }
  }

  // Parse project.json / config.json if present
  if (foundProjectJson) {
    try {
      const jsonText = await (foundProjectJson as JSZip.JSZipObject).async('text');
      const parsed = JSON.parse(jsonText);
      if (parsed.name) datasetName = parsed.name;
      if (parsed.description) datasetDescription = parsed.description;
      if (parsed.domain) discoveredDomain = parsed.domain;
      if (parsed.taskType) discoveredTask = parsed.taskType;
      if (Array.isArray(parsed.classes)) {
        parsed.classes.forEach((cls: DatasetClass) => {
          if (!classes.some((c) => c.name.toLowerCase() === cls.name.toLowerCase())) {
            classes.push(cls);
          }
        });
      }
    } catch (e) {
      console.warn('Erro ao processar JSON de metadados do ZIP', e);
    }
  }

  // Parse COCO file if present
  let cocoAnnotationsMap: Map<string, Annotation[]> | null = null;
  if (foundCocoFile) {
    onProgress?.(30, 'Processando anotações COCO...');
    try {
      const cocoText = await (foundCocoFile as JSZip.JSZipObject).async('text');
      const cocoJson: COCODataset = JSON.parse(cocoText);
      const parsedCoco = parseCOCO(cocoJson, classes);
      classes.splice(0, classes.length, ...parsedCoco.classes);
      cocoAnnotationsMap = parsedCoco.imagesWithAnnotations;
    } catch (e) {
      console.warn('Erro ao processar anotações COCO do ZIP', e);
    }
  }

  const images: DatasetImage[] = [];
  let totalAnnotations = 0;
  let hasPolygons = false;

  for (let i = 0; i < imageFiles.length; i++) {
    const item = imageFiles[i];
    const percent = Math.round(35 + (i / Math.max(1, imageFiles.length)) * 60);
    onProgress?.(percent, `Processando imagem ${i + 1}/${imageFiles.length}: ${item.name}`);

    const blob = await item.zipObj.async('blob');
    const dataUrl = await fileToDataUrl(blob);
    const { width, height } = await getImageDimensions(dataUrl);

    const baseName = item.name.replace(/\.[^/.]+$/, '');
    let annotations: Annotation[] = [];

    if (cocoAnnotationsMap && cocoAnnotationsMap.has(item.name)) {
      annotations = cocoAnnotationsMap.get(item.name) || [];
    } else if (yoloTxtFiles.has(baseName)) {
      const txt = await yoloTxtFiles.get(baseName)!.async('text');
      const lines = txt.split(/\r?\n/).filter((l) => l.trim().length > 0);
      lines.forEach((line) => {
        const ann = parseYOLOLine(line, width, height, classes);
        if (ann) {
          annotations.push(ann);
          if (ann.type === 'polygon') hasPolygons = true;
        }
      });
    } else if (vocXmlFiles.has(baseName)) {
      const xml = await vocXmlFiles.get(baseName)!.async('text');
      const res = parsePascalVOC(xml, classes);
      annotations = res.annotations;
      classes.splice(0, classes.length, ...res.updatedClasses);
    }

    if (annotations.some((a) => a.type === 'polygon')) hasPolygons = true;
    totalAnnotations += annotations.length;

    images.push({
      id: `img_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
      name: item.name,
      url: dataUrl,
      width,
      height,
      size: blob.size,
      annotations,
      tags: [],
      status: annotations.length > 0 ? 'completed' : 'unannotated',
      fileBlob: blob,
    });
  }

  // Ensure default class if none discovered
  if (classes.length === 0) {
    classes.push({
      id: `cls_${Date.now()}_0`,
      name: 'Objeto',
      color: '#3b82f6',
      visible: true,
      locked: false,
      shortcutKey: '1',
    });
  }

  if (hasPolygons && discoveredTask === 'object_detection') {
    discoveredTask = 'instance_segmentation';
  }

  onProgress?.(100, 'Importação de ZIP concluída!');

  return {
    name: datasetName,
    description: datasetDescription,
    domain: discoveredDomain,
    taskType: discoveredTask,
    classes,
    images,
    textItems: [],
    audioItems: [],
    totalAnnotations,
    fileCount: imageFiles.length,
  };
}

/**
 * Parses loose files (images + annotation files like .txt, .json, .xml, .csv, .jsonl, .wav, .mp3).
 */
async function parseLooseFiles(
  files: File[],
  onProgress?: (percent: number, status: string) => void
): Promise<ImportedDatasetResult> {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'];
  const audioExtensions = ['.wav', '.mp3', '.ogg', '.flac', '.m4a'];

  const imageFiles: File[] = [];
  const audioFiles: File[] = [];
  const yoloTxtMap = new Map<string, File>();
  const vocXmlMap = new Map<string, File>();
  let cocoFile: File | null = null;
  let classesTxtFile: File | null = null;
  let dataYamlFile: File | null = null;
  let jsonlFile: File | null = null;

  files.forEach((f) => {
    const lower = f.name.toLowerCase();
    const baseName = f.name.replace(/\.[^/.]+$/, '');

    if (imageExtensions.some((ext) => lower.endsWith(ext))) {
      imageFiles.push(f);
    } else if (audioExtensions.some((ext) => lower.endsWith(ext))) {
      audioFiles.push(f);
    } else if (lower.endsWith('classes.txt') || lower.endsWith('labels.txt')) {
      classesTxtFile = f;
    } else if (lower.endsWith('data.yaml') || lower.endsWith('dataset.yaml')) {
      dataYamlFile = f;
    } else if (lower.endsWith('_annotations.coco.json') || (lower.endsWith('.json') && lower.includes('coco'))) {
      cocoFile = f;
    } else if (lower.endsWith('.jsonl')) {
      jsonlFile = f;
    } else if (lower.endsWith('.txt')) {
      yoloTxtMap.set(baseName, f);
    } else if (lower.endsWith('.xml')) {
      vocXmlMap.set(baseName, f);
    }
  });

  const classes: DatasetClass[] = [];
  let domain: DomainCategory = 'vision';
  let taskType: DatasetTaskType = 'object_detection';
  let datasetName = 'Novo Dataset Importado';

  if (imageFiles.length > 0) {
    domain = 'vision';
    taskType = 'object_detection';
    datasetName = `Dataset de Imagens (${imageFiles.length} arquivos)`;
  } else if (audioFiles.length > 0) {
    domain = 'audio';
    taskType = 'speech_recognition_asr';
    datasetName = `Dataset de Áudio (${audioFiles.length} arquivos)`;
  } else if (jsonlFile) {
    domain = 'nlp';
    taskType = 'extractive_qa';
    datasetName = `Dataset NLP (${(jsonlFile as File).name})`;
  }

  // 1. Parse classes.txt
  if (classesTxtFile) {
    const text = await fileToText(classesTxtFile);
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    lines.forEach((name, idx) => {
      if (!classes.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        classes.push({
          id: `cls_${Date.now()}_${idx}`,
          name,
          color: getRandomColor(classes.length),
          visible: true,
          locked: false,
          shortcutKey: idx < 9 ? String(idx + 1) : undefined,
        });
      }
    });
  }

  // 2. Parse data.yaml
  if (dataYamlFile && classes.length === 0) {
    const text = await fileToText(dataYamlFile);
    const namesMatch = text.match(/names:\s*\[(.*?)\]/s) || text.match(/names:\s*\n((?:\s*-\s*.*\n?)+)/);
    if (namesMatch) {
      const rawNames = namesMatch[1]
        .split(/[\n,]/)
        .map((s) => s.replace(/['"-\s]/g, '').trim())
        .filter(Boolean);
      rawNames.forEach((name, idx) => {
        if (!classes.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
          classes.push({
            id: `cls_${Date.now()}_${idx}`,
            name,
            color: getRandomColor(classes.length),
            visible: true,
            locked: false,
            shortcutKey: idx < 9 ? String(idx + 1) : undefined,
          });
        }
      });
    }
  }

  // 3. Parse COCO JSON
  let cocoAnnotationsMap: Map<string, Annotation[]> | null = null;
  if (cocoFile) {
    onProgress?.(25, 'Processando arquivo COCO JSON...');
    try {
      const text = await fileToText(cocoFile);
      const cocoJson: COCODataset = JSON.parse(text);
      const parsedCoco = parseCOCO(cocoJson, classes);
      classes.splice(0, classes.length, ...parsedCoco.classes);
      cocoAnnotationsMap = parsedCoco.imagesWithAnnotations;
    } catch (e) {
      console.warn('Erro ao processar COCO JSON', e);
    }
  }

  // 4. Process Images and map annotations
  const images: DatasetImage[] = [];
  let totalAnnotations = 0;
  let hasPolygons = false;

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const percent = Math.round(30 + (i / Math.max(1, imageFiles.length)) * 65);
    onProgress?.(percent, `Carregando imagem ${i + 1}/${imageFiles.length}: ${file.name}`);

    const dataUrl = await fileToDataUrl(file);
    const { width, height } = await getImageDimensions(dataUrl);

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    let annotations: Annotation[] = [];

    if (cocoAnnotationsMap && cocoAnnotationsMap.has(file.name)) {
      annotations = cocoAnnotationsMap.get(file.name) || [];
    } else if (yoloTxtMap.has(baseName)) {
      const txt = await fileToText(yoloTxtMap.get(baseName)!);
      const lines = txt.split(/\r?\n/).filter((l) => l.trim().length > 0);
      lines.forEach((line) => {
        const ann = parseYOLOLine(line, width, height, classes);
        if (ann) {
          annotations.push(ann);
          if (ann.type === 'polygon') hasPolygons = true;
        }
      });
    } else if (vocXmlMap.has(baseName)) {
      const xml = await fileToText(vocXmlMap.get(baseName)!);
      const res = parsePascalVOC(xml, classes);
      annotations = res.annotations;
      classes.splice(0, classes.length, ...res.updatedClasses);
    }

    if (annotations.some((a) => a.type === 'polygon')) hasPolygons = true;
    totalAnnotations += annotations.length;

    images.push({
      id: `img_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
      name: file.name,
      url: dataUrl,
      width,
      height,
      size: file.size,
      annotations,
      tags: [],
      status: annotations.length > 0 ? 'completed' : 'unannotated',
      fileBlob: file,
    });
  }

  // 5. Process Audio Files if present
  const audioItems: AudioDatasetItem[] = [];
  for (let i = 0; i < audioFiles.length; i++) {
    const file = audioFiles[i];
    const dataUrl = await fileToDataUrl(file);
    audioItems.push({
      id: `audio_${Date.now()}_${i}`,
      name: file.name,
      audioUrl: dataUrl,
      durationSec: 0,
      transcription: '',
      status: 'unannotated',
    });
  }

  // Ensure fallback class
  if (classes.length === 0) {
    classes.push({
      id: `cls_${Date.now()}_0`,
      name: domain === 'nlp' ? 'Entidade' : domain === 'audio' ? 'Orador' : 'Objeto',
      color: '#3b82f6',
      visible: true,
      locked: false,
      shortcutKey: '1',
    });
  }

  if (hasPolygons && taskType === 'object_detection') {
    taskType = 'instance_segmentation';
  }

  onProgress?.(100, 'Importação concluída!');

  return {
    name: datasetName,
    description: `Dataset criado com ${imageFiles.length} imagens e ${totalAnnotations} anotações.`,
    domain,
    taskType,
    classes,
    images,
    textItems: [],
    audioItems,
    totalAnnotations,
    fileCount: files.length,
  };
}
