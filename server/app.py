import os
import sys
import json
import base64
import tempfile
import cv2
from flask import Flask, request, jsonify, Response, send_file, send_from_directory
from flask_cors import CORS
import yt_dlp

DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dist'))

app = Flask(__name__, static_folder=DIST_DIR, static_url_path='')
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

TEMP_DIR = os.path.join(tempfile.gettempdir(), 'annotatex_videos')
os.makedirs(TEMP_DIR, exist_ok=True)

# Global CORS preflight handler to guarantee 200 OK for any OPTIONS request
@app.before_request
def handle_preflight():
    if request.method == 'OPTIONS':
        res = Response(status=200)
        res.headers["Access-Control-Allow-Origin"] = "*"
        res.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept"
        res.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        return res

@app.after_request
def after_request(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response

@app.errorhandler(404)
def handle_404(e):
    if request.path.startswith('/api/'):
        return jsonify({'error': f'Rota de API não encontrada: {request.path}'}), 404
    if os.path.exists(os.path.join(DIST_DIR, 'index.html')):
        return send_from_directory(DIST_DIR, 'index.html')
    return jsonify({'error': 'Não encontrado'}), 404

@app.errorhandler(500)
def handle_500(e):
    return jsonify({'error': f'Erro interno do servidor: {str(e)}'}), 500

@app.route('/api/health', methods=['GET', 'OPTIONS'])
def health():
    return jsonify({
        'status': 'online',
        'service': 'AnnotateX Python Video & Stream Server',
        'yt_dlp_version': yt_dlp.version.__version__,
    })

@app.route('/api/extract-youtube', methods=['POST', 'OPTIONS'])
def extract_youtube():
    """
    Downloads or extracts direct video streaming info from YouTube, Reddit or any URL using yt-dlp.
    Returns direct stream URL and metadata.
    """
    data = request.get_json() or {}
    url = data.get('url', '').strip()
    if not url:
        return jsonify({'error': 'URL de vídeo é obrigatória'}), 400

    ydl_opts = {
        'format': 'bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4][height<=720]/best',
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'noplaylist': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            video_url = info.get('url')
            # If formats list is available, pick best playable mp4
            if not video_url and 'formats' in info:
                for f in reversed(info['formats']):
                    if f.get('ext') == 'mp4' and f.get('url'):
                        video_url = f['url']
                        break
                if not video_url:
                    video_url = info['formats'][-1].get('url')

            return jsonify({
                'success': True,
                'title': info.get('title', 'Vídeo do YouTube'),
                'duration': info.get('duration', 0),
                'thumbnail': info.get('thumbnail'),
                'streamUrl': video_url,
                'video_url': video_url,
                'width': info.get('width', 1280),
                'height': info.get('height', 720),
            })
    except Exception as e:
        return jsonify({'error': f'Erro ao processar vídeo: {str(e)}'}), 500

@app.route('/api/download-and-extract-frames', methods=['POST', 'OPTIONS'])
def download_and_extract_frames():
    """
    Downloads a video from YouTube/URL, extracts frames with OpenCV at exact sample intervals/FPS,
    and returns base64 image frames to eliminate CORS and browser sandbox issues.
    """
    data = request.get_json() or {}
    url = data.get('url', '').strip()
    interval_sec = float(data.get('intervalSec') or data.get('interval') or 2.0)
    max_frames = int(data.get('maxFrames') or data.get('totalFrames') or data.get('totalCount') or 30)

    if not url:
        return jsonify({'error': 'URL do vídeo é obrigatória'}), 400

    temp_video_path = os.path.join(TEMP_DIR, f'temp_video_{os.getpid()}_{int(cv2.getTickCount())}.mp4')

    ydl_opts = {
        'format': 'bestvideo[ext=mp4][height<=720]/best[ext=mp4][height<=720]/best',
        'outtmpl': temp_video_path,
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        if not os.path.exists(temp_video_path):
            return jsonify({'error': 'Falha ao descarregar vídeo temporário'}), 500

        # Open with OpenCV and extract frames
        cap = cv2.VideoCapture(temp_video_path)
        if not cap.isOpened():
            return jsonify({'error': 'Não foi possível ler o arquivo de vídeo baixado'}), 500

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        frame_interval = max(1, int(fps * interval_sec))

        extracted_frames = []
        frame_idx = 0
        extracted_count = 0

        while cap.isOpened() and extracted_count < max_frames:
            ret, frame = cap.read()
            if not ret or frame is None:
                break

            if frame_idx % frame_interval == 0:
                timestamp = frame_idx / fps
                # Encode frame to JPEG base64
                _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
                jpg_base64 = base64.b64encode(buffer).decode('utf-8')
                
                extracted_frames.append({
                    'frameIndex': frame_idx,
                    'timestampSec': round(timestamp, 2),
                    'timestampStr': f"{int(timestamp // 60):02d}:{int(timestamp % 60):02d}",
                    'width': frame.shape[1],
                    'height': frame.shape[0],
                    'dataUrl': f"data:image/jpeg;base64,{jpg_base64}",
                })
                extracted_count += 1

            frame_idx += 1

        cap.release()

        # Clean up temp file
        if os.path.exists(temp_video_path):
            os.remove(temp_video_path)

        return jsonify({
            'success': True,
            'totalFramesExtracted': len(extracted_frames),
            'fps': fps,
            'frames': extracted_frames,
        })

    except Exception as e:
        if os.path.exists(temp_video_path):
            os.remove(temp_video_path)
        return jsonify({'error': f'Erro na extração de frames: {str(e)}'}), 500

@app.route('/api/live-stream-snapshot', methods=['POST', 'OPTIONS'])
def live_stream_snapshot():
    """
    Captures a high-resolution snapshot from RTSP, HLS, or YouTube Live stream.
    """
    data = request.get_json() or {}
    stream_url = data.get('streamUrl', '').strip()
    if not stream_url:
        return jsonify({'error': 'URL do stream ao vivo é obrigatória'}), 400

    try:
        cap = cv2.VideoCapture(stream_url)
        if not cap.isOpened():
            return jsonify({'error': 'Não foi possível conectar ao stream de vídeo ao vivo'}), 500

        ret, frame = cap.read()
        cap.release()

        if not ret or frame is None:
            return jsonify({'error': 'Não foi possível capturar frame do stream ao vivo'}), 500

        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
        jpg_base64 = base64.b64encode(buffer).decode('utf-8')

        return jsonify({
            'success': True,
            'dataUrl': f"data:image/jpeg;base64,{jpg_base64}",
            'width': frame.shape[1],
            'height': frame.shape[0],
        })
    except Exception as e:
        return jsonify({'error': f'Erro ao capturar snapshot ao vivo: {str(e)}'}), 500

# Static SPA route handler
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_spa(path):
    if path.startswith('api/'):
        return jsonify({'error': f'Endpoint de API desconhecido: /{path}'}), 404
    if os.path.exists(os.path.join(DIST_DIR, path)) and path != '':
        return send_from_directory(DIST_DIR, path)
    if os.path.exists(os.path.join(DIST_DIR, 'index.html')):
        return send_from_directory(DIST_DIR, 'index.html')
    return jsonify({
        'status': 'online',
        'service': 'AnnotateX Python Backend',
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Iniciando servidor Python AnnotateX Video na porta {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
