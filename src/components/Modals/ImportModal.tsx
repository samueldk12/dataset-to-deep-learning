import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FileArchive, 
  FileCode, 
  Sparkles, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle,
  FolderOpen,
  Video,
  Car,
  Microscope,
  Play
} from 'lucide-react';
import { DatasetImage, DatasetProject, DatasetClass } from '../../types/dataset';
import { parseDatasetZip, getImageDimensions } from '../../utils/zipHandler';
import { parseCOCO, parsePascalVOC, parseYOLOLine } from '../../utils/formatParsers';
import { getSampleDatasets } from '../../utils/sampleDatasets';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: DatasetProject;
  onAddImagesToProject: (images: DatasetImage[]) => void;
  onReplaceProject: (project: DatasetProject) => void;
  onOpenVideoStudio: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  project,
  onAddImagesToProject,
  onReplaceProject,
  onOpenVideoStudio,
}) => {
  const [activeTab, setActiveTab] = useState<'images' | 'video' | 'zip' | 'annotations' | 'samples'>('images');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const annotationInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab('images');
      setIsProcessing(false);
      setProgressStatus('');
      setProgressPercent(0);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  /* 1. Handle Multiple Images Upload */
  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setProgressStatus('Processando imagens...');
    setProgressPercent(10);

    try {
      const newImages: DatasetImage[] = [];
      const total = files.length;

      for (let i = 0; i < total; i++) {
        const file = files[i];
        const percent = Math.round(10 + (i / total) * 85);
        setProgressPercent(percent);
        setProgressStatus(`Carregando imagem ${i + 1}/${total}: ${file.name}`);

        const dataUrl = await readFileAsDataUrl(file);
        const { width, height } = await getImageDimensions(dataUrl);

        newImages.push({
          id: `img_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          url: dataUrl,
          width,
          height,
          size: file.size,
          annotations: [],
          tags: [],
          status: 'unannotated',
          fileBlob: file,
        });
      }

      onAddImagesToProject(newImages);
      setIsProcessing(false);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao processar arquivos de imagem.');
      setIsProcessing(false);
    }
  };

  /* 2. Handle Dataset ZIP Upload */
  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const { newImages, updatedClasses } = await parseDatasetZip(
        file,
        project,
        (percent, status) => {
          setProgressPercent(percent);
          setProgressStatus(status);
        }
      );

      if (newImages.length === 0) {
        setErrorMsg('Nenhuma imagem válida encontrada dentro do arquivo ZIP.');
        setIsProcessing(false);
        return;
      }

      onReplaceProject({
        ...project,
        name: file.name.replace(/\.zip$/i, ''),
        classes: updatedClasses,
        images: newImages,
        activeImageId: newImages[0]?.id || null,
        updatedAt: Date.now(),
      });

      setIsProcessing(false);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao extrair e analisar o arquivo ZIP do dataset.');
      setIsProcessing(false);
    }
  };

  /* 3. Handle Annotations File (COCO JSON / Pascal VOC XML) */
  const handleAnnotationFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setProgressStatus('Analisando anotações...');
    setProgressPercent(30);

    try {
      const updatedImages = [...project.images];
      let updatedClasses = [...project.classes];

      // First pass: look for classes.txt or data.yaml to register class names
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const lower = file.name.toLowerCase();
        if (lower.endsWith('classes.txt') || lower.endsWith('labels.txt')) {
          const text = await readFileAsText(file);
          const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
          lines.forEach((name, idx) => {
            if (!updatedClasses.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
              updatedClasses.push({
                id: `cls_${Date.now()}_${idx}`,
                name,
                color: updatedClasses[idx]?.color || '#3b82f6',
                visible: true,
                locked: false,
                shortcutKey: idx < 9 ? String(idx + 1) : undefined,
              });
            }
          });
        }
      }

      // Second pass: parse annotations (COCO, Pascal VOC, YOLO txt)
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await readFileAsText(file);
        const lower = file.name.toLowerCase();
        const baseName = file.name.replace(/\.[^/.]+$/, '');

        if (lower.endsWith('.json')) {
          const coco = JSON.parse(text);
          const parsed = parseCOCO(coco, updatedClasses);
          updatedClasses = parsed.classes;

          updatedImages.forEach((img, idx) => {
            if (parsed.imagesWithAnnotations.has(img.name)) {
              updatedImages[idx] = {
                ...img,
                annotations: parsed.imagesWithAnnotations.get(img.name)!,
                status: 'completed',
              };
            }
          });
        } else if (lower.endsWith('.xml')) {
          const res = parsePascalVOC(text, updatedClasses);
          updatedClasses = res.updatedClasses;
          const matchIdx = updatedImages.findIndex(
            (img) => img.name === res.fileName || img.name.startsWith(file.name.replace(/\.xml$/, ''))
          );
          if (matchIdx !== -1) {
            updatedImages[matchIdx] = {
              ...updatedImages[matchIdx],
              annotations: res.annotations,
              status: 'completed',
            };
          }
        } else if (lower.endsWith('.txt') && !lower.endsWith('classes.txt') && !lower.endsWith('labels.txt')) {
          const matchIdx = updatedImages.findIndex(
            (img) => img.name.replace(/\.[^/.]+$/, '') === baseName || img.name === `${baseName}.jpg` || img.name === `${baseName}.png`
          );
          if (matchIdx !== -1) {
            const targetImg = updatedImages[matchIdx];
            const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
            const parsedAnns = lines
              .map((line) => parseYOLOLine(line, targetImg.width, targetImg.height, updatedClasses))
              .filter(Boolean) as any[];

            if (parsedAnns.length > 0) {
              updatedImages[matchIdx] = {
                ...targetImg,
                annotations: parsedAnns,
                status: 'completed',
              };
            }
          }
        }
      }

      onReplaceProject({
        ...project,
        classes: updatedClasses,
        images: updatedImages,
        updatedAt: Date.now(),
      });

      setIsProcessing(false);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao analisar arquivo de anotações. Verifique a formatação do arquivo.');
      setIsProcessing(false);
    }
  };

  /* 4. Load Sample Dataset */
  const handleLoadSample = (sample: DatasetProject) => {
    onReplaceProject(sample);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Importar Dataset, Imagens ou Vídeos</h2>
              <p className="text-xs text-slate-400">Adicione imagens, extraia frames de vídeos ou suba um dataset com anotações</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-5 pt-2 gap-2 bg-slate-950/40 overflow-x-auto">
          <button
            onClick={() => setActiveTab('images')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'images'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Imagens
          </button>

          <button
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'video'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            Vídeos & Links
          </button>

          <button
            onClick={() => setActiveTab('zip')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'zip'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileArchive className="w-3.5 h-3.5" />
            Dataset ZIP
          </button>

          <button
            onClick={() => setActiveTab('annotations')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'annotations'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Apenas Anotações
          </button>

          <button
            onClick={() => setActiveTab('samples')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'samples'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Exemplos Prontos
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-sm font-medium text-slate-200">{progressStatus}</p>
              <div className="w-64 bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  style={{ width: `${progressPercent}%` }}
                  className="bg-blue-500 h-full rounded-full transition-all duration-300"
                />
              </div>
            </div>
          ) : (
            <>
              {/* TAB 1: ADD IMAGES */}
              {activeTab === 'images' && (
                <div className="flex flex-col gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImagesUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-950/50 hover:bg-blue-600/5 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all gap-3 text-center group"
                  >
                    <div className="p-3 rounded-2xl bg-blue-600/10 text-blue-400 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">
                        Clique para selecionar ou arraste imagens aqui
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Suporte a JPG, PNG, WEBP, BMP. Adiciona diretamente ao dataset atual.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: VIDEO EXTRACTION STUDIO */}
              {activeTab === 'video' && (
                <div className="flex flex-col gap-4">
                  <div
                    onClick={() => {
                      onClose();
                      onOpenVideoStudio();
                    }}
                    className="border-2 border-dashed border-indigo-500/50 hover:border-indigo-400 bg-indigo-950/20 hover:bg-indigo-600/10 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all gap-3 text-center group"
                  >
                    <div className="p-3 rounded-2xl bg-indigo-600/20 text-indigo-400 group-hover:scale-110 transition-transform">
                      <Video className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-100">
                        Abrir Estúdio de Extração de Vídeos & Web Links
                      </p>
                      <p className="text-xs text-slate-400 mt-1 max-w-md">
                        Suba vídeos em MP4/WebM ou insira links de websites (YouTube, Reddit, URLs diretas) e extraia frames precisos para anotação.
                      </p>
                    </div>
                    <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-md shadow-indigo-500/25 mt-1">
                      Abrir Estúdio de Vídeo
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: DATASET ZIP */}
              {activeTab === 'zip' && (
                <div className="flex flex-col gap-4">
                  <input
                    ref={zipInputRef}
                    type="file"
                    accept=".zip"
                    onChange={handleZipUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => zipInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-950/50 hover:bg-blue-600/5 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all gap-3 text-center group"
                  >
                    <div className="p-3 rounded-2xl bg-blue-600/10 text-blue-400 group-hover:scale-110 transition-transform">
                      <FileArchive className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">
                        Carregar arquivo ZIP com Imagens e Anotações
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Detecta automaticamente formatos YOLO, COCO JSON, Pascal VOC ou AnnotateX JSON.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ANNOTATIONS ONLY */}
              {activeTab === 'annotations' && (
                <div className="flex flex-col gap-4">
                  <input
                    ref={annotationInputRef}
                    type="file"
                    multiple
                    accept=".json,.xml,.txt"
                    onChange={handleAnnotationFileUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => annotationInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-950/50 hover:bg-blue-600/5 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all gap-3 text-center group"
                  >
                    <div className="p-3 rounded-2xl bg-emerald-600/10 text-emerald-400 group-hover:scale-110 transition-transform">
                      <FileCode className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">
                        Carregar arquivos de anotação (.json, .xml)
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        As anotações serão automaticamente associadas às imagens já presentes no dataset pelo nome de arquivo.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: SAMPLE DATASETS */}
              {activeTab === 'samples' && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-slate-400 mb-1">
                    Experimente instantaneamente a ferramenta carregando datasets prontos com polígonos, caixas e faixas:
                  </p>
                  {getSampleDatasets().map((sample, idx) => (
                    <div
                      key={sample.id}
                      onClick={() => handleLoadSample(sample)}
                      className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-blue-600/10 hover:border-blue-500/50 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-slate-800 text-blue-400 shrink-0 mt-0.5">
                          {idx === 0 ? <Car className="w-4 h-4" /> : <Microscope className="w-4 h-4" />}
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                            {sample.name}
                          </span>
                          <span className="text-xs text-slate-400">{sample.description}</span>
                          <div className="flex items-center gap-2 mt-1">
                            {sample.classes.map((c) => (
                              <span
                                key={c.id}
                                style={{ borderColor: c.color }}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 border text-slate-300 font-mono"
                              >
                                {c.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <button className="px-3 py-1.5 rounded-lg bg-blue-600 group-hover:bg-blue-500 text-white text-xs font-semibold shrink-0 ml-3">
                        Carregar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
