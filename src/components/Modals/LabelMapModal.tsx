import React, { useState } from 'react';
import { X, Tag, Download, Upload, Copy, Check, FileText } from 'lucide-react';
import { saveAs } from 'file-saver';
import { DatasetClass } from '../../types/dataset';
import { generateClassesTxt, getRandomColor } from '../../utils/formatParsers';

interface LabelMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: DatasetClass[];
  onUpdateClasses: (classes: DatasetClass[]) => void;
}

export const LabelMapModal: React.FC<LabelMapModalProps> = ({
  isOpen,
  onClose,
  classes,
  onUpdateClasses,
}) => {
  const [copied, setCopied] = useState(false);
  const [inputText, setInputText] = useState('');
  const [mode, setMode] = useState<'view' | 'import'>('view');

  if (!isOpen) return null;

  const classesTxt = generateClassesTxt(classes);
  const jsonMap = JSON.stringify(
    classes.map((c) => ({ id: c.id, name: c.name, color: c.color })),
    null,
    2
  );

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([classesTxt], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, 'classes.txt');
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonMap], { type: 'application/json;charset=utf-8' });
    saveAs(blob, 'label_map.json');
  };

  const handleImportLabels = () => {
    if (!inputText.trim()) return;
    const lines = inputText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const newClasses: DatasetClass[] = lines.map((name, idx) => ({
      id: `cls_${Date.now()}_${idx}`,
      name,
      color: getRandomColor(idx),
      shortcutKey: idx < 9 ? String(idx + 1) : undefined,
      visible: true,
      locked: false,
    }));

    onUpdateClasses(newClasses);
    setInputText('');
    setMode('view');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Mapa de Labels & Classes</h2>
              <p className="text-xs text-slate-400">Exporte, salve ou importe apenas as categorias de anotação</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 px-5 pt-2 gap-2 bg-slate-950/40">
          <button
            onClick={() => setMode('view')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              mode === 'view' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Salvar / Exportar Labels
          </button>
          <button
            onClick={() => setMode('import')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              mode === 'import' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Importar Lista de Labels
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-4">
          {mode === 'view' ? (
            <>
              {/* Classes Preview */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span className="font-semibold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    Lista de Classes Atual ({classes.length} classes):
                  </span>
                  <button
                    onClick={() => handleCopy(classesTxt)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                  </button>
                </div>

                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono text-xs max-h-48 overflow-y-auto">
                  {classesTxt || '// Nenhuma classe cadastrada.'}
                </pre>
              </div>

              {/* Download Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleDownloadTxt}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-xs border border-slate-700 transition-colors"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Baixar classes.txt (YOLO)</span>
                </button>
                <button
                  onClick={handleDownloadJson}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-xs border border-slate-700 transition-colors"
                >
                  <Download className="w-4 h-4 text-blue-400" />
                  <span>Baixar label_map.json</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-300 font-medium">
                  Cole sua lista de classes (um nome por linha):
                </label>
                <textarea
                  rows={8}
                  placeholder="cachorro&#10;gato&#10;carro&#10;bicicleta&#10;pedestre"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                onClick={handleImportLabels}
                disabled={!inputText.trim()}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-semibold text-xs shadow-lg shadow-amber-500/20 disabled:opacity-40 transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>Substituir Classes pelas Novas</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
