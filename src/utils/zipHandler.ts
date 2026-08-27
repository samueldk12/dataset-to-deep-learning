import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { DatasetProject, ExportFormat, DatasetImage, Annotation, DatasetClass, ClassSet } from '../types/dataset';
import { exportToCOCO, exportImageToYOLO, generateYOLODataYaml, generateClassesTxt, exportImageToPascalVOC, exportToCSV, parseCOCO, parseYOLOLine, parsePascalVOC } from './formatParsers';

export interface ExportZipOptions {
  format: ExportFormat;
  targetClassSetId?: string;
  exportAllClassSets?: boolean;
}

/**
 * Downloads a dataset package as a ZIP archive according to the selected format and class sets.
 */
export async function downloadDatasetZip(
  project: DatasetProject,
  options: ExportZipOptions | ExportFormat,
  onProgress?: (percent: number, status: string) => void
): Promise<void> {
  const zip = new JSZip();
  const format: ExportFormat = typeof options === 'string' ? options : options.format;
  const exportAll: boolean = typeof options === 'object' ? !!options.exportAllClassSets : false;
  const targetClassSetId: string | undefined = typeof options === 'object' ? options.targetClassSetId : undefined;

  const total = project.images.length;
  const projectName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'annotated_dataset';

  onProgress?.(10, 'Preparando estrutura do dataset...');

  // Helper to get project slice for a specific class set
  const getProjectSliceForClassSet = (classSet: ClassSet): DatasetProject => {
    const cSetId = classSet.id;
    const imagesSlice: DatasetImage[] = project.images.map((img) => {
      const layerAnns = img.annotationLayers?.[cSetId] !== undefined 
        ? img.annotationLayers[cSetId] 
        : (project.activeClassSetId === cSetId ? img.annotations : []);

      return {
        ...img,
        annotations: layerAnns,
        status: layerAnns.length > 0 ? 'completed' : 'unannotated',
      };
    });

    return {
      ...project,
      name: `${project.name}_${classSet.name}`,
      classes: classSet.classes,
      images: imagesSlice,
    };
  };

  // If exporting ALL Class Sets as separate dataset folders in the same ZIP
  if (exportAll && project.classSets && project.classSets.length > 1) {
    onProgress?.(20, `Exportando ${project.classSets.length} conjuntos de classes independentes...`);

    for (let cIdx = 0; cIdx < project.classSets.length; cIdx++) {
      const cSet = project.classSets[cIdx];
      const folderName = `dataset_${cIdx + 1}_${cSet.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const subFolder = zip.folder(folderName)!;
      const slice = getProjectSliceForClassSet(cSet);

      await populateZipWithProject(subFolder, slice, format, (p, s) => {
        const overall = Math.round(((cIdx + p / 100) / project.classSets.length) * 75) + 10;
        onProgress?.(overall, `[${cSet.name}] ${s}`);
      });
    }
  } else {
    // Single class set export
    let activeClassSet = project.classSets?.find((cs) => cs.id === targetClassSetId);
    if (!activeClassSet) {
      activeClassSet = project.classSets?.find((cs) => cs.id === project.activeClassSetId) || {
        id: 'default',
        name: 'Padrão',
        classes: project.classes,
        createdAt: Date.now(),
      };
    }

    const slice = getProjectSliceForClassSet(activeClassSet);
    await populateZipWithProject(zip, slice, format, onProgress);
  }

  onProgress?.(88, 'Compactando arquivo ZIP final...');
  const zipContent = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    onProgress?.(88 + Math.round(metadata.percent * 0.12), 'Finalizando compactação...');
  });

  onProgress?.(100, 'Download iniciado!');
  const suffix = exportAll ? 'multi_taxonomia' : format;
  saveAs(zipContent, `${projectName}_${suffix}.zip`);
}

/**
 * Populates a JSZip folder with the dataset files in the specified format.
 */
async function populateZipWithProject(
  root: JSZip,
  project: DatasetProject,
  format: ExportFormat,
  onProgress?: (percent: number, status: string) => void
): Promise<void> {
  const total = project.images.length;
  const classMap = new Map<string, number>();
  project.classes.forEach((c, idx) => classMap.set(c.id, idx));

  if (format === 'yolo') {
    const imagesFolder = root.folder('images')!;
    const labelsFolder = root.folder('labels')!;

    root.file('data.yaml', generateYOLODataYaml(project));
    root.file('classes.txt', generateClassesTxt(project.classes));

    for (let i = 0; i < project.images.length; i++) {
      const img = project.images[i];
      const percent = Math.round((i / total) * 70);
      onProgress?.(percent, `Processando imagem ${i + 1}/${total}: ${img.name}`);

      const blob = await getImageBlob(img);
      if (blob) {
        imagesFolder.file(img.name, blob);
      }

      const baseName = img.name.replace(/\.[^/.]+$/, '');
      const yoloTxt = exportImageToYOLO(img, classMap, 'detection');
      labelsFolder.file(`${baseName}.txt`, yoloTxt);
    }
  } else if (format === 'coco') {
    const imagesFolder = root.folder('images')!;
    const cocoData = exportToCOCO(project);
    root.file('_annotations.coco.json', JSON.stringify(cocoData, null, 2));

    for (let i = 0; i < project.images.length; i++) {
      const img = project.images[i];
      const percent = Math.round((i / total) * 70);
      onProgress?.(percent, `Processando imagem ${i + 1}/${total}: ${img.name}`);

      const blob = await getImageBlob(img);
      if (blob) {
        imagesFolder.file(img.name, blob);
      }
    }
  } else if (format === 'voc') {
    const jpegFolder = root.folder('JPEGImages')!;
    const annotationsFolder = root.folder('Annotations')!;

    for (let i = 0; i < project.images.length; i++) {
      const img = project.images[i];
      const percent = Math.round((i / total) * 70);
      onProgress?.(percent, `Processando imagem ${i + 1}/${total}: ${img.name}`);

      const blob = await getImageBlob(img);
      if (blob) {
        jpegFolder.file(img.name, blob);
      }

      const baseName = img.name.replace(/\.[^/.]+$/, '');
      const vocXml = exportImageToPascalVOC(img, project.classes);
      annotationsFolder.file(`${baseName}.xml`, vocXml);
    }
  } else if (format === 'masks') {
    const imagesFolder = root.folder('images')!;
    const masksFolder = root.folder('masks')!;

    for (let i = 0; i < project.images.length; i++) {
      const img = project.images[i];
      const percent = Math.round((i / total) * 70);
      onProgress?.(percent, `Gerando máscara da imagem ${i + 1}/${total}: ${img.name}`);

      const blob = await getImageBlob(img);
      if (blob) {
        imagesFolder.file(img.name, blob);
      }

      const maskBlob = await generateSegmentationMask(img, project.classes);
      const baseName = img.name.replace(/\.[^/.]+$/, '');
      if (maskBlob) {
        masksFolder.file(`${baseName}_mask.png`, maskBlob);
      }
    }
  } else if (format === 'csv') {
    const csvContent = exportToCSV(project);
    root.file('annotations.csv', csvContent);

    const imagesFolder = root.folder('images')!;
    for (let i = 0; i < project.images.length; i++) {
      const img = project.images[i];
      const blob = await getImageBlob(img);
      if (blob) {
        imagesFolder.file(img.name, blob);
      }
    }
  } else {
    const imagesFolder = root.folder('images')!;
    const projectMeta = {
      name: project.name,
      description: project.description,
      classes: project.classes,
      classSets: project.classSets,
      images: project.images.map((img) => ({
        id: img.id,
        name: img.name,
        width: img.width,
        height: img.height,
        status: img.status,
        tags: img.tags,
        annotations: img.annotations,
        annotationLayers: img.annotationLayers,
      })),
      exportedAt: new Date().toISOString(),
    };

    root.file('dataset_project.json', JSON.stringify(projectMeta, null, 2));

    for (let i = 0; i < project.images.length; i++) {
      const img = project.images[i];
      const blob = await getImageBlob(img);
      if (blob) {
        imagesFolder.file(img.name, blob);
      }
    }
  }
}

/**
 * Parses an uploaded ZIP file and extracts images and annotations.
 */
export async function parseDatasetZip(
  zipFile: File,
  currentProject: DatasetProject,
  onProgress?: (percent: number, status: string) => void
): Promise<{ newImages: DatasetImage[]; updatedClasses: DatasetProject['classes'] }> {
  const zip = new JSZip();
  onProgress?.(10, 'Lendo arquivo ZIP...');
  const loadedZip = await zip.loadAsync(zipFile);

  const entries = Object.keys(loadedZip.files);
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.svg'];

  const imageFiles: Array<{ name: string; zipObj: JSZip.JSZipObject }> = [];
  let foundCocoFile: JSZip.JSZipObject | null = null;
  let foundProjectJsonFile: JSZip.JSZipObject | null = null;
  const yoloTxtFiles = new Map<string, JSZip.JSZipObject>();
  const vocXmlFiles = new Map<string, JSZip.JSZipObject>();

  entries.forEach((filename) => {
    const entry = loadedZip.files[filename];
    if (entry.dir) return;

    const lower = filename.toLowerCase();
    const isImage = imageExtensions.some((ext) => lower.endsWith(ext));

    if (isImage) {
      const baseName = filename.split('/').pop() || filename;
      imageFiles.push({ name: baseName, zipObj: entry });
    } else if (lower.endsWith('_annotations.coco.json') || lower.endsWith('instances_default.json') || (lower.endsWith('.json') && lower.includes('coco'))) {
      foundCocoFile = entry;
    } else if (lower.endsWith('dataset_project.json') || lower.endsWith('project.json')) {
      foundProjectJsonFile = entry;
    } else if (lower.endsWith('.txt') && !lower.endsWith('classes.txt')) {
      const baseName = filename.split('/').pop()?.replace(/\.txt$/, '') || '';
      yoloTxtFiles.set(baseName, entry);
    } else if (lower.endsWith('.xml')) {
      const baseName = filename.split('/').pop()?.replace(/\.xml$/, '') || '';
      vocXmlFiles.set(baseName, entry);
    }
  });

  const updatedClasses = [...currentProject.classes];
  const newImages: DatasetImage[] = [];

  if (foundProjectJsonFile) {
    onProgress?.(30, 'Processando AnnotateX project.json...');
    const projectZipObj = foundProjectJsonFile as JSZip.JSZipObject;
    const jsonText = await projectZipObj.async('text');
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed.classes && Array.isArray(parsed.classes)) {
        parsed.classes.forEach((cls: DatasetProject['classes'][0]) => {
          if (!updatedClasses.some((c) => c.name.toLowerCase() === cls.name.toLowerCase())) {
            updatedClasses.push(cls);
          }
        });
      }
    } catch (e) {
      console.warn('Erro ao ler project.json do ZIP', e);
    }
  }

  let cocoAnnotationsMap: Map<string, Annotation[]> | null = null;
  if (foundCocoFile) {
    onProgress?.(40, 'Processando anotações COCO...');
    const cocoZipObj = foundCocoFile as JSZip.JSZipObject;
    const cocoText = await cocoZipObj.async('text');
    try {
      const cocoJson = JSON.parse(cocoText);
      const parsedCoco = parseCOCO(cocoJson, updatedClasses);
      updatedClasses.splice(0, updatedClasses.length, ...parsedCoco.classes);
      cocoAnnotationsMap = parsedCoco.imagesWithAnnotations;
    } catch (e) {
      console.warn('Erro ao ler COCO do ZIP', e);
    }
  }

  for (let i = 0; i < imageFiles.length; i++) {
    const item = imageFiles[i];
    const percent = Math.round(40 + (i / imageFiles.length) * 55);
    onProgress?.(percent, `Carregando imagem ${i + 1}/${imageFiles.length}: ${item.name}`);

    const blob = await item.zipObj.async('blob');
    const dataUrl = await blobToDataUrl(blob);
    const { width, height } = await getImageDimensions(dataUrl);

    const baseName = item.name.replace(/\.[^/.]+$/, '');
    let annotations: Annotation[] = [];

    if (cocoAnnotationsMap && cocoAnnotationsMap.has(item.name)) {
      annotations = cocoAnnotationsMap.get(item.name) || [];
    } else if (yoloTxtFiles.has(baseName)) {
      const txt = await yoloTxtFiles.get(baseName)!.async('text');
      const lines = txt.split(/\r?\n/).filter((l) => l.trim().length > 0);
      lines.forEach((line) => {
        const ann = parseYOLOLine(line, width, height, updatedClasses);
        if (ann) annotations.push(ann);
      });
    } else if (vocXmlFiles.has(baseName)) {
      const xml = await vocXmlFiles.get(baseName)!.async('text');
      const res = parsePascalVOC(xml, updatedClasses);
      annotations = res.annotations;
      updatedClasses.splice(0, updatedClasses.length, ...res.updatedClasses);
    }

    newImages.push({
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

  onProgress?.(100, 'Importação concluída com sucesso!');
  return { newImages, updatedClasses };
}

async function getImageBlob(image: DatasetImage): Promise<Blob | null> {
  if (image.fileBlob) return image.fileBlob;
  try {
    const response = await fetch(image.url);
    return await response.blob();
  } catch (e) {
    console.error('Erro ao converter imagem em Blob:', e);
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth || 800, height: img.naturalHeight || 600 });
    };
    img.onerror = () => {
      resolve({ width: 800, height: 600 });
    };
    img.src = url;
  });
}

async function generateSegmentationMask(image: DatasetImage, classes: DatasetClass[]): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, image.width, image.height);

  const classColorMap = new Map<string, string>(classes.map((c) => [c.id, c.color]));

  image.annotations.forEach((ann) => {
    const color = classColorMap.get(ann.classId) || '#ffffff';
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    if (ann.type === 'polygon' && ann.points.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(ann.points[0].x, ann.points[0].y);
      for (let i = 1; i < ann.points.length; i++) {
        ctx.lineTo(ann.points[i].x, ann.points[i].y);
      }
      ctx.closePath();
      ctx.fill();
    } else if (ann.type === 'bbox' && ann.points.length >= 2) {
      const minX = Math.min(ann.points[0].x, ann.points[1].x);
      const minY = Math.min(ann.points[0].y, ann.points[1].y);
      const w = Math.abs(ann.points[1].x - ann.points[0].x);
      const h = Math.abs(ann.points[1].y - ann.points[0].y);
      ctx.fillRect(minX, minY, w, h);
    } else if (ann.type === 'circle' && ann.points.length >= 2) {
      const r = Math.hypot(ann.points[0].x - ann.points[1].x, ann.points[0].y - ann.points[1].y);
      ctx.beginPath();
      ctx.arc(ann.points[0].x, ann.points[0].y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}
