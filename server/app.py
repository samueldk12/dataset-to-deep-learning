import os
import sys
import json
import base64
import tempfile

sys.path.insert(0, os.path.dirname(__file__))

import cv2
from flask import Flask, request, jsonify, Response, send_file, send_from_directory
from flask_cors import CORS
import yt_dlp

DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dist'))

app = Flask(__name__, static_folder=DIST_DIR, static_url_path='')
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

TEMP_DIR = os.path.join(tempfile.gettempdir(), 'annotatex_videos')
os.makedirs(TEMP_DIR, exist_ok=True)

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

from mcp_server import handle_mcp_request, MCP_TOOLS
from ai_models import get_available_models, run_ai_prediction, decode_image_input

@app.route('/api/health', methods=['GET', 'OPTIONS'])
def health():
    return jsonify({
        'status': 'online',
        'service': 'AnnotateX Python Video & Stream Server',
        'yt_dlp_version': yt_dlp.version.__version__,
        'mcp_enabled': True,
        'ai_models_enabled': True,
    })

@app.route('/api/ai/models', methods=['GET', 'OPTIONS'])
def list_ai_models():
    """Returns list of all available pre-trained deep learning models."""
    return jsonify({
        'success': True,
        'models': get_available_models(),
    })

@app.route('/api/ai/predict', methods=['POST', 'OPTIONS'])
def predict_ai():
    """
    Runs automated detection / segmentation / classification on an image.
    Accepts: { image: base64, modelId: str, confidence: float, iou: float, customClasses: list }
    """
    data = request.get_json(silent=True) or {}
    img_data = data.get('image') or data.get('imageData') or data.get('image_base64')
    if not img_data:
        return jsonify({'success': False, 'error': 'Imagem não fornecida no corpo da requisição.'}), 400

    img_bgr = decode_image_input(img_data)
    if img_bgr is None:
        return jsonify({'success': False, 'error': 'Falha ao decodificar imagem (formato base64 inválido).'}), 400

    model_id = data.get('modelId', 'yolov11n')
    conf_threshold = float(data.get('confidence', data.get('confidenceThreshold', 0.25)))
    iou_threshold = float(data.get('iou', data.get('iouThreshold', 0.45)))
    custom_classes = data.get('customClasses', [])

    result = run_ai_prediction(
        img_bgr=img_bgr,
        model_id=model_id,
        conf_threshold=conf_threshold,
        iou_threshold=iou_threshold,
        custom_classes=custom_classes,
    )
    return jsonify(result)

@app.route('/api/mcp', methods=['GET', 'POST', 'OPTIONS'])
def mcp_endpoint():
    """
    Model Context Protocol (MCP) HTTP / JSON-RPC endpoint.
    Allows LLM agents to inspect tools and execute dataset operations over HTTP.
    """
    if request.method == 'GET':
        return jsonify({
            'status': 'online',
            'mcp_version': '2024-11-05',
            'tools': MCP_TOOLS,
        })
    data = request.get_json(silent=True) or {}
    response = handle_mcp_request(data)
    return jsonify(response)

@app.route('/api/pipeline/run-code', methods=['POST', 'OPTIONS'])
def run_pipeline_code():
    """
    Executes a custom Python script block inside a safe namespace with annotations input/output.
    """
    data = request.get_json(silent=True) or {}
    code_str = data.get('code', '')
    annotations = data.get('annotations', [])

    safe_globals = {
        'annotations': annotations,
        'result_annotations': [],
        'logs': [],
        'json': json,
        'len': len,
        'range': range,
        'min': min,
        'max': max,
        'abs': abs,
        'round': round,
        'sum': sum,
        'isinstance': isinstance,
        'dict': dict,
        'list': list,
    }

    try:
        exec(code_str, safe_globals)
        res_anns = safe_globals.get('result_annotations', annotations)
        return jsonify({
            'success': True,
            'result_annotations': res_anns,
            'count': len(res_anns),
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'result_annotations': annotations,
        }), 400

@app.route('/api/extract-youtube', methods=['POST', 'OPTIONS'])
def extract_youtube():
    """
    Downloads or extracts direct video streaming info from YouTube, Reddit or any URL using yt-dlp.
    Returns direct stream URL and metadata.
    """
    data = request.get_json(silent=True) or request.args or {}
    url = (data.get('url') or data.get('video_url') or data.get('link') or '').strip()
    if not url:
        return jsonify({'error': 'URL de vídeo é obrigatória'}), 400

    ydl_opts = {
        'format': 'bestvideo*+bestaudio/best',
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'noplaylist': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            video_url = info.get('url')
            # If formats list is available, pick best playable format
            if not video_url and 'formats' in info:
                for f in reversed(info['formats']):
                    if f.get('url'):
                        video_url = f['url']
                        break

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
    data = request.get_json(silent=True) or request.args or {}
    url = (data.get('url') or data.get('video_url') or data.get('link') or '').strip()
    interval_sec = float(data.get('intervalSec') or data.get('interval') or 2.0)
    max_frames = int(data.get('maxFrames') or data.get('totalFrames') or data.get('totalCount') or 30)

    if not url:
        return jsonify({'error': 'URL do vídeo é obrigatória'}), 400

    temp_video_path = os.path.join(TEMP_DIR, f'temp_video_{os.getpid()}_{int(cv2.getTickCount())}.mp4')

    ydl_opts = {
        'format': 'bestvideo*+bestaudio/best',
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

@app.route('/api/live-stream-snapshot', methods=['GET', 'POST', 'OPTIONS'])
@app.route('/api/live_raw_snapshot', methods=['GET', 'POST', 'OPTIONS'])
def live_stream_snapshot():
    """
    Captures a high-resolution snapshot from RTSP, HLS, or YouTube Live stream.
    """
    data = request.get_json(silent=True) or request.args or {}
    stream_url = (data.get('streamUrl') or data.get('stream_url') or data.get('url') or '').strip()
    
    # If no stream URL is passed, try default webcam (device 0)
    target = stream_url if stream_url else 0

    try:
        cap = cv2.VideoCapture(target)
        if not cap.isOpened():
            return jsonify({'error': 'Não foi possível conectar à câmera ou stream ao vivo'}), 500

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

# ==============================================================================
# Google Gemini 2.5 Flash Integration (NLP & Audio Dataset Synthesis)
# ==============================================================================
from gemini_service import call_gemini_api

@app.route('/api/gemini/generate', methods=['POST', 'OPTIONS'])
def gemini_generate():
    """
    Calls Google Gemini (defaults to lowest-cost gemini-2.5-flash-lite) for NLP and Audio generation.
    """
    data = request.get_json(silent=True) or {}
    prompt = data.get('prompt', '')
    model = data.get('model', 'gemini-2.5-flash-lite')
    api_key = data.get('apiKey')
    response_mime_type = data.get('responseMimeType', 'application/json')
    audio_base64 = data.get('audioBase64')
    audio_mime_type = data.get('audioMimeType', 'audio/wav')

    if not prompt:
        return jsonify({'error': 'Prompt é obrigatório'}), 400

    result = call_gemini_api(
        prompt=prompt,
        model=model,
        custom_api_key=api_key,
        response_mime_type=response_mime_type,
        audio_base64=audio_base64,
        audio_mime_type=audio_mime_type
    )

    if not result.get('success'):
        return jsonify({'error': result.get('error', 'Falha ao chamar API do Gemini')}), 500

    return jsonify(result)

@app.route('/api/gemini/test', methods=['POST', 'OPTIONS'])
def gemini_test_connection():
    data = request.get_json(silent=True) or {}
    api_key = data.get('apiKey')
    result = call_gemini_api(
        prompt="Diga 'OK' em formato JSON: {\"status\": \"OK\"}",
        model="gemini-2.5-flash-lite",
        custom_api_key=api_key,
        response_mime_type="application/json"
    )
    return jsonify(result)

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
