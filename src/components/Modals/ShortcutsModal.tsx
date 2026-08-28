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
      title: 'Ferramentas de Anotação & Formas',
      shortcuts: [
        { key: 'V', desc: 'Selecionar / Editar Vértices e Formas' },
        { key: 'B', desc: 'Bounding Box 2D (Caixa Delimitadora)' },
        { key: 'P', desc: 'Polígono / Segmentação Fina por Pontos' },
        { key: '3 ou U', desc: 'Cubóide 3D (Caixa Isométrica Orientada)' },
        { key: 'S', desc: 'Esqueleto Anatômico (17 Keypoints com Ossos)' },
        { key: 'W', desc: 'Varinha Mágica (Auto-Segmentação por Flood Fill)' },
        { key: 'E', desc: 'Pincel de Máscara (Pintura Contínua de Contorno)' },
        { key: 'L', desc: 'Polyline (Traçado Linear Aberto)' },
        { key: 'K', desc: 'Keypoint (Ponto ou Landmark)' },
        { key: 'C', desc: 'Círculo / Elipse Delimitadora' },
        { key: 'T', desc: 'Tag / Classificação de Imagem' },
        { key: 'H ou Espaço', desc: 'Mover Canvas (Pan)' },
      ],
    },
    {
      title: 'Edição Rápida, Vértices & Histórico (Sem Ctrl)',
      shortcuts: [
        { key: 'U ou Shift + Z', desc: 'Desfazer última alteração (Undo)' },
        { key: 'Y ou Shift + Y', desc: 'Refazer alteração (Redo)' },
        { key: 'A', desc: 'Adicionar Novo Nodo / Vértice na posição do cursor' },
        { key: 'Shift + A / Shift + D', desc: 'Clonar todas as anotações da imagem anterior' },
        { key: 'M', desc: 'Mesclar Anotações Selecionadas (Merge)' },
        { key: 'Del / Backspace / X', desc: 'Excluir vértice ou anotação selecionada' },
        { key: 'Shift + S / Alt + S', desc: 'Exportar Dataset (YOLO, Parquet, COCO)' },
        { key: 'Setas ⬅️ / ➡️', desc: 'Navegar para imagem Anterior / Próxima' },
        { key: 'Enter', desc: 'Fechar Polígono / Finalizar Desenho' },
        { key: 'Esc', desc: 'Cancelar anotação em andamento / Desmarcar' },
      ],
    },
    {
      title: 'Inteligência Artificial & Automação',
      shortcuts: [
        { key: 'I', desc: 'Executar Auto IA com o modelo padrão' },
        { key: 'Shift + W', desc: 'Abrir Estúdio de Data Augmentation' },
        { key: 'F ou 0', desc: 'Ajustar Imagem à Tela (Fit Screen)' },
        { key: '1 a 9', desc: 'Selecionar Classe de Label ativa' },
        { key: 'Scroll do Mouse', desc: 'Zoom no ponto do cursor' },
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
              <h2 className="text-base font-semibold text-slate-100">Atalhos de Teclado e Produtividade</h2>
              <p className="text-xs text-slate-400">Todas as ferramentas e automações com atalhos dedicados</p>
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
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-5 scrollbar-thin">
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
