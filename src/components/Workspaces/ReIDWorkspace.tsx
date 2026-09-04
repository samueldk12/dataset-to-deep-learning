import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Camera, 
  Users, 
  Search, 
  Sparkles, 
  FolderKanban,
  CheckCircle2,
  Tag,
  ArrowRightLeft,
  Eye
} from 'lucide-react';
import { ReIDItem } from '../../types/dataset';
import { scoreShipReID } from '../../utils/reidEnsemble';

interface ReIDWorkspaceProps {
  items: ReIDItem[];
  onAddItem: (item: ReIDItem) => void;
  onUpdateItem: (item: ReIDItem) => void;
  onDeleteItem: (id: string) => void;
}

export const ReIDWorkspace: React.FC<ReIDWorkspaceProps> = ({
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}) => {
  const [selectedIdentity, setSelectedIdentity] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [newGlobalId, setNewGlobalId] = useState('');
  const [isCreatingIdentity, setIsCreatingIdentity] = useState(false);
  const [activeQueryId, setActiveQueryId] = useState<string | null>(items.find((item) => item.isQuery)?.id || null);

  // Group items by Global Identity ID
  const identitiesMap = new Map<string, ReIDItem[]>();
  items.forEach((item) => {
    const gid = item.globalId || 'Sem_Identidade';
    if (!identitiesMap.has(gid)) {
      identitiesMap.set(gid, []);
    }
    identitiesMap.get(gid)!.push(item);
  });

  const identityKeys = Array.from(identitiesMap.keys());
  const queryCount = items.filter((item) => item.isQuery).length;
  const crossCameraIdentities = identityKeys.filter((gid) =>
    new Set((identitiesMap.get(gid) || []).map((item) => item.cameraId)).size > 1
  ).length;
  const embeddingReady = items.filter((item) => Object.keys(item.embeddingVectors || {}).length >= 2).length;
  const reidReadiness = items.length === 0 ? 0 : Math.round((
    (queryCount > 0 ? 30 : 0) +
    (crossCameraIdentities / Math.max(1, identityKeys.length)) * 40 +
    (embeddingReady / items.length) * 30
  ));

  const handleCreateNewIdentity = () => {
    if (!newGlobalId.trim()) return;
    setSelectedIdentity(newGlobalId.trim());
    setNewGlobalId('');
    setIsCreatingIdentity(false);
  };

  const handleToggleQueryStatus = (item: ReIDItem) => {
    const willBeQuery = !item.isQuery;
    onUpdateItem({
      ...item,
      isQuery: willBeQuery,
    });
    if (willBeQuery) setActiveQueryId(item.id);
    else if (activeQueryId === item.id) setActiveQueryId(null);
  };

  const handleReassignIdentity = (item: ReIDItem, newId: string) => {
    onUpdateItem({
      ...item,
      globalId: newId,
    });
  };

  const activeQuery = items.find((item) => item.id === activeQueryId && item.isQuery) || null;
  const filteredItems = items.filter((item) => {
    if (selectedIdentity !== 'all' && item.globalId !== selectedIdentity) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.globalId.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((left, right) => {
    if (!activeQuery) return 0;
    return scoreShipReID(activeQuery, right).score - scoreShipReID(activeQuery, left).score;
  });

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-[#0a0d14] select-none text-slate-100">
      {/* 1. Left Identity Cluster Sidebar */}
      <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-xs text-slate-200">
              Identidades Globais ({identityKeys.length})
            </span>
          </div>

          <button
            onClick={() => setIsCreatingIdentity(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova ID</span>
          </button>
        </div>

        {/* Identity Creation Form */}
        {isCreatingIdentity && (
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-col gap-2 animate-fade-in">
            <span className="text-[11px] font-medium text-slate-300">Nome / Tag da Identidade:</span>
            <input
              type="text"
              placeholder="Ex: Pessoa_#042, Carro_#108..."
              value={newGlobalId}
              onChange={(e) => setNewGlobalId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateNewIdentity()}
              autoFocus
              className="bg-slate-900 border border-indigo-500 rounded px-2 py-1 text-xs text-white"
            />
            <div className="flex justify-end gap-1">
              <button onClick={() => setIsCreatingIdentity(false)} className="px-2 py-0.5 text-xs text-slate-400">Cancelar</button>
              <button onClick={handleCreateNewIdentity} className="px-2.5 py-0.5 bg-indigo-600 text-white text-xs rounded font-medium">Criar</button>
            </div>
          </div>
        )}

        {/* Identities List */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 scrollbar-thin">
          <button
            onClick={() => setSelectedIdentity('all')}
            className={`p-2 rounded-xl text-left font-medium text-xs transition-colors ${
              selectedIdentity === 'all' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            Ver Todas as Identidades ({items.length} instâncias)
          </button>

          {identityKeys.map((gid) => {
            const group = identitiesMap.get(gid) || [];
            const isSelected = selectedIdentity === gid;
            return (
              <div
                key={gid}
                onClick={() => setSelectedIdentity(gid)}
                className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <div className="flex flex-col truncate">
                  <span className="font-semibold text-xs text-slate-200 truncate">{gid}</span>
                  <span className="text-[10px] text-slate-500">
                    {group.length} instâncias • {new Set(group.map((g) => g.cameraId)).size} câmeras
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {group.slice(0, 3).map((item, idx) => (
                    <img
                      key={item.id}
                      src={item.url}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover border border-slate-700 -ml-1.5 first:ml-0"
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Main Gallery Matrix View */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header toolbar */}
        <div className="h-14 bg-slate-900 border-b border-slate-800 px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-200">
              Galeria Re-ID: {selectedIdentity === 'all' ? 'Todas as Identidades' : selectedIdentity} ({filteredItems.length} imagens)
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            {queryCount > 0 && (
              <select
                value={activeQueryId || ''}
                onChange={(event) => setActiveQueryId(event.target.value || null)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-amber-300"
                title="Query usada para ordenar a galeria pelo ensemble de Re-ID"
              >
                <option value="">Sem ranking</option>
                {items.filter((item) => item.isQuery).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            )}
            <span>Clique na badge <strong className="text-amber-400">Probe / Query</strong> para alternar o modo de teste</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 border-b border-slate-800 bg-slate-950/70 px-5 py-3 lg:grid-cols-[1fr_auto]">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
            <div>
              <p className="text-xs font-semibold text-slate-200">Ensemble recomendado para Re-ID de navios</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                DINOv2 35% + backbone especializado 30% + CLIP 15% + IMO/MMSI/tipo 15% + tempo 5%.
                O score renormaliza automaticamente quando um sinal não está disponível.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-slate-400">
              Prontidão <strong className="text-indigo-300">{reidReadiness}%</strong>
            </span>
            <span className="text-slate-500">{queryCount} queries · {crossCameraIdentities}/{identityKeys.length} IDs multicâmera · {embeddingReady} com 2+ embeddings</span>
          </div>
        </div>

        {/* Matrix Grid */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredItems.map((item) => {
              const ranking = activeQuery && item.id !== activeQuery.id ? scoreShipReID(activeQuery, item) : null;
              return (
              <div
                key={item.id}
                className="group relative flex flex-col rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 transition-all hover:border-slate-700"
              >
                {/* Image */}
                <div className="relative aspect-[3/4] w-full bg-slate-950 overflow-hidden">
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover" />

                  {/* Camera Badge */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur border border-slate-700 text-[10px] font-mono text-slate-300">
                    <Camera className="w-3 h-3 text-indigo-400" />
                    <span>{item.cameraId}</span>
                  </div>

                  {/* Query / Gallery Toggle Badge */}
                  <button
                    onClick={() => handleToggleQueryStatus(item)}
                    className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-transform active:scale-95 ${
                      item.isQuery
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
                        : 'bg-slate-900/80 text-slate-300 border border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {item.isQuery ? 'Probe (Query)' : 'Gallery'}
                  </button>

                  {ranking && ranking.evidenceWeight > 0 && (
                    <div
                      className="absolute bottom-2 left-2 rounded-full border border-indigo-400/50 bg-slate-950/85 px-2 py-0.5 text-[10px] font-bold text-indigo-300"
                      title={`Evidências: ${Object.keys(ranking.components).join(', ')}`}
                    >
                      Match {Math.round(ranking.score * 100)}%
                    </div>
                  )}
                </div>

                {/* Info & Identity Dropdown */}
                <div className="p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-indigo-300">{item.globalId}</span>
                    {items.length > 1 && (
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="p-1 rounded text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Quick reassign dropdown */}
                  <select
                    value={item.globalId}
                    onChange={(e) => handleReassignIdentity(item, e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    {identityKeys.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
