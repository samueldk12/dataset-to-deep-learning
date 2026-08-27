import React, { useState } from 'react';
import { 
  Check, 
  Tag, 
  Grid, 
  Search, 
  CheckCircle2, 
  Sparkles, 
  Filter,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { DatasetImage, DatasetClass } from '../../types/dataset';

interface ClassificationWorkspaceProps {
  images: DatasetImage[];
  classes: DatasetClass[];
  onUpdateImage: (img: DatasetImage) => void;
}

export const ClassificationWorkspace: React.FC<ClassificationWorkspaceProps> = ({
  images,
  classes,
  onUpdateImage,
}) => {
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);

  const handleToggleClassOnImage = (image: DatasetImage, className: string) => {
    const currentTags = image.tags || [];
    const exists = currentTags.includes(className);
    const updatedTags = exists 
      ? currentTags.filter((t) => t !== className)
      : [...currentTags, className];

    onUpdateImage({
      ...image,
      tags: updatedTags,
      status: updatedTags.length > 0 ? 'completed' : 'unannotated',
    });
  };

  const handleBatchApplyClass = (className: string) => {
    if (selectedImageIds.length === 0) return;
    images.forEach((img) => {
      if (selectedImageIds.includes(img.id)) {
        handleToggleClassOnImage(img, className);
      }
    });
    setSelectedImageIds([]);
  };

  const filteredImages = images.filter((img) => {
    if (search && !img.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedTagFilter === 'all') return true;
    if (selectedTagFilter === 'unclassified') return (img.tags?.length || 0) === 0;
    return img.tags?.includes(selectedTagFilter);
  });

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-[#0a0d14] select-none text-slate-100">
      {/* 1. Header Toolbar */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Grid className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-xs text-slate-200">
              Classificação & Categorização Rápida ({images.length} itens)
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            <button
              onClick={() => setSelectedTagFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                selectedTagFilter === 'all' ? 'bg-blue-600 text-white font-semibold' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas ({images.length})
            </button>
            <button
              onClick={() => setSelectedTagFilter('unclassified')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                selectedTagFilter === 'unclassified' ? 'bg-amber-600 text-white font-semibold' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Sem Categoria ({images.filter((i) => i.tags.length === 0).length})
            </button>

            {classes.map((cls) => {
              const count = images.filter((i) => i.tags?.includes(cls.name)).length;
              const isSelected = selectedTagFilter === cls.name;
              return (
                <button
                  key={cls.id}
                  onClick={() => setSelectedTagFilter(cls.name)}
                  className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                    isSelected ? 'bg-slate-750 text-white font-semibold ring-1 ring-white/30' : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span style={{ backgroundColor: cls.color }} className="w-2 h-2 rounded-full" />
                  <span>{cls.name} ({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Batch action bar if items selected */}
        {selectedImageIds.length > 0 && (
          <div className="flex items-center gap-2 bg-blue-950/70 border border-blue-500/50 px-3 py-1.5 rounded-xl animate-fade-in">
            <span className="text-xs font-semibold text-blue-300">
              {selectedImageIds.length} selecionados • Atribuir classe:
            </span>
            <div className="flex items-center gap-1">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => handleBatchApplyClass(cls.name)}
                  style={{ borderColor: cls.color }}
                  className="px-2 py-0.5 rounded bg-slate-900 border text-xs text-slate-200 hover:bg-slate-800 font-medium"
                >
                  + {cls.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Grid Viewport */}
      <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredImages.map((img) => {
            const isSelected = selectedImageIds.includes(img.id);

            return (
              <div
                key={img.id}
                className={`group relative flex flex-col rounded-2xl overflow-hidden border bg-slate-900/90 transition-all ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/50 shadow-xl scale-[1.02]'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Thumbnail Image */}
                <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* Checkbox for batch select */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedImageIds((prev) => [...prev, img.id]);
                      } else {
                        setSelectedImageIds((prev) => prev.filter((id) => id !== img.id));
                      }
                    }}
                    className="absolute top-2 left-2 w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-600 cursor-pointer"
                  />
                </div>

                {/* Body & Tags */}
                <div className="p-3 flex flex-col gap-2">
                  <p className="text-xs font-mono font-medium text-slate-200 truncate" title={img.name}>
                    {img.name}
                  </p>

                  {/* Class assignment buttons */}
                  <div className="flex flex-wrap gap-1">
                    {classes.map((cls) => {
                      const isAssigned = img.tags?.includes(cls.name);
                      return (
                        <button
                          key={cls.id}
                          onClick={() => handleToggleClassOnImage(img, cls.name)}
                          style={{
                            borderColor: cls.color,
                            backgroundColor: isAssigned ? `${cls.color}25` : 'transparent',
                          }}
                          className={`px-2 py-0.5 rounded-full border text-[10px] font-medium transition-all flex items-center gap-1 ${
                            isAssigned ? 'text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <span style={{ backgroundColor: cls.color }} className="w-1.5 h-1.5 rounded-full" />
                          <span>{cls.name}</span>
                          {isAssigned && <Check className="w-2.5 h-2.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
