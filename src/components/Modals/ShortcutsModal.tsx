import React from 'react';
import { X, Keyboard, Sparkles } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: 'Ferramentas de Anotação',
      shortcuts: [
        { key: 'V', desc: 'Ferramenta de Seleção / Edição de Vértices' },
        { key: 'P', desc: 'Polígono / Segmentação por Pontos' },
        { key: 'B', desc: 'Bounding Box (Caixa delimitadora)' },
        { key: 'L', desc: 'Polyline (Traçado linear)' },
        { key: 'K', desc: 'Keypoint (Ponto de referência)' },
        { key: 'C', desc: 'Círculo / Elipse' },
        { key: 'H ou Espaço', desc: 'Mover Canvas (Pan)' },
      ],
    },
    {
      title: 'Ações e Edição',
      shortcuts: [
        { key: 'Enter', desc: 'Fechar Polígono / Finalizar Polyline' },
        { key: 'Esc', desc: 'Cancelar anotação em andamento / Desmarcar' },
        { key: 'Del / Backspace', desc: 'Excluir anotação ou vértice selecionado' },
        { key: 'Ctrl + Z', desc: 'Desfazer última alteração' },
        { key: 'Ctrl + Y', desc: 'Refazer última alteração' },
        { key: 'Alt + C', desc: 'Gerar Envoltória Convexa (Convex Hull) dos pontos' },
        { key: 'Clique na aresta', desc: 'Inserir novo vértice no polígono (Modo V)' },
      ],
    },
    {
      title: 'Navegação e Classes',
      shortcuts: [
        { key: '1 a 9', desc: 'Selecionar Classe de Label ativa' },
        { key: 'Scroll do Mouse', desc: 'Zoom no ponto do cursor' },
        { key: 'F', desc: 'Ajustar Imagem à Tela (Fit Screen)' },
        { key: 'Espaço + Arrastar', desc: 'Arrastar/Pan da imagem livremente' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Atalhos de Teclado e Gestos</h2>
              <p className="text-xs text-slate-400">Maximize sua velocidade de anotação e produtividade</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-5">
          {shortcutGroups.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                {group.title}
              </h3>
              <div className="bg-slate-950/50 rounded-xl border border-slate-800/80 p-1 flex flex-col divide-y divide-slate-800/60">
                {group.shortcuts.map((s) => (
                  <div key={s.key} className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="text-slate-300">{s.desc}</span>
                    <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[11px] shadow-sm">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
