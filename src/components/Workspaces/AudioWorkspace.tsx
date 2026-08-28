import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Volume2, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  Sparkles, 
  Sliders, 
  Users, 
  Music, 
  Clock, 
  Layers, 
  Tag, 
  FileAudio,
  Radio,
  Split,
  Mic,
  Download
} from 'lucide-react';
import { DatasetProject, AudioDatasetItem } from '../../types/dataset';
import { analyzeAudioWithGemini, generateSyntheticNLPData } from '../../utils/geminiClient';
import { RefreshCw, Wand2 } from 'lucide-react';

interface AudioWorkspaceProps {
  project: DatasetProject;
  onUpdateProject: (updated: DatasetProject) => void;
  onOpenExportModal?: () => void;
}

export const AudioWorkspace: React.FC<AudioWorkspaceProps> = ({
  project,
  onUpdateProject,
  onOpenExportModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<string>(project.taskType || 'speech_recognition_asr');
  const [activeItemId, setActiveItemId] = useState<string | null>(
    project.audioItems?.[0]?.id || null
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);

  const audioItems = project.audioItems || [];
  const activeAudio = audioItems.find((a) => a.id === activeItemId) || audioItems[0] || null;

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleAddNewAudio = () => {
    const newItem: AudioDatasetItem = {
      id: `aud_${Date.now()}`,
      name: `audio_gravacao_${audioItems.length + 1}.wav`,
      audioUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_ambience.ogg',
      durationSec: 12.5,
      transcription: 'Por favor, inicie o protocolo de segurança no setor leste.',
      status: 'completed',
      diarizationSegments: [
        { id: 'd1', start: 0.0, end: 4.5, speaker: 'Orador_1 (Operador)', text: 'Por favor, inicie o protocolo de segurança.' },
        { id: 'd2', start: 4.8, end: 10.2, speaker: 'Orador_2 (Central)', text: 'Entendido, protocolo de segurança iniciado.' },
      ],
      soundEvents: [
        { id: 'e1', start: 1.2, end: 3.8, event: 'alarme_sonoro' },
        { id: 'e2', start: 6.0, end: 9.5, event: 'passos' },
      ],
      alignmentWords: [
        { word: 'Por', start: 0.0, end: 0.3 },
        { word: 'favor,', start: 0.35, end: 0.8 },
        { word: 'inicie', start: 0.85, end: 1.4 },
        { word: 'o', start: 1.45, end: 1.6 },
        { word: 'protocolo', start: 1.65, end: 2.5 },
      ],
      label: 'Acústica_Segurança',
    };
    const updated = [...audioItems, newItem];
    onUpdateProject({ ...project, audioItems: updated });
    setActiveItemId(newItem.id);
  };

  const handleUpdateActiveAudio = (item: AudioDatasetItem) => {
    const updated = audioItems.map((a) => (a.id === item.id ? item : a));
    onUpdateProject({ ...project, audioItems: updated });
  };

  const [isGeminiProcessing, setIsGeminiProcessing] = useState(false);

  const handleGeminiTranscribe = async () => {
    if (!activeAudio) return;
    setIsGeminiProcessing(true);
    try {
      const res = await analyzeAudioWithGemini(activeAudio.audioUrl, activeAudio.name);
      const updated: AudioDatasetItem = {
        ...activeAudio,
        transcription: res.transcription || activeAudio.transcription,
        label: res.label || activeAudio.label,
        status: 'completed',
        diarizationSegments: res.speakers?.map((s, idx) => ({
          id: `seg_${idx}_${Date.now()}`,
          start: s.start,
          end: s.end,
          speaker: s.speaker,
          text: s.text,
        })) || activeAudio.diarizationSegments,
        soundEvents: res.soundEvents?.map((e, idx) => ({
          id: `evt_${idx}_${Date.now()}`,
          start: e.start,
          end: e.end,
          event: e.event,
        })) || activeAudio.soundEvents,
      };
      handleUpdateActiveAudio(updated);
    } catch (err) {
      console.error('Error during Gemini audio analysis:', err);
    } finally {
      setIsGeminiProcessing(false);
    }
  };

  const handleGeminiGenerateSyntheticAudio = async () => {
    setIsGeminiProcessing(true);
    try {
      const results = await generateSyntheticNLPData(
        'speech_recognition_asr',
        'Gravações de Voz e Atendimento',
        3
      );
      const newItems: AudioDatasetItem[] = results.map((r, idx) => ({
        id: `aud_gemini_${Date.now()}_${idx}`,
        name: `fala_sintetica_gemini_${audioItems.length + idx + 1}.wav`,
        audioUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_ambience.ogg',
        durationSec: 8.5 + idx * 2,
        transcription: r.context || r.text || r.question || 'Áudio sintético gerado com Gemini.',
        status: 'completed',
        diarizationSegments: [
          { id: `d1_${idx}`, start: 0.0, end: 4.0, speaker: 'Orador 1', text: r.question || 'Primeira fala.' },
          { id: `d2_${idx}`, start: 4.2, end: 8.0, speaker: 'Orador 2', text: r.answerText || r.response || 'Segunda fala.' },
        ],
        soundEvents: [{ id: `e1_${idx}`, start: 1.0, end: 2.5, event: 'voz_humana' }],
        label: 'Voz_Sintetica_Gemini',
      }));
      onUpdateProject({ ...project, audioItems: [...audioItems, ...newItems] });
      if (newItems[0]?.id) setActiveItemId(newItems[0].id);
    } catch (err) {
      console.error('Error generating synthetic audio:', err);
    } finally {
      setIsGeminiProcessing(false);
    }
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-[#0a0d14] text-slate-100 select-none">
      {/* 1. Left Paradigm Selector & Audio List */}
      <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 justify-between">
        <div>
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-slate-300" />
              <span className="font-semibold text-xs text-slate-200">Áudio e Fala</span>
            </div>

            <button
              onClick={handleAddNewAudio}
              className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Áudio</span>
            </button>
          </div>

          {/* Audio Tracks List */}
          <div className="max-h-[70vh] overflow-y-auto p-2 flex flex-col gap-1 scrollbar-thin">
            <span className="text-[10px] font-medium text-slate-400 uppercase px-1 py-0.5">
              Faixas de Áudio ({audioItems.length}):
            </span>

            {audioItems.map((item) => {
              const isSelected = item.id === activeAudio?.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setActiveItemId(item.id)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-colors flex flex-col gap-0.5 ${
                    isSelected
                      ? 'bg-slate-800 border-blue-500 text-white'
                      : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/60 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs text-slate-200 truncate flex-1">{item.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{item.durationSec.toFixed(1)}s</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{item.transcription || item.label || 'Sem transcrição'}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gemini Generator & Export */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex flex-col gap-2">
          <button
            onClick={handleGeminiGenerateSyntheticAudio}
            disabled={isGeminiProcessing}
            className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-600/30 to-blue-600/30 hover:from-purple-600/40 hover:to-blue-600/40 border border-purple-500/40 text-purple-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>+ 3 Áudios Sintéticos (Gemini)</span>
          </button>

          {onOpenExportModal && (
            <button
              onClick={onOpenExportModal}
              className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Exportar Dataset</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Studio Player & Interactive Timeline */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {activeAudio ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Top Player Bar */}
            <div className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTogglePlay}
                  className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 transition-transform active:scale-95"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>

                <div className="flex flex-col">
                  <span className="font-bold text-xs text-slate-100">{activeAudio.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {currentTime.toFixed(2)}s / {(duration || activeAudio.durationSec).toFixed(2)}s
                  </span>
                </div>
              </div>

              {/* Paradigm Selector Pills & Gemini Assistant */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGeminiTranscribe}
                  disabled={isGeminiProcessing}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all disabled:opacity-50"
                  title="Transcrever e anotar automaticamente usando Google Gemini Flash"
                >
                  {isGeminiProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Analisando com Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                      <span>Auto-Anotar com Gemini</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  {[
                    { id: 'speech_recognition_asr', label: 'ASR (Transcrição)', icon: Mic },
                    { id: 'speaker_diarization', label: 'Diarização de Locutores', icon: Users },
                    { id: 'sound_event_detection', label: 'Eventos Sonoros (SED)', icon: Radio },
                    { id: 'forced_alignment', label: 'Alinhamento Forçado', icon: Clock },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveSubTab(t.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                        activeSubTab === t.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <t.icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Hidden Audio Player Element */}
            <audio
              ref={audioRef}
              src={activeAudio.audioUrl}
              onTimeUpdate={() => {
                if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
              }}
              onLoadedMetadata={() => {
                if (audioRef.current) setDuration(audioRef.current.duration);
              }}
              onEnded={() => setIsPlaying(false)}
            />

            {/* Waveform Scrubber Box */}
            <div className="p-6 bg-slate-950/60 border-b border-slate-800 flex flex-col gap-3">
              <div className="relative h-20 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex items-center px-4">
                {/* Synthetic Waveform Bars */}
                <div className="w-full flex items-center justify-between gap-1 h-14">
                  {Array.from({ length: 60 }).map((_, i) => {
                    const heightPct = Math.max(15, Math.sin(i * 0.4) * 50 + Math.cos(i * 0.9) * 35 + 20);
                    const isPassed = (i / 60) * (duration || 12) <= currentTime;
                    return (
                      <div
                        key={i}
                        style={{ height: `${heightPct}%` }}
                        onClick={() => handleSeek((i / 60) * (duration || 12))}
                        className={`flex-1 rounded-full cursor-pointer transition-colors ${
                          isPassed ? 'bg-emerald-400' : 'bg-slate-700 hover:bg-slate-500'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Scrubber Playhead Line */}
                <div
                  style={{ left: `${(currentTime / (duration || 12)) * 100}%` }}
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
                />
              </div>

              {/* Scrubber range input */}
              <input
                type="range"
                min={0}
                max={duration || activeAudio.durationSec || 12}
                step={0.05}
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Task-Specific Annotation Editor Panels */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-950/30 scrollbar-thin">
              <div className="max-w-4xl mx-auto flex flex-col gap-5">
                {/* 1. ASR SPEECH RECOGNITION */}
                {activeSubTab === 'speech_recognition_asr' && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 shadow-xl">
                    <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                      <Mic className="w-4 h-4 text-emerald-400" />
                      Transcrição Textual da Fala (ASR / Whisper Ground Truth)
                    </h3>
                    <textarea
                      rows={5}
                      value={activeAudio.transcription || ''}
                      onChange={(e) => handleUpdateActiveAudio({ ...activeAudio, transcription: e.target.value })}
                      placeholder="Digite a transcrição exata do áudio falado..."
                      className="bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
                    />
                  </div>
                )}

                {/* 2. SPEAKER DIARIZATION */}
                {activeSubTab === 'speaker_diarization' && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-400" />
                        Segmentação & Diarização de Locutores ({activeAudio.diarizationSegments?.length || 0} turnos)
                      </h3>
                      <button
                        onClick={() => {
                          const newSeg = {
                            id: `d_${Date.now()}`,
                            start: currentTime,
                            end: currentTime + 2.0,
                            speaker: 'Orador_3',
                            text: 'Nova fala...',
                          };
                          handleUpdateActiveAudio({
                            ...activeAudio,
                            diarizationSegments: [...(activeAudio.diarizationSegments || []), newSeg],
                          });
                        }}
                        className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Adicionar Turno</span>
                      </button>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      {(activeAudio.diarizationSegments || []).map((seg, idx) => (
                        <div
                          key={seg.id}
                          className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-emerald-400 bg-emerald-950/80 px-2 py-1 rounded border border-emerald-800">
                              {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                            </span>
                            <input
                              type="text"
                              value={seg.speaker}
                              onChange={(e) => {
                                const updated = [...(activeAudio.diarizationSegments || [])];
                                updated[idx] = { ...updated[idx], speaker: e.target.value };
                                handleUpdateActiveAudio({ ...activeAudio, diarizationSegments: updated });
                              }}
                              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white w-40 font-semibold"
                            />
                          </div>

                          <input
                            type="text"
                            value={seg.text || ''}
                            onChange={(e) => {
                              const updated = [...(activeAudio.diarizationSegments || [])];
                              updated[idx] = { ...updated[idx], text: e.target.value };
                              handleUpdateActiveAudio({ ...activeAudio, diarizationSegments: updated });
                            }}
                            placeholder="Texto falado neste intervalo..."
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs text-slate-200"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. SOUND EVENT DETECTION (SED) */}
                {activeSubTab === 'sound_event_detection' && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
                    <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                      <Radio className="w-4 h-4 text-emerald-400" />
                      Detecção de Eventos Sonoros no Tempo (Sound Event Detection)
                    </h3>
                    <div className="flex flex-col gap-2">
                      {(activeAudio.soundEvents || []).map((ev, idx) => (
                        <div key={ev.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-mono text-emerald-400">
                            [{ev.start.toFixed(1)}s : {ev.end.toFixed(1)}s]
                          </span>
                          <span className="font-bold text-xs text-white">{ev.event}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. FORCED ALIGNMENT */}
                {activeSubTab === 'forced_alignment' && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
                    <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      Alinhamento Forçado Palavra por Palavra (Forced Alignment)
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(activeAudio.alignmentWords || []).map((w, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-0.5">
                          <span className="font-bold text-xs text-white">{w.word}</span>
                          <span className="text-[10px] font-mono text-emerald-400">
                            {w.start.toFixed(2)}s - {w.end.toFixed(2)}s
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 text-xs">
            Nenhuma faixa de áudio carregada. Clique em "+ Novo Áudio".
          </div>
        )}
      </div>
    </div>
  );
};
