import React, { useRef, useState } from 'react';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Image as ImageIcon,
  Search,
  Download,
  Sparkles,
  Copy,
  CheckSquare,
  Square,
  X
} from 'lucide-react';
import { DatasetImage } from '../types/dataset';

interface ImageStripProps {
  images: DatasetImage[];
  activeImageId: string | null;
  onSelectImage: (id: string) => void;
  onAddImages: () => void;
  onDeleteImage: (id: string) => void;
  onDeleteSelectedImages?: (ids: string[]) => void;
  onDownloadSelectedImages?: (ids: string[]) => void;
  onRunAIOnSelected?: (ids: string[]) => void;
  onPasteToSelected?: (ids: string[]) => void;
}

export const ImageStrip: React.FC<ImageStripProps> = ({
  images,
  activeImageId,
  onSelectImage,
  onAddImages,
  onDeleteImage,
  onDeleteSelectedImages,
  onDownloadSelectedImages,
  onRunAIOnSelected,
  onPasteToSelected,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<'all' | 'annotated' | 'empty'>('all');
  const [search, setSearch] = useState('');
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const filteredImages = images.filter((img) => {
    if (search && !img.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (filter === 'annotated') return (img.annotations?.length || 0) > 0;
    if (filter === 'empty') return (img.annotations?.length || 0) === 0;
    return true;
  });

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const amount = direction === 'left' ? -300 : 300;
      scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const currentIndex = images.findIndex((img) => img.id === activeImageId);

  const toggleImageSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImageIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    setSelectedImageIds(filteredImages.map((img) => img.id));
  };

  const clearSelection = () => {
    setSelectedImageIds([]);
    setIsSelectionMode(false);
  };

  const handleDownloadSelected = () => {
    if (onDownloadSelectedImages) {
      onDownloadSelectedImages(selectedImageIds);
    } else {
      // Fallback direct download
      selectedImageIds.forEach((id) => {
        const img = images.find((i) => i.id === id);
        if (img) {
          const a = document.createElement('a');
          a.href = img.url;
          a.download = img.name || `image_${id}.jpg`;
          a.click();
        }
      });
    }
  };

  return (
    <div className="h-32 bg-slate-900 border-t border-slate-800 flex flex-col justify-between px-3 py-2 select-none z-10 shrink-0">
      {/* Top row: Counter, Filter, Selection Action Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
            Galeria ({images.length})
          </span>

          <div className="flex items-center gap-1 bg-slate-950/60 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                filter === 'all' ? 'bg-slate-800 text-white font-medium' : 'hover:text-slate-200'
              }`}
            >
              Todas ({images.length})
            </button>
            <button
              onClick={() => setFilter('annotated')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                filter === 'annotated' ? 'bg-slate-800 text-emerald-400 font-medium' : 'hover:text-slate-200'
              }`}
            >
              Anotadas ({images.filter((i) => i.annotations.length > 0).length})
            </button>
            <button
              onClick={() => setFilter('empty')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                filter === 'empty' ? 'bg-slate-800 text-slate-300 font-medium' : 'hover:text-slate-200'
              }`}
            >
              Pendentes ({images.filter((i) => i.annotations.length === 0).length})
            </button>
          </div>

          <button
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (isSelectionMode) setSelectedImageIds([]);
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border transition-colors ${
              isSelectionMode || selectedImageIds.length > 0
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/40'
                : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Ativar seleção múltipla de imagens"
          >
            <CheckSquare className="w-3 h-3" />
            <span>{isSelectionMode ? 'Modo Seleção' : 'Selecionar'}</span>
          </button>
        </div>

        {/* Selected Batch Actions Bar */}
        {selectedImageIds.length > 0 ? (
          <div className="flex items-center gap-1.5 animate-fade-in bg-blue-950/60 border border-blue-500/30 px-2 py-0.5 rounded-lg">
            <span className="text-[11px] font-semibold text-blue-300 mr-1">
              {selectedImageIds.length} selecionada(s)
            </span>

            {/* Run AI on selected */}
            {onRunAIOnSelected && (
              <button
                onClick={() => onRunAIOnSelected(selectedImageIds)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-medium transition-colors"
                title="Executar Auto IA nas imagens selecionadas"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto IA</span>
              </button>
            )}

            {/* Paste annotations to selected */}
            {onPasteToSelected && (
              <button
                onClick={() => onPasteToSelected(selectedImageIds)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white text-[10px] font-medium transition-colors"
                title="Colar anotações atuais em todas as imagens selecionadas"
              >
                <Copy className="w-3 h-3" />
                <span>Colar Anotações</span>
              </button>
            )}

            {/* Download selected */}
            <button
              onClick={handleDownloadSelected}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-medium transition-colors"
              title="Baixar imagens selecionadas"
            >
              <Download className="w-3 h-3 text-cyan-400" />
              <span>Baixar</span>
            </button>

            {/* Delete selected */}
            <button
              onClick={() => {
                if (onDeleteSelectedImages) onDeleteSelectedImages(selectedImageIds);
                else selectedImageIds.forEach((id) => onDeleteImage(id));
                setSelectedImageIds([]);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-600/80 hover:bg-red-600 text-white text-[10px] font-medium transition-colors"
              title="Excluir imagens selecionadas"
            >
              <Trash2 className="w-3 h-3" />
              <span>Excluir</span>
            </button>

            <button
              onClick={clearSelection}
              className="p-1 text-slate-400 hover:text-white"
              title="Cancelar seleção"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          /* Carousel scroll buttons */
          <div className="flex items-center gap-1">
            {currentIndex !== -1 && (
              <span className="font-mono text-[11px] text-slate-500 mr-2">
                {currentIndex + 1} de {images.length}
              </span>
            )}
            <button
              onClick={() => scroll('left')}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Rolar para esquerda"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Rolar para direita"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Thumbnails row */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-2 overflow-x-auto overflow-y-hidden pb-1 scrollbar-thin"
      >
        {/* Add images card */}
        <button
          onClick={onAddImages}
          className="group flex flex-col items-center justify-center min-w-[90px] h-[68px] rounded-xl border border-dashed border-slate-700 hover:border-blue-500 bg-slate-950/40 hover:bg-blue-600/10 text-slate-400 hover:text-blue-400 transition-all shrink-0 cursor-pointer"
          title="Adicionar novas imagens a este dataset"
        >
          <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-medium mt-0.5">+ Imagens</span>
        </button>

        {/* Image items */}
        {filteredImages.map((img) => {
          const isActive = img.id === activeImageId;
          const isSelectedInBatch = selectedImageIds.includes(img.id);
          const annCount = img.annotations?.length || 0;

          return (
            <div
              key={img.id}
              onClick={(e) => {
                if (isSelectionMode || e.shiftKey || e.ctrlKey) {
                  toggleImageSelection(img.id, e);
                } else {
                  onSelectImage(img.id);
                }
              }}
              className={`group relative min-w-[96px] max-w-[96px] h-[68px] rounded-xl overflow-hidden cursor-pointer transition-all border shrink-0 ${
                isSelectedInBatch
                  ? 'border-cyan-500 ring-2 ring-cyan-500/40 shadow-lg'
                  : isActive
                  ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-lg scale-[1.02]'
                  : 'border-slate-800 hover:border-slate-600 opacity-80 hover:opacity-100'
              }`}
            >
              {/* Thumbnail Image */}
              <img
                src={img.url}
                alt={img.name}
                className="w-full h-full object-cover bg-slate-950"
                loading="lazy"
              />

              {/* Checkbox indicator */}
              {(isSelectionMode || selectedImageIds.length > 0 || isSelectedInBatch) && (
                <div 
                  onClick={(e) => toggleImageSelection(img.id, e)}
                  className="absolute top-1 right-1 z-20"
                >
                  {isSelectedInBatch ? (
                    <CheckSquare className="w-4 h-4 text-cyan-400 bg-slate-950/80 rounded" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400 hover:text-white bg-slate-950/80 rounded" />
                  )}
                </div>
              )}

              {/* Bottom gradient name overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-1">
                <p className="text-[9px] font-mono text-slate-200 truncate leading-tight">
                  {img.name}
                </p>
              </div>

              {/* Annotation count badge */}
              <div className="absolute top-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur border border-slate-800 text-[9px] font-mono font-medium">
                {annCount > 0 ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-slate-200">{annCount}</span>
                  </>
                ) : (
                  <span className="text-slate-500">0</span>
                )}
              </div>

              {/* Delete single button (when not in selection mode) */}
              {!isSelectionMode && selectedImageIds.length === 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteImage(img.id);
                  }}
                  className="absolute top-1 right-1 p-1 rounded bg-slate-900/90 hover:bg-red-600 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all shadow-md"
                  title="Remover esta imagem do dataset"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {filteredImages.length === 0 && (
          <div className="flex items-center justify-center text-xs text-slate-500 italic px-4">
            Nenhuma imagem encontrada com o filtro selecionado.
          </div>
        )}
      </div>
    </div>
  );
};
