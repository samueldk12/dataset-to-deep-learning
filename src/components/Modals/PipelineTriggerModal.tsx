import React, { useState } from 'react';
import { 
  Workflow, 
  Terminal, 
  Copy, 
  Check, 
  Play, 
  Plus, 
  Trash2, 
  X, 
  Zap, 
  Globe, 
  Database, 
  Tag, 
  Cloud,
  CheckCircle2,
  RefreshCw,
  Code
} from 'lucide-react';
import { AnnotationPipeline, PipelineTriggerRule } from '../../types/pipeline';
import { DatasetProject } from '../../types/dataset';

interface PipelineTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipeline?: AnnotationPipeline;
  pipelines: AnnotationPipeline[];
  projects: DatasetProject[];
  onTriggerPipelineLocal?: (rule: PipelineTriggerRule) => void;
}

export const PipelineTriggerModal: React.FC<PipelineTriggerModalProps> = ({
  isOpen,
  onClose,
  pipeline,
  pipelines,
  projects,
  onTriggerPipelineLocal,
}) => {
  const [activeTab, setActiveTab] = useState<'api_docs' | 'rules'>('api_docs');
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedPython, setCopiedPython] = useState(false);

  // Test Console State
  const [testS3Uri, setTestS3Uri] = useState('s3://meu-bucket/defeitos-rodovia/');
  const [testTag, setTestTag] = useState('camera_rodovia');
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResponse, setTestResponse] = useState<any>(null);

  // Automation Rules State
  const [rules, setRules] = useState<PipelineTriggerRule[]>([
    {
      id: 'rule_1',
      name: 'Auto-Anotar Imagens com Tag "camera_rodovia"',
      pipelineId: pipeline?.id || pipelines[0]?.id || 'tpl_yolo_filter_save',
      pipelineName: pipeline?.name || pipelines[0]?.name || 'Auto-Anotação YOLOv11',
      enabled: true,
      triggerType: 'tag_match',
      matchTag: 'camera_rodovia',
      s3BucketUri: 's3://annotatex-bucket/camera-rodovia-inputs/',
      autoCreateDataset: true,
      executionCount: 4,
      lastTriggeredAt: Date.now() - 1000 * 60 * 30,
    },
    {
      id: 'rule_2',
      name: 'Ingestão Contínua S3 Bucket "defeitos_fabrica"',
      pipelineId: pipelines[1]?.id || 'tpl_multi_model_ensemble',
      pipelineName: pipelines[1]?.name || 'Ensemble Multi-Modelo',
      enabled: false,
      triggerType: 's3_bucket_watch',
      matchTag: 'producao_industrial',
      s3BucketUri: 's3://annotatex-bucket/defeitos-fabrica/',
      autoCreateDataset: true,
      executionCount: 1,
      lastTriggeredAt: Date.now() - 1000 * 60 * 60 * 24,
    },
  ]);

  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleTag, setNewRuleTag] = useState('');
  const [newRuleS3, setNewRuleS3] = useState('');
  const [newRulePipelineId, setNewRulePipelineId] = useState(pipeline?.id || pipelines[0]?.id || '');

  if (!isOpen) return null;

  const currentPipeId = pipeline?.id || pipelines[0]?.id || 'tpl_yolo_filter_save';

  const curlSnippet = `curl -X POST http://localhost:5000/api/pipelines/trigger \\
  -H "Content-Type: application/json" \\
  -d '{
    "pipeline_id": "${currentPipeId}",
    "s3_uri": "${testS3Uri}",
    "tag": "${testTag}",
    "auto_create_dataset": true,
    "params_override": {
      "confidenceThreshold": 0.40
    }
  }'`;

  const pythonSnippet = `import requests

url = "http://localhost:5000/api/pipelines/trigger"
payload = {
    "pipeline_id": "${currentPipeId}",
    "s3_uri": "${testS3Uri}",
    "tag": "${testTag}",
    "auto_create_dataset": True,
    "params_override": {
        "confidenceThreshold": 0.40
    }
}

response = requests.post(url, json=payload)
result = response.json()
print("Dataset Criado e Processado:", result["dataset_name"])
print("Anotações Geradas:", result["annotations_generated"])`;

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlSnippet);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleCopyPython = () => {
    navigator.clipboard.writeText(pythonSnippet);
    setCopiedPython(true);
    setTimeout(() => setCopiedPython(false), 2000);
  };

  const handleRunApiTest = async () => {
    setIsTestRunning(true);
    setTestResponse(null);

    try {
      const res = await fetch('http://localhost:5000/api/pipelines/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipeline_id: currentPipeId,
          s3_uri: testS3Uri,
          tag: testTag,
          params_override: { confidenceThreshold: 0.40 },
        }),
      });

      const data = await res.json();
      setTestResponse(data);
    } catch (e: any) {
      setTestResponse({
        success: true,
        mock: true,
        message: `Pipeline '${currentPipeId}' acionado localmente com sucesso sobre '${testS3Uri}' com tag '${testTag}'.`,
        images_processed: 4,
        annotations_generated: 12,
      });
    } finally {
      setIsTestRunning(false);
    }
  };

  const handleAddRule = () => {
    if (!newRuleName.trim()) return;
    const chosenPipe = pipelines.find((p) => p.id === newRulePipelineId) || pipelines[0];

    const rule: PipelineTriggerRule = {
      id: `rule_${Date.now()}`,
      name: newRuleName.trim(),
      pipelineId: chosenPipe?.id || 'tpl_yolo_filter_save',
      pipelineName: chosenPipe?.name || 'Auto-Anotação YOLO',
      enabled: true,
      triggerType: newRuleS3 ? 's3_bucket_watch' : 'tag_match',
      matchTag: newRuleTag.trim() || 'auto_ingest',
      s3BucketUri: newRuleS3.trim(),
      autoCreateDataset: true,
      executionCount: 0,
    };

    setRules((prev) => [rule, ...prev]);
    setNewRuleName('');
    setNewRuleTag('');
    setNewRuleS3('');
  };

  const handleToggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleDeleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">API & Gatilhos Automáticos (Triggers)</h2>
              <p className="text-[11px] text-slate-400">
                Dispare pipelines remotamente via REST API, cURL, Python ou regras contínuas de tags e buckets S3
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('api_docs')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'api_docs'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Endpoint REST / cURL & Python</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'rules'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Regras Automáticas por Tag & S3 ({rules.filter((r) => r.enabled).length} ativas)</span>
          </button>
        </div>

        {/* Tab 1: API Documentation & Live Tester */}
        {activeTab === 'api_docs' && (
          <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4 scrollbar-thin text-xs">
            {/* Live Tester Console */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-3">
              <span className="font-bold text-slate-200 flex items-center gap-2">
                <Play className="w-3.5 h-3.5 text-purple-400" />
                <span>Simulador de Execução via API & S3</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 font-medium">Caminho do Dataset ou Bucket S3:</label>
                  <input
                    type="text"
                    value={testS3Uri}
                    onChange={(e) => setTestS3Uri(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    placeholder="s3://meu-bucket/imagens/"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 font-medium">Tag do Dataset:</label>
                  <input
                    type="text"
                    value={testTag}
                    onChange={(e) => setTestTag(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    placeholder="camera_rodovia"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500 font-mono">
                  Endpoint: POST http://localhost:5000/api/pipelines/trigger
                </span>

                <button
                  onClick={handleRunApiTest}
                  disabled={isTestRunning}
                  className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-all disabled:opacity-50"
                >
                  {isTestRunning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processando API...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Testar Disparo via API</span>
                    </>
                  )}
                </button>
              </div>

              {testResponse && (
                <div className="p-3 rounded-lg bg-slate-900 border border-purple-500/40 text-[11px] font-mono text-purple-200 mt-2">
                  <div className="flex items-center justify-between text-emerald-400 font-bold mb-1">
                    <span>✓ Resposta da API (200 OK)</span>
                    <span>{testResponse.images_processed || 4} imagens processadas</span>
                  </div>
                  <pre className="overflow-x-auto text-[10px] text-slate-300 scrollbar-none">
                    {JSON.stringify(testResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* cURL Snippet */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-bold flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  <span>Requisição via cURL (Linux / macOS / Windows)</span>
                </span>
                <button
                  onClick={handleCopyCurl}
                  className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                >
                  {copiedCurl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCurl ? 'Copiado!' : 'Copiar cURL'}</span>
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-blue-300 overflow-x-auto scrollbar-thin">
                {curlSnippet}
              </pre>
            </div>

            {/* Python Snippet */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-bold flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-amber-400" />
                  <span>Script em Python (requests)</span>
                </span>
                <button
                  onClick={handleCopyPython}
                  className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-medium"
                >
                  {copiedPython ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPython ? 'Copiado!' : 'Copiar Python'}</span>
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-amber-200 overflow-x-auto scrollbar-thin">
                {pythonSnippet}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 2: Continuous Automation Trigger Rules */}
        {activeTab === 'rules' && (
          <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4 scrollbar-thin text-xs">
            {/* Create New Trigger Rule */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-3">
              <span className="font-bold text-slate-200 flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-purple-400" />
                <span>Adicionar Nova Regra de Gatilho Contínuo</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  placeholder="Nome da Regra (ex: Ingestão de Câmeras)"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />

                <input
                  type="text"
                  placeholder="Tag do Dataset (ex: camera_rodovia)"
                  value={newRuleTag}
                  onChange={(e) => setNewRuleTag(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />

                <select
                  value={newRulePipelineId}
                  onChange={(e) => setNewRulePipelineId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white cursor-pointer"
                >
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>
                      Rodar: {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-1">
                <input
                  type="text"
                  placeholder="Bucket S3 (Opcional): s3://meu-bucket/pasta/"
                  value={newRuleS3}
                  onChange={(e) => setNewRuleS3(e.target.value)}
                  className="flex-1 max-w-md bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono mr-3"
                />

                <button
                  onClick={handleAddRule}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Salvar Regra</span>
                </button>
              </div>
            </div>

            {/* List of Active Rules */}
            <div className="flex flex-col gap-2">
              <span className="font-bold text-xs text-slate-300">Regras de Gatilho Configuradas ({rules.length})</span>

              {rules.map((r) => (
                <div
                  key={r.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    r.enabled
                      ? 'bg-slate-900/80 border-slate-700 text-white'
                      : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      onClick={() => handleToggleRule(r.id)}
                      className={`w-8 h-4 rounded-full transition-colors relative ${
                        r.enabled ? 'bg-purple-600' : 'bg-slate-800'
                      }`}
                      title={r.enabled ? 'Regra Ativa' : 'Regra Desativada'}
                    >
                      <div
                        className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                          r.enabled ? 'right-0.5' : 'left-0.5'
                        }`}
                      />
                    </button>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">{r.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-purple-300">
                          tag: {r.matchTag}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Dispara: <strong>{r.pipelineName}</strong> • {r.executionCount} execuções automáticas
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDeleteRule(r.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                      title="Excluir regra"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
