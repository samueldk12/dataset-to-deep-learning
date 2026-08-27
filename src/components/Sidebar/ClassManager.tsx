import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Tag, 
  Palette,
  Check,
  Edit2,
  Layers,
  Copy,
  FolderKanban,
  ChevronDown,
  Sparkles,
  FolderPlus
} from 'lucide-react';
import { DatasetClass, ClassSet } from '../../types/dataset';
import { getRandomColor } from '../../utils/formatParsers';

interface ClassManagerProps {
  classSets: ClassSet[];
  activeClassSetId: string;
  onSelectClassSet: (id: string) => void;
  onCreateClassSet: (name: string, cloneCurrent: boolean) => void;
  onRenameClassSet: (id: string, name: string) => void;
  onDeleteClassSet: (id: string) => void;

  classes: DatasetClass[];
  activeClassId: string;
  onSelectClass: (id: string) => void;
  onAddClass: (cls: DatasetClass) => void;
  onUpdateClass: (cls: DatasetClass) => void;
  onDeleteClass: (id: string) => void;
  annotationCountByClass: Map<string, number>;
}

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', 
  '#14b8a6', '#a855f7', '#eab308', '#84cc16'
];

export const ClassManager: React.FC<ClassManagerProps> = ({
  classSets,
  activeClassSetId,
  onSelectClassSet,
  onCreateClassSet,
  onRenameClassSet,
  onDeleteClassSet,

  classes,
  activeClassId,
  onSelectClass,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
  annotationCountByClass,
}) => {
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassColor, setNewClassColor] = useState(PRESET_COLORS[0]);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [colorPickerClassId, setColorPickerClassId] = useState<string | null>(null);

  // Class Set Management State
  const [showClassSetDropdown, setShowClassSetDropdown] = useState(false);
  const [isCreatingSet, setIsCreatingSet] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [cloneAnnotations, setCloneAnnotations] = useState(true);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editingSetName, setEditingSetName] = useState('');

  const activeSet = classSets.find((cs) => cs.id === activeClassSetId) || classSets[0];

  const handleCreateClass = () => {
    if (!newClassName.trim()) return;
    const shortcutKey = classes.length < 9 ? String(classes.length + 1) : undefined;
    const newClass: DatasetClass = {
      id: `cls_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: newClassName.trim(),
      color: newClassColor,
      shortcutKey,
      visible: true,
      locked: false,
    };
    onAddClass(newClass);
    onSelectClass(newClass.id);
    setNewClassName('');
    setNewClassColor(getRandomColor(classes.length + 1));
    setIsAddingClass(false);
  };

  const handleSaveClassEdit = (cls: DatasetClass) => {
    if (editingName.trim()) {
      onUpdateClass({ ...cls, name: editingName.trim() });
    }
    setEditingClassId(null);
  };

  const handleCreateSetSubmit = () => {
    if (!newSetName.trim()) return;
    onCreateClassSet(newSetName.trim(), cloneAnnotations);
    setNewSetName('');
    setIsCreatingSet(false);
    setShowClassSetDropdown(false);
  };

  const handleSaveRenameSet = (id: string) => {
    if (editingSetName.trim()) {
      onRenameClassSet(id, editingSetName.trim());
    }
    setEditingSetId(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 select-none text-xs">
      {/* 1. Class Set Selector / Switcher */}
      <div className="p-2.5 bg-slate-950/70 border-b border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 flex items-center gap-1">
            <FolderKanban className="w-3 h-3 text-indigo-400" />
            Conjunto de Classes / Schema:
          </span>
          <button
            onClick={() => {
              setIsCreatingSet(true);
              setShowClassSetDropdown(false);
            }}
            className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            title="Criar novo conjunto de classes"
          >
            <FolderPlus className="w-3 h-3" />
            <span>+ Novo Conjunto</span>
          </button>
        </div>

        {/* Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => {
              setShowClassSetDropdown(!showClassSetDropdown);
              if (isCreatingSet) setIsCreatingSet(false);
            }}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500 text-slate-100 text-left transition-colors"
          >
            <div className="flex items-center gap-2 truncate">
              <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="font-semibold text-xs truncate">{activeSet?.name || 'Conjunto de Classes'}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {/* Dropdown Menu */}
          {showClassSetDropdown && (
            <div className="absolute top-11 left-0 right-0 z-50 p-2 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl flex flex-col gap-1.5 animate-fade-in">
              <div className="text-[10px] text-slate-500 font-semibold px-2 py-1 uppercase">
                Trocar Conjunto Ativo ({classSets.length}):
              </div>

              {classSets.map((cs) => {
                const isSelected = cs.id === activeClassSetId;
                const isRenaming = editingSetId === cs.id;

                return (
                  <div
                    key={cs.id}
                    onClick={() => {
                      onSelectClassSet(cs.id);
                      setShowClassSetDropdown(false);
                    }}
                    className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                        : 'hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {isRenaming ? (
                        <div
                          className="flex items-center gap-1 flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editingSetName}
                            onChange={(e) => setEditingSetName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveRenameSet(cs.id)}
                            autoFocus
                            className="bg-slate-900 border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-white"
                          />
                          <button
                            onClick={() => handleSaveRenameSet(cs.id)}
                            className="p-1 rounded bg-indigo-600 text-white"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col truncate">
                          <span className="font-medium text-xs truncate">{cs.name}</span>
                          <span className="text-[10px] text-slate-500">{cs.classes.length} classes</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {!isRenaming && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSetName(cs.name);
                            setEditingSetId(cs.id);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Renomear conjunto"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}

                      {classSets.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteClassSet(cs.id);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Excluir este conjunto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="border-t border-slate-800 my-1" />

              {/* Add New Class Set (closes dropdown on click so form is visible immediately) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowClassSetDropdown(false);
                  setIsCreatingSet(true);
                }}
                className="flex items-center gap-2 p-2 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-600/10 text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Novo Conjunto de Classes</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal/Inline Create New Set Form */}
        {isCreatingSet && (
          <div className="p-3 bg-slate-900 rounded-xl border border-indigo-500/60 shadow-lg flex flex-col gap-2 animate-fade-in">
            <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1">
              <FolderPlus className="w-3.5 h-3.5" />
              Criar Novo Conjunto de Classes:
            </span>
            <input
              type="text"
              placeholder="Ex: Taxonomia de Defeitos, Detalhada v2..."
              value={newSetName}
              onChange={(e) => setNewSetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateSetSubmit()}
              autoFocus
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
            />

            <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={cloneAnnotations}
                onChange={(e) => setCloneAnnotations(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-indigo-600"
              />
              <span>Duplicar classes e anotações do conjunto atual</span>
            </label>

            <div className="flex justify-end gap-1.5 pt-1">
              <button
                onClick={() => setIsCreatingSet(false)}
                className="px-2 py-0.5 rounded text-slate-400 hover:text-slate-200 text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateSetSubmit}
                disabled={!newSetName.trim()}
                className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium text-xs shadow-md shadow-indigo-500/25"
              >
                Criar Conjunto
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Classes in Active Set Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800">
        <span className="font-semibold text-slate-200 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-blue-400" />
          Classes do Conjunto ({classes.length})
        </span>

        <button
          onClick={() => setIsAddingClass(!isAddingClass)}
          className="flex items-center gap-1 px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Nova Classe</span>
        </button>
      </div>

      {/* Add Class Form */}
      {isAddingClass && (
        <div className="p-3 bg-slate-950/70 border-b border-slate-800 flex flex-col gap-2.5 animate-fade-in">
          <span className="text-[11px] font-medium text-slate-300">Criar Nova Categoria:</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ex: Pessoa, Veículo, Defeito..."
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateClass()}
              autoFocus
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 text-xs"
            />
            <div className="relative">
              <input
                type="color"
                value={newClassColor}
                onChange={(e) => setNewClassColor(e.target.value)}
                className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                title="Escolher Cor"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-1 pt-1">
            <div className="flex items-center gap-1">
              {PRESET_COLORS.slice(0, 6).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewClassColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-4 h-4 rounded-full transition-transform ${
                    newClassColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsAddingClass(false)}
                className="px-2 py-0.5 rounded text-slate-400 hover:text-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateClass}
                className="px-2.5 py-0.5 rounded bg-blue-600 text-white font-medium hover:bg-blue-500"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Class List */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {classes.map((cls, idx) => {
          const isActive = cls.id === activeClassId;
          const count = annotationCountByClass.get(cls.id) || 0;
          const isEditing = editingClassId === cls.id;

          return (
            <div
              key={cls.id}
              onClick={() => onSelectClass(cls.id)}
              className={`group flex items-center justify-between p-2 rounded-xl cursor-pointer border transition-all ${
                isActive
                  ? 'bg-blue-600/15 border-blue-500/50 text-white shadow-md'
                  : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Color Dot / Picker */}
                <div className="relative">
                  <div
                    style={{ backgroundColor: cls.color }}
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm ring-1 ring-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setColorPickerClassId(colorPickerClassId === cls.id ? null : cls.id);
                    }}
                  />
                  {colorPickerClassId === cls.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-5 z-50 p-2 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl flex flex-wrap gap-1.5 w-36 animate-fade-in"
                    >
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          style={{ backgroundColor: c }}
                          onClick={() => {
                            onUpdateClass({ ...cls, color: c });
                            setColorPickerClassId(null);
                          }}
                          className="w-5 h-5 rounded-full hover:scale-110 transition-transform"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Class Name */}
                {isEditing ? (
                  <div
                    className="flex items-center gap-1 flex-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveClassEdit(cls)}
                      autoFocus
                      className="w-full bg-slate-900 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveClassEdit(cls)}
                      className="p-1 rounded bg-blue-600 text-white"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span className="font-medium truncate flex-1">{cls.name}</span>
                )}

                {/* Shortcut key badge (1-9) */}
                {idx < 9 && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700">
                    {idx + 1}
                  </span>
                )}
              </div>

              {/* Right side actions */}
              <div className="flex items-center gap-1 ml-2">
                <span className="font-mono text-[11px] text-slate-500 px-1">
                  {count}
                </span>

                {!isEditing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingName(cls.name);
                      setEditingClassId(cls.id);
                    }}
                    className="p-1 rounded text-slate-500 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Renomear classe"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateClass({ ...cls, visible: !cls.visible });
                  }}
                  className={`p-1 rounded transition-colors ${
                    cls.visible ? 'text-slate-500 hover:text-slate-200' : 'text-amber-400'
                  }`}
                  title={cls.visible ? 'Ocultar anotações desta classe' : 'Mostrar anotações'}
                >
                  {cls.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>

                {classes.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteClass(cls.id);
                    }}
                    className="p-1 rounded text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Excluir classe"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
