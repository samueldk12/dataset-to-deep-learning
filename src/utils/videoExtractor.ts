import { DatasetImage } from '../types/dataset';

export interface ExtractedFrame {
  id: string;
  timestamp: number;
  dataUrl: string;
  width: number;
  height: number;
  name: string;
  selected: boolean;
}

export interface VideoExtractionConfig {
  mode: 'interval' | 'fps' | 'totalFrames';
  intervalSec: number;
  fps: number;
  totalFrames: number;
  maxFramesLimit: number;
}

/**
 * Resilient API caller that handles proxy fallback and prevents "<!doctype" JSON parse crashes.
 */
async function callBackendApi(endpoint: string, payload: any): Promise<any> {
  const urlsToTry = [
    `/api/${endpoint}`,
    `http://127.0.0.1:5000/api/${endpoint}`,
    `http://localhost:5000/api/${endpoint}`,
  ];

  let lastErrorMessage = '';

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      
      // If server returned HTML (e.g. 404/500 Vite SPA fallback), skip to next endpoint
      if (text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<!doctype')) {
        lastErrorMessage = 'Servidor retornou HTML em vez de JSON. Verifique a porta 5000.';
        continue;
      }

      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        lastErrorMessage = 'Resposta do servidor não é um JSON válido.';
        continue;
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || `Erro do servidor (Código HTTP ${res.status})`);
      }

      return data;
    } catch (err: any) {
      if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
        throw err;
      }
      lastErrorMessage = err.message;
    }
  }

  throw new Error(
    lastErrorMessage || 
    'Não foi possível conectar ao servidor Python de vídeo (porta 5000). Certifique-se de que o backend Python está ativo executando `python server/app.py`.'
  );
}

/**
 * Extracts frames client-side from an HTML5 Video element.
 */
export async function extractFramesFromVideo(
  videoElement: HTMLVideoElement,
  config: VideoExtractionConfig,
  onProgress?: (percent: number, status: string) => void
): Promise<ExtractedFrame[]> {
  return new Promise(async (resolve, reject) => {
    try {
      let duration = videoElement.duration;
      if ((!duration || isNaN(duration) || duration <= 0) && videoElement.seekable && videoElement.seekable.length > 0) {
        duration = videoElement.seekable.end(videoElement.seekable.length - 1);
      }
      if (!duration || isNaN(duration) || duration <= 0) {
        return reject(new Error('Duração do vídeo inválida ou vídeo não carregado.'));
      }

      const timestamps: number[] = [];
      if (config.mode === 'interval') {
        for (let t = 0; t < duration; t += Math.max(0.1, config.intervalSec)) {
          timestamps.push(t);
          if (timestamps.length >= config.maxFramesLimit) break;
        }
      } else if (config.mode === 'fps') {
        const step = 1 / Math.max(0.1, config.fps);
        for (let t = 0; t < duration; t += step) {
          timestamps.push(t);
          if (timestamps.length >= config.maxFramesLimit) break;
        }
      } else {
        // Total frames distributed
        const count = Math.min(config.totalFrames, config.maxFramesLimit);
        const step = duration / (count + 1);
        for (let i = 1; i <= count; i++) {
          timestamps.push(i * step);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 1280;
      canvas.height = videoElement.videoHeight || 720;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Falha ao inicializar contexto 2D do Canvas'));
      }

      const frames: ExtractedFrame[] = [];
      const total = timestamps.length;

      // Temporary pause video
      videoElement.pause();

      for (let i = 0; i < total; i++) {
        const t = timestamps[i];
        await seekVideoTo(videoElement, t);

        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

        const padIndex = String(i + 1).padStart(3, '0');
        const frameName = `frame_${padIndex}_${Math.floor(t)}s.jpg`;

        frames.push({
          id: `frame_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
          timestamp: t,
          dataUrl,
          width: canvas.width,
          height: canvas.height,
          name: frameName,
          selected: true,
        });

        const percent = Math.round(((i + 1) / total) * 100);
        onProgress?.(percent, `Extraindo quadro ${i + 1} de ${total} (${percent}%)...`);
      }

      resolve(frames);
    } catch (err) {
      reject(err);
    }
  });
}

function seekVideoTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = Math.min(time, video.duration - 0.05);
  });
}

/**
 * Captures a single frame snapshot from a live playing video element or webcam stream.
 */
export function captureCurrentFrame(
  videoElement: HTMLVideoElement,
  customName?: string
): ExtractedFrame | null {
  if (!videoElement || videoElement.readyState < 2) return null;

  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth || 1280;
  canvas.height = videoElement.videoHeight || 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

  const timestamp = videoElement.currentTime || 0;
  const frameName = customName || `snapshot_${Date.now()}.jpg`;

  return {
    id: `snap_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    timestamp,
    dataUrl,
    width: canvas.width,
    height: canvas.height,
    name: frameName,
    selected: true,
  };
}

/**
 * Converts extracted frames into dataset image objects.
 */
export function framesToDatasetImages(frames: ExtractedFrame[]): DatasetImage[] {
  return frames
    .filter((f) => f.selected)
    .map((f, idx) => ({
      id: `img_vid_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
      name: f.name,
      url: f.dataUrl,
      width: f.width,
      height: f.height,
      size: Math.round(f.dataUrl.length * 0.75),
      annotations: [],
      tags: ['video_frame'],
      status: 'unannotated',
    }));
}

export interface PythonYTExtractResult {
  success: boolean;
  title: string;
  duration: number;
  thumbnail: string;
  streamUrl?: string;
  video_url?: string;
  width?: number;
  height?: number;
  is_live?: boolean;
}

/**
 * Extracts YouTube video info and direct stream via Python yt-dlp backend.
 */
export async function extractYouTubeViaPython(url: string): Promise<PythonYTExtractResult> {
  return callBackendApi('extract-youtube', { url });
}

/**
 * Downloads and extracts frames server-side via Python yt-dlp & OpenCV.
 */
export async function extractFramesViaPythonBackend(
  url: string,
  config: VideoExtractionConfig,
  onProgress?: (percent: number, status: string) => void
): Promise<ExtractedFrame[]> {
  onProgress?.(20, 'Conectando ao backend Python (yt-dlp)...');

  const json = await callBackendApi('download-and-extract-frames', {
    url,
    mode: config.mode,
    intervalSec: config.intervalSec,
    fps: config.fps,
    maxFrames: config.totalFrames || config.maxFramesLimit,
  });

  onProgress?.(80, 'Decodificando frames do OpenCV...');

  const rawFrames = json.frames || [];
  onProgress?.(100, `Extração concluída: ${rawFrames.length} frames.`);

  return rawFrames.map((f: any, idx: number) => ({
    id: f.id || `frame_py_${Date.now()}_${idx}`,
    timestamp: f.timestampSec || f.timestamp || 0,
    dataUrl: f.dataUrl,
    width: f.width || 1280,
    height: f.height || 720,
    name: `yt_frame_${Math.floor(f.timestampSec || 0)}s_${idx + 1}.jpg`,
    selected: true,
  }));
}

/**
 * Captures a live snapshot from an RTSP, HLS, or YouTube Live stream via Python backend.
 */
export async function captureLiveStreamSnapshot(streamUrl: string): Promise<ExtractedFrame> {
  const json = await callBackendApi('live-stream-snapshot', { streamUrl });

  return {
    id: `snap_live_${Date.now()}`,
    timestamp: Date.now() / 1000,
    dataUrl: json.dataUrl,
    width: json.width || 1280,
    height: json.height || 720,
    name: `live_snapshot_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`,
    selected: true,
  };
}

/**
 * Parses video URLs to identify platform.
 */
export function parseVideoUrl(rawUrl: string): {
  type: 'youtube' | 'reddit' | 'direct' | 'stream' | 'unknown';
  videoId?: string;
  directStreamUrl?: string;
} {
  const url = rawUrl.trim();

  // YouTube detection
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      videoId: ytMatch[1],
    };
  }

  // Reddit detection
  if (url.includes('reddit.com') || url.includes('v.redd.it')) {
    return {
      type: 'reddit',
    };
  }

  // RTSP / RTMP / HLS stream
  if (url.startsWith('rtsp://') || url.startsWith('rtmp://') || url.includes('.m3u8')) {
    return {
      type: 'stream',
      directStreamUrl: url,
    };
  }

  // Direct MP4/WebM file
  if (url.match(/\.(mp4|webm|ogg|mov|mkv)(\?.*)?$/i)) {
    return {
      type: 'direct',
      directStreamUrl: url,
    };
  }

  return { type: 'unknown' };
}
