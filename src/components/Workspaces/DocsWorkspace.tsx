import React, { useState } from 'react';
import { 
  BookOpen, 
  Eye, 
  FileText, 
  Volume2, 
  Code, 
  Terminal, 
  Layers, 
  Database, 
  Cpu, 
  Server,
  Box,
  ChevronRight,
  ExternalLink,
  Search,
  CheckCircle2
} from 'lucide-react';
import { TASK_CATALOG } from '../../utils/taskCatalog';

export const DocsWorkspace: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState<'overview' | 'vision' | 'nlp' | 'audio' | 'docker' | 'api'>('overview');
  const [search, setSearch] = useState('');

  const visionTasks = Object.values(TASK_CATALOG).filter((t) => t.domain === 'vision');
  const nlpTasks = Object.values(TASK_CATALOG).filter((t) => t.domain === 'nlp');
  const audioTasks = Object.values(TASK_CATALOG).filter((t) => t.domain === 'audio');

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-slate-950 text-slate-200 select-none font-sans">
      {/* 1. Left Docs Navigation Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-xs text-slate-100">Documentação Oficial</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            v1.0
          </span>
        </div>

        {/* Section Links */}
        <div className="p-2 flex flex-col gap-1 text-xs">
          {[
            { id: 'overview', label: 'Visão Geral & Arquitetura', icon: Layers },
            { id: 'vision', label: `Visão Computacional (${visionTasks.length})`, icon: Eye },
            { id: 'nlp', label: `NLP & Modelos LLM (${nlpTasks.length})`, icon: FileText },
            { id: 'audio', label: `Áudio e Fala (${audioTasks.length})`, icon: Volume2 },
            { id: 'docker', label: 'Docker & Implantação', icon: Box },
            { id: 'api', label: 'API Backend Python', icon: Server },
          ].map((sec) => {
            const Icon = sec.icon;
            const isSelected = selectedSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setSelectedSection(sec.id as any)}
                className={`p-2.5 rounded-lg text-left font-medium flex items-center gap-2.5 transition-colors ${
                  isSelected
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">{sec.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Main Docs Content Viewport */}
      <div className="flex-1 h-full overflow-y-auto p-6 sm:p-8 scrollbar-thin">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">

          {/* OVERVIEW */}
          {selectedSection === 'overview' && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-xl font-bold text-slate-100">AnnotateX Studio • Documentação</h1>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Plataforma completa para criação, anotação e exportação de datasets de Deep Learning com suporte a 38 tarefas especializadas.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
                    <Eye className="w-4 h-4" />
                    <span>Visão Computacional</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    YOLOv11/v8, COCO, Pascal VOC, Segmentação por polígonos, Keypoints anatômicos e exportação binária em Apache Parquet.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
                    <FileText className="w-4 h-4" />
                    <span>NLP & LLMs</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Extractive QA (SQuAD 2.0 com seleção por mouse), Text-to-SQL, CoT Reasoning (DeepSeek-R1 / o1), Function Calling e RAG.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                    <Volume2 className="w-4 h-4" />
                    <span>Áudio & Fala</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Waveform scrubber, transcrição ASR para Whisper, Diarização de locutores (RTTM) e alinhamento forçado.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-3">
                <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-400" />
                  Início Rápido (Execução Local)
                </h3>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
{`# 1. Clonar o repositório
git clone https://github.com/samueldk12/dataset-to-deep-learning.git
cd dataset-to-deep-learning

# 2. Instalar dependências e iniciar o frontend
npm install
npm run dev

# 3. Em outro terminal, iniciar o backend Python (para vídeo/yt-dlp)
pip install -r server/requirements.txt
python server/app.py`}
                </pre>
              </div>
            </div>
          )}

          {/* VISION */}
          {selectedSection === 'vision' && (
            <div className="flex flex-col gap-4">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-400" />
                  Paradigmas de Visão Computacional ({visionTasks.length} tipos)
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {visionTasks.map((t) => (
                  <div key={t.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-100">{t.title}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {t.badge || 'Visão'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">{t.fullDesc}</p>
                    </div>

                    <pre className="p-2.5 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono text-slate-300 overflow-x-auto max-h-24 scrollbar-thin">
                      {t.exampleSnippet}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NLP */}
          {selectedSection === 'nlp' && (
            <div className="flex flex-col gap-4">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  Paradigmas de Processamento de Linguagem Natural & LLMs ({nlpTasks.length} tipos)
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {nlpTasks.map((t) => (
                  <div key={t.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-100">{t.title}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {t.badge || 'NLP'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">{t.fullDesc}</p>
                    </div>

                    <pre className="p-2.5 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono text-slate-300 overflow-x-auto max-h-24 scrollbar-thin">
                      {t.exampleSnippet}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AUDIO */}
          {selectedSection === 'audio' && (
            <div className="flex flex-col gap-4">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  Paradigmas de Áudio, Fala & Música ({audioTasks.length} tipos)
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {audioTasks.map((t) => (
                  <div key={t.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-100">{t.title}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {t.badge || 'Áudio'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">{t.fullDesc}</p>
                    </div>

                    <pre className="p-2.5 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono text-slate-300 overflow-x-auto max-h-24 scrollbar-thin">
                      {t.exampleSnippet}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DOCKER */}
          {selectedSection === 'docker' && (
            <div className="flex flex-col gap-4">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Box className="w-4 h-4 text-blue-400" />
                  Implantação com Docker & Docker Compose
                </h2>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-3">
                <span className="text-xs font-semibold text-slate-200">Subir todos os serviços com 1 comando:</span>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
{`docker-compose up --build -d`}
                </pre>
                <p className="text-xs text-slate-400">
                  O Docker Compose inicializa automaticamente o container do frontend Nginx na porta 3000 e o backend Python na porta 5000 com rede interna compartilhada.
                </p>
              </div>
            </div>
          )}

          {/* API */}
          {selectedSection === 'api' && (
            <div className="flex flex-col gap-4">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-400" />
                  Referência da API do Backend Python (:5000)
                </h2>
              </div>

              <div className="flex flex-col gap-3 text-xs">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 font-mono text-blue-400 font-semibold">
                    <span className="px-2 py-0.5 rounded bg-blue-950 border border-blue-800 text-[10px]">POST</span>
                    <span>/api/extract-youtube</span>
                  </div>
                  <p className="text-slate-400">Extrai o link direto de streaming e metadados de vídeos do YouTube ou Reddit via yt-dlp.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 font-mono text-emerald-400 font-semibold">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-[10px]">POST</span>
                    <span>/api/download-and-extract-frames</span>
                  </div>
                  <p className="text-slate-400">Descarrega o vídeo e extrai frames com precisão de milissegundos usando OpenCV.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 font-mono text-purple-400 font-semibold">
                    <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-800 text-[10px]">POST</span>
                    <span>/api/live-stream-snapshot</span>
                  </div>
                  <p className="text-slate-400">Captura snapshots de alta resolução a partir de streams de câmeras RTSP ou transmissões ao vivo.</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
