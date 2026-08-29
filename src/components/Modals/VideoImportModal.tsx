import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Video, 
  Link as LinkIcon, 
  UploadCloud, 
  Camera, 
  Film, 
  Play, 
  Pause, 
  RotateCcw, 
  Check, 
  Trash2, 
  Sparkles, 
  AlertCircle, 
  Sliders, 
  Layers, 
  Clock, 
  ExternalLink,
  ChevronRight,
  Tv,
  Radio,
  RefreshCw,
  Eye
} from 'lucide-react';
import { DatasetImage } from '../../types/dataset';
import { 
  extractFramesFromVideo, 
  captureCurrentFrame, 
  framesToDatasetImages, 
  parseVideoUrl, 
  extractYouTubeViaPython,
  extractFramesViaPythonBackend,
  captureLiveStreamSnapshot,
  ExtractedFrame 
} from '../../utils/videoExtractor';

interface VideoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddImagesToProject: (images: DatasetImage[]) => void;
}

const SAMPLE_VIDEOS = [
  {
    name: 'Câmera de Trânsito Urbano (Amostra WebM)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    type: 'direct',
  },
  {
    name: 'Carros em Rodovia (Amostra MP4)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    type: 'direct',
  },
];

export const VideoImportModal: React.FC<VideoImportModalProps> = ({
  isOpen,
  onClose,
  onAddImagesToProject,
}) => {
  const [sourceType, setSourceType] = useState<'upload' | 'url' | 'live'>('upload');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [activeVideoSrc, setActiveVideoSrc] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>('video');

  // Video playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Extraction options
  const [extractMode, setExtractMode] = useState<'interval' | 'fps' | 'totalFrames'>('totalFrames');
  const [intervalSec, setIntervalSec] = useState(1.0);
  const [fpsVal, setFpsVal] = useState(1);
  const [totalFramesVal, setTotalFramesVal] = useState(15);
  const [maxFramesLimit, setMaxFramesLimit] = useState(40);

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [extractStatus, setExtractStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Staged extracted frames
  const [stagedFrames, setStagedFrames] = useState<ExtractedFrame[]>([]);

  // Live video & webcam state
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [liveStreamUrl, setLiveStreamUrl] = useState('');
  const [isAutoCapturing, setIsAutoCapturing] = useState(false);
  const [autoCaptureIntervalSec, setAutoCaptureIntervalSec] = useState(2);
  const autoCaptureTimerRef = useRef<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const stopWebcam = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
    setIsWebcamActive(false);
    if (autoCaptureTimerRef.current) {
      clearInterval(autoCaptureTimerRef.current);
      autoCaptureTimerRef.current = null;
      setIsAutoCapturing(false);
    }
  }, []);

  // Reset state when opening modal
  useEffect(() => {
    if (isOpen) {
      setVideoFile(null);
      setVideoUrlInput('');
      setActiveVideoSrc(null);
      setStagedFrames([]);
      setIsExtracting(false);
      setExtractProgress(0);
      setExtractStatus('');
      setErrorMsg(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setSourceType('upload');
    } else {
      stopWebcam();
    }
  }, [isOpen, stopWebcam]);

  // Cleanup object URLs and webcam on unmount
  useEffect(() => {
    return () => {
      if (activeVideoSrc && activeVideoSrc.startsWith('blob:')) {
        URL.revokeObjectURL(activeVideoSrc);
      }
      stopWebcam();
      if (autoCaptureTimerRef.current) clearInterval(autoCaptureTimerRef.current);
    };
  }, [activeVideoSrc, stopWebcam]);

  if (!isOpen) return null;

  /* Handle Video File Select */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (activeVideoSrc && activeVideoSrc.startsWith('blob:')) {
      URL.revokeObjectURL(activeVideoSrc);
    }

    const objUrl = URL.createObjectURL(file);
    setVideoFile(file);
    setActiveVideoSrc(objUrl);
    setVideoTitle(file.name.replace(/\.[^/.]+$/, ''));
    setStagedFrames([]);
    setErrorMsg(null);
  };

  /* Handle Video URL Submit with Python yt-dlp Backend */
  const handleLoadUrl = async () => {
    if (!videoUrlInput.trim()) return;
    setErrorMsg(null);
    setIsExtracting(true);
    setExtractStatus('Conectando ao backend Python yt-dlp...');
    setExtractProgress(20);

    const url = videoUrlInput.trim();
    const parsed = parseVideoUrl(url);

    try {
      // 1. If it's a YouTube, Reddit or web video link, use Python yt-dlp backend
      if (parsed.type === 'youtube' || parsed.type === 'reddit' || !parsed.directStreamUrl) {
        setExtractStatus('Extraindo stream de vídeo com yt-dlp...');
        setExtractProgress(50);

        const info = await extractYouTubeViaPython(url);
        const streamSrc = info.streamUrl || info.video_url;
        if (streamSrc) {
          setActiveVideoSrc(streamSrc);
          setVideoTitle(info.title || 'YouTube Video');
          setExtractProgress(100);
          setExtractStatus('Vídeo carregado com sucesso via yt-dlp!');
        } else {
          // If direct stream is blocked by CORS, extract frames directly via backend OpenCV
          setExtractStatus('Extraindo frames diretamente via backend Python...');
          const frames = await extractFramesViaPythonBackend(url, {
            mode: extractMode,
            intervalSec,
            fps: fpsVal,
            totalFrames: totalFramesVal,
            maxFramesLimit,
          });
          setStagedFrames(frames);
          setExtractStatus(`Extraídos ${frames.length} frames com sucesso via yt-dlp!`);
        }
      } else {
        // Direct stream URL
        setActiveVideoSrc(parsed.directStreamUrl || url);
        setVideoTitle('Web Video Stream');
      }
      setIsExtracting(false);
    } catch (err: any) {
      console.warn('Tentando extração direta de frames com yt-dlp...', err);
      // Fallback: extract frames directly via backend
      try {
        setExtractStatus('Baixando e extraindo frames com yt-dlp & OpenCV...');
        const frames = await extractFramesViaPythonBackend(url, {
          mode: extractMode,
          intervalSec,
          fps: fpsVal,
          totalFrames: totalFramesVal,
          maxFramesLimit,
        });
        setStagedFrames(frames);
        setExtractStatus(`Extraídos ${frames.length} frames com sucesso!`);
        setIsExtracting(false);
      } catch (backendErr: any) {
        setErrorMsg(backendErr.message || 'Erro ao carregar o vídeo. Verifique o link ou se o backend Python está ativo.');
        setIsExtracting(false);
      }
    }
  };

  /* Direct Batch Extraction via Python Backend button */
  const handleExtractWithPythonBackend = async () => {
    if (!videoUrlInput.trim()) return;
    setErrorMsg(null);
    setIsExtracting(true);

    try {
      const frames = await extractFramesViaPythonBackend(
        videoUrlInput.trim(),
        {
          mode: extractMode,
          intervalSec,
          fps: fpsVal,
          totalFrames: totalFramesVal,
          maxFramesLimit,
        },
        (pct, status) => {
          setExtractProgress(pct);
          setExtractStatus(status);
        }
      );
      setStagedFrames((prev) => [...prev, ...frames]);
      setIsExtracting(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha na extração de frames pelo backend Python.');
      setIsExtracting(false);
    }
  };

  /* ==========================================================================
     LIVE VIDEO & WEBCAM STREAM
     ========================================================================== */

  const startWebcam = async () => {
    try {
      setErrorMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play();
      }
      setIsWebcamActive(true);
    } catch (err: any) {
      setErrorMsg('Não foi possível acessar a câmera do dispositivo. Verifique as permissões de vídeo.');
    }
  };



  const captureLiveWebcamSnapshot = () => {
    const video = liveVideoRef.current;
    if (!video || !video.videoWidth) return;

    const frame = captureCurrentFrame(video, `webcam_live_${Date.now()}.jpg`);
    if (frame) {
      setStagedFrames((prev) => [frame, ...prev]);
    }
  };

  const toggleAutoCapture = () => {
    if (isAutoCapturing) {
      if (autoCaptureTimerRef.current) {
        clearInterval(autoCaptureTimerRef.current);
        autoCaptureTimerRef.current = null;
      }
      setIsAutoCapturing(false);
    } else {
      setIsAutoCapturing(true);
      captureLiveWebcamSnapshot();
      autoCaptureTimerRef.current = setInterval(() => {
        captureLiveWebcamSnapshot();
      }, Math.max(500, autoCaptureIntervalSec * 1000));
    }
  };

  const captureLiveStreamUrlSnapshot = async () => {
    if (!liveStreamUrl.trim()) return;
    setErrorMsg(null);
    try {
      const frame = await captureLiveStreamSnapshot(liveStreamUrl.trim());
      setStagedFrames((prev) => [frame, ...prev]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao capturar snapshot do stream.');
    }
  };

  /* ==========================================================================
     PLAYER CONTROLS & BATCH EXTRACTION
     ========================================================================== */

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleCaptureInstant = () => {
    if (!videoRef.current) return;
    const frame = captureCurrentFrame(videoRef.current);
    if (frame) {
      setStagedFrames((prev) => [frame, ...prev]);
    }
  };

  const handleBatchExtract = async () => {
    setIsExtracting(true);
    setErrorMsg(null);
    setExtractProgress(0);

    const videoEl = videoRef.current;
    const isDurationValid = videoEl && videoEl.duration && !isNaN(videoEl.duration) && videoEl.duration > 0;

    // 1. Try browser client-side extraction for local uploaded files
    if (isDurationValid && sourceType === 'upload') {
      try {
        const frames = await extractFramesFromVideo(
          videoEl!,
          {
            mode: extractMode,
            intervalSec,
            fps: fpsVal,
            totalFrames: totalFramesVal,
            maxFramesLimit,
          },
          (percent, status) => {
            setExtractProgress(percent);
            setExtractStatus(status);
          }
        );
        setStagedFrames((prev) => [...prev, ...frames]);
        setIsExtracting(false);
        return;
      } catch (err: any) {
        console.warn('Tentando fallback no backend Python...', err);
      }
    }

    // 2. Extract via backend Python OpenCV & yt-dlp (handles URLs without CORS issues)
    const targetUrl = videoUrlInput.trim() || activeVideoSrc;
    if (targetUrl) {
      try {
        setExtractStatus('Extraindo frames via backend Python & yt-dlp...');
        const frames = await extractFramesViaPythonBackend(
          targetUrl,
          {
            mode: extractMode,
            intervalSec,
            fps: fpsVal,
            totalFrames: totalFramesVal,
            maxFramesLimit,
          },
          (percent, status) => {
            setExtractProgress(percent);
            setExtractStatus(status);
          }
        );
        setStagedFrames((prev) => [...prev, ...frames]);
        setIsExtracting(false);
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao extrair frames do vídeo.');
        setIsExtracting(false);
      }
    } else {
      setErrorMsg('Duração do vídeo inválida ou vídeo não carregado. Tente carregar novamente.');
      setIsExtracting(false);
    }
  };

  const handleConfirmAddToDataset = async () => {
    const selected = stagedFrames.filter((f) => f.selected !== false);
    if (selected.length === 0) return;

    const datasetImages = await framesToDatasetImages(selected);
    onAddImagesToProject(datasetImages);
    stopWebcam();
    onClose();
  };

  const handleToggleFrameSelect = (id: string) => {
    setStagedFrames((prev) =>
      prev.map((f) => (f.id === id ? { ...f, selected: !f.selected } : f))
    );
  };

  const handleDeleteFrame = (id: string) => {
    setStagedFrames((prev) => prev.filter((f) => f.id !== id));
  };

  const selectedCount = stagedFrames.filter((f) => f.selected !== false).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-inner">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Importar Vídeos, Streams & Extração de Frames
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                  Python yt-dlp & Live
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Extraia frames de arquivos MP4/WebM, vídeos do YouTube/Reddit sem erro de CORS, ou capture de câmeras e streams ao vivo
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopWebcam();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Switcher Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-2 pt-2">
          <button
            onClick={() => setSourceType('upload')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all ${
              sourceType === 'upload'
                ? 'bg-slate-900 border-t border-x border-slate-700 text-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload de Arquivo de Vídeo</span>
          </button>

          <button
            onClick={() => setSourceType('url')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all ${
              sourceType === 'url'
                ? 'bg-slate-900 border-t border-x border-slate-700 text-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            <span>YouTube & Web Links (Python yt-dlp)</span>
          </button>

          <button
            onClick={() => setSourceType('live')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all ${
              sourceType === 'live'
                ? 'bg-slate-900 border-t border-x border-slate-700 text-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Vídeo ao Vivo & Webcam</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-5 scrollbar-thin">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: UPLOAD DE ARQUIVO */}
          {sourceType === 'upload' && !activeVideoSrc && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-slate-950/40 transition-all hover:bg-slate-900/60 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="p-4 rounded-2xl bg-blue-600/15 text-blue-400 border border-blue-500/30 group-hover:scale-110 transition-transform">
                <Film className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-100">
                  Clique ou arraste um arquivo de vídeo aqui
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Suporta MP4, WebM, MOV, AVI, MKV (Alta resolução)
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: YOUTUBE & WEB LINKS COM PYTHON YT-DLP */}
          {sourceType === 'url' && !activeVideoSrc && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-3">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Insira o link de vídeo da Web (YouTube, Reddit, Twitter, URLs diretas):
                </span>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=... ou https://v.redd.it/..."
                      value={videoUrlInput}
                      onChange={(e) => setVideoUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLoadUrl()}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleLoadUrl}
                    disabled={!videoUrlInput.trim() || isExtracting}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold text-xs shadow-md shadow-blue-500/25 flex items-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Carregar</span>
                  </button>

                  <button
                    onClick={handleExtractWithPythonBackend}
                    disabled={!videoUrlInput.trim() || isExtracting}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold text-xs shadow-md shadow-purple-500/25 flex items-center gap-2"
                    title="Baixa e extrai frames diretamente via Python yt-dlp & OpenCV"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Extrair Direto com yt-dlp</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                  <span>Exemplos para teste:</span>
                  {SAMPLE_VIDEOS.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setVideoUrlInput(s.url);
                        setActiveVideoSrc(s.url);
                        setVideoTitle(s.name);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-blue-400 transition-colors"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VÍDEO AO VIVO & WEBCAM */}
          {sourceType === 'live' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Webcam capture */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-emerald-400" />
                      Câmera ao Vivo do Dispositivo / Webcam
                    </span>
                    {isWebcamActive && (
                      <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        AO VIVO
                      </span>
                    )}
                  </div>

                  {/* Video Element */}
                  <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                    <video
                      ref={liveVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {!isWebcamActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500">
                        <Camera className="w-8 h-8" />
                        <span className="text-xs">Câmera inativa</span>
                      </div>
                    )}
                  </div>

                  {/* Webcam Action Controls */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    {!isWebcamActive ? (
                      <button
                        onClick={startWebcam}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-500/25 flex items-center justify-center gap-1.5"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Iniciar Câmera ao Vivo</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={captureLiveWebcamSnapshot}
                          className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-1.5"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Capturar Frame</span>
                        </button>

                        <button
                          onClick={toggleAutoCapture}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                            isAutoCapturing
                              ? 'bg-rose-600 text-white shadow-md shadow-rose-500/25'
                              : 'bg-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{isAutoCapturing ? 'Parar Auto-Captura' : `Auto a cada ${autoCaptureIntervalSec}s`}</span>
                        </button>

                        <button
                          onClick={stopWebcam}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                        >
                          Encerrar
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 2. Live Stream URL / RTSP / HLS */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-3 justify-between">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                      <Radio className="w-4 h-4 text-indigo-400" />
                      Stream ao Vivo por URL (RTSP / HLS / YouTube Live)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Capture frames de transmissões ao vivo, streams de câmeras IP (RTSP) ou lives do YouTube.
                    </p>

                    <input
                      type="url"
                      placeholder="rtsp://... ou https://.../live.m3u8 ou YouTube Live URL"
                      value={liveStreamUrl}
                      onChange={(e) => setLiveStreamUrl(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    onClick={captureLiveStreamUrlSnapshot}
                    disabled={!liveStreamUrl.trim()}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Capturar Frame do Stream ao Vivo</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE VIDEO PLAYER & TIMELINE SCRUBBER (for Upload or Loaded URL) */}
          {activeVideoSrc && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 truncate">
                  Vídeo Carregado: <strong className="text-blue-400">{videoTitle}</strong>
                </span>
                <button
                  onClick={() => {
                    setActiveVideoSrc(null);
                    setVideoFile(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Trocar Vídeo
                </button>
              </div>

              {/* Video Player Box */}
              <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-2xl">
                <video
                  ref={videoRef}
                  src={activeVideoSrc}
                  crossOrigin="anonymous"
                  onTimeUpdate={() => {
                    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                  }}
                  onLoadedMetadata={() => {
                    if (videoRef.current) setDuration(videoRef.current.duration);
                  }}
                  onEnded={() => setIsPlaying(false)}
                  className="w-full h-full object-contain"
                />

                {/* Instant Snapshot Overlay Button */}
                <button
                  onClick={handleCaptureInstant}
                  className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600/90 hover:bg-blue-500 backdrop-blur text-white text-xs font-semibold shadow-xl shadow-blue-500/30 transition-transform active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capturar Este Frame</span>
                </button>
              </div>

              {/* Timeline Scrubber */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.05}
                    value={currentTime}
                    onChange={(e) => {
                      const t = parseFloat(e.target.value);
                      if (videoRef.current) videoRef.current.currentTime = t;
                      setCurrentTime(t);
                    }}
                    className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />

                  <span className="font-mono text-xs text-slate-300 min-w-[70px] text-right">
                    {Math.floor(currentTime / 60)}:
                    {Math.floor(currentTime % 60).toString().padStart(2, '0')} /{' '}
                    {Math.floor(duration / 60)}:
                    {Math.floor(duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* Batch Extraction Controls */}
              <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 flex flex-col gap-3">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  Extração em Lote Automática:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-400 font-medium">Modo de Distribuição:</label>
                    <select
                      value={extractMode}
                      onChange={(e) => setExtractMode(e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="totalFrames">Total Fixo de Frames Distribuídos</option>
                      <option value="interval">Intervalo de Tempo (Segundos)</option>
                      <option value="fps">Taxa de Quadros por Segundo (FPS)</option>
                    </select>
                  </div>

                  {extractMode === 'totalFrames' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-400 font-medium">Quantidade de Frames:</label>
                      <input
                        type="number"
                        min={2}
                        max={60}
                        value={totalFramesVal}
                        onChange={(e) => setTotalFramesVal(parseInt(e.target.value, 10) || 10)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                  )}

                  {extractMode === 'interval' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-400 font-medium">Intervalo (em segundos):</label>
                      <input
                        type="number"
                        min={0.2}
                        max={30}
                        step={0.5}
                        value={intervalSec}
                        onChange={(e) => setIntervalSec(parseFloat(e.target.value) || 1)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                  )}

                  {extractMode === 'fps' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-400 font-medium">Taxa de Extração (FPS):</label>
                      <input
                        type="number"
                        min={0.1}
                        max={10}
                        step={0.5}
                        value={fpsVal}
                        onChange={(e) => setFpsVal(parseFloat(e.target.value) || 1)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="flex items-end">
                    <button
                      onClick={handleBatchExtract}
                      disabled={isExtracting}
                      className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isExtracting ? 'Extraindo...' : 'Executar Extração em Lote'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EXTRACTION PROGRESS BAR */}
          {isExtracting && (
            <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 flex flex-col gap-2 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-300">
                <span>{extractStatus}</span>
                <span className="font-mono">{extractProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  style={{ width: `${extractProgress}%` }}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-200"
                />
              </div>
            </div>
          )}

          {/* STAGED EXTRACTED FRAMES GRID */}
          {stagedFrames.length > 0 && (
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <Film className="w-4 h-4 text-emerald-400" />
                  Frames Capturados para o Dataset ({stagedFrames.length} frames • {selectedCount} selecionados)
                </span>
                <button
                  onClick={() => setStagedFrames([])}
                  className="text-xs text-rose-400 hover:text-rose-300"
                >
                  Limpar Todos
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-60 overflow-y-auto p-1 scrollbar-thin">
                {stagedFrames.map((frame) => {
                  const isSelected = frame.selected !== false;
                  return (
                    <div
                      key={frame.id}
                      onClick={() => handleToggleFrameSelect(frame.id)}
                      className={`group relative aspect-video rounded-xl overflow-hidden border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg scale-[1.02]'
                          : 'border-slate-800 opacity-50 hover:opacity-100'
                      }`}
                    >
                      <img src={frame.dataUrl} alt="" className="w-full h-full object-cover" />
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-[10px] font-mono text-slate-300">
                        {frame.timestamp.toFixed(1)}s
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFrame(frame.id);
                        }}
                        className="absolute top-1 right-1 p-1 rounded bg-slate-950/80 text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            {stagedFrames.length > 0
              ? `${selectedCount} de ${stagedFrames.length} frames prontos para inclusão`
              : 'Nenhum frame capturado ainda'}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                stopWebcam();
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>

            <button
              onClick={handleConfirmAddToDataset}
              disabled={selectedCount === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Adicionar {selectedCount} Frames ao Dataset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
