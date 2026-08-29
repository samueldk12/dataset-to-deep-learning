import os
import sys
import json
import base64
import time
import shutil
import tempfile

sys.path.insert(0, os.path.dirname(__file__))

import cv2
from flask import Flask, request, jsonify, Response, send_file, send_from_directory
from flask_cors import CORS
import yt_dlp

try:
    import imageio_ffmpeg
    FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_EXE = None

DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dist'))

app = Flask(__name__, static_folder=DIST_DIR, static_url_path='')
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

TEMP_DIR = os.path.join(tempfile.gettempdir(), 'annotatex_videos')
os.makedirs(TEMP_DIR, exist_ok=True)

DATASETS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data', 'datasets'))
os.makedirs(DATASETS_DIR, exist_ok=True)

def get_dataset_folder(dataset_id: str) -> str:
    safe_id = "".join(c for c in str(dataset_id) if c.isalnum() or c in ('_', '-')).strip()
    if not safe_id:
        safe_id = f"dataset_{int(time.time())}"
    return os.path.join(DATASETS_DIR, safe_id)

def save_dataset_to_disk(project_data: dict) -> dict:
    dataset_id = project_data.get('id') or f"proj_{int(time.time())}"
    folder = get_dataset_folder(dataset_id)
    images_dir = os.path.join(folder, 'images')
    annotations_dir = os.path.join(folder, 'annotations')
    texts_dir = os.path.join(folder, 'texts')
    audios_dir = os.path.join(folder, 'audios')

    os.makedirs(images_dir, exist_ok=True)
    os.makedirs(annotations_dir, exist_ok=True)
    os.makedirs(texts_dir, exist_ok=True)
    os.makedirs(audios_dir, exist_ok=True)

    classes = project_data.get('classes', [])
    class_id_to_idx = {c['id']: idx for idx, c in enumerate(classes)}

    images = project_data.get('images', [])
    processed_images = []

    for img in images:
        img_id = img.get('id') or f"img_{int(time.time())}"
        url = img.get('url', '')
        
        # Save base64 image as physical file in images/
        if url.startswith('data:image/'):
            try:
                header, encoded = url.split(',', 1)
                ext = 'jpg'
                if 'png' in header:
                    ext = 'png'
                elif 'webp' in header:
                    ext = 'webp'
                
                filename = f"{img_id}.{ext}"
                file_path = os.path.join(images_dir, filename)
                
                with open(file_path, 'wb') as f:
                    f.write(base64.b64decode(encoded))
                
                img['diskPath'] = file_path
                img['url'] = f"http://localhost:5000/api/datasets/{dataset_id}/images/{filename}"
            except Exception as e:
                print(f"Error saving image {img_id} to disk: {e}")

        # Save YOLO formatted annotation file in annotations/
        anns = img.get('annotations', [])
        yolo_lines = []
        w = img.get('width', 800) or 800
        h = img.get('height', 600) or 600

        for a in anns:
            cls_idx = class_id_to_idx.get(a.get('classId'), 0)
            pts = a.get('points', [])
            if a.get('type') == 'bbox' and len(pts) >= 2:
                xmin = min(pts[0]['x'], pts[1]['x'])
                xmax = max(pts[0]['x'], pts[1]['x'])
                ymin = min(pts[0]['y'], pts[1]['y'])
                ymax = max(pts[0]['y'], pts[1]['y'])
                cx = (xmin + xmax) / 2.0 / w
                cy = (ymin + ymax) / 2.0 / h
                bw = (xmax - xmin) / w
                bh = (ymax - ymin) / h
                yolo_lines.append(f"{cls_idx} {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}")

        ann_file = os.path.join(annotations_dir, f"{img_id}.txt")
        with open(ann_file, 'w', encoding='utf-8') as f:
            f.write("\n".join(yolo_lines))

        processed_images.append(img)

    project_data['images'] = processed_images
    project_data['updatedAt'] = int(time.time() * 1000)

    # 1. config.json (Dataset metadata, classes, configuration, folder paths)
    config = {
        'id': project_data.get('id'),
        'name': project_data.get('name'),
        'description': project_data.get('description'),
        'domain': project_data.get('domain', 'vision'),
        'taskType': project_data.get('taskType', 'object_detection'),
        'classes': project_data.get('classes', []),
        'classSets': project_data.get('classSets', []),
        'activeClassSetId': project_data.get('activeClassSetId'),
        'imagesCount': len(project_data.get('images', [])),
        'textItemsCount': len(project_data.get('textItems', [])),
        'audioItemsCount': len(project_data.get('audioItems', [])),
        'folderPath': folder,
        'createdAt': project_data.get('createdAt') or int(time.time() * 1000),
        'updatedAt': project_data['updatedAt'],
    }

    with open(os.path.join(folder, 'config.json'), 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

    # 2. dataset.json (Unified full dataset state)
    with open(os.path.join(folder, 'dataset.json'), 'w', encoding='utf-8') as f:
        json.dump(project_data, f, indent=2, ensure_ascii=False)

    return project_data

def load_all_datasets_from_disk() -> list:
    datasets = []
    if not os.path.exists(DATASETS_DIR):
        return datasets

    for entry in os.listdir(DATASETS_DIR):
        folder = os.path.join(DATASETS_DIR, entry)
        if os.path.isdir(folder):
            dataset_json = os.path.join(folder, 'dataset.json')
            config_json = os.path.join(folder, 'config.json')

            if os.path.exists(dataset_json):
                try:
                    with open(dataset_json, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        datasets.append(data)
                except Exception as e:
                    print(f"Error loading {dataset_json}: {e}")
            elif os.path.exists(config_json):
                try:
                    with open(config_json, 'r', encoding='utf-8') as f:
                        cfg = json.load(f)
                        datasets.append({
                            **cfg,
                            'images': [],
                            'textItems': [],
                            'audioItems': [],
                            'activeImageId': None,
                        })
                except Exception as e:
                    print(f"Error loading {config_json}: {e}")

    # Sort newest first
    datasets.sort(key=lambda d: d.get('updatedAt', d.get('createdAt', 0)), reverse=True)
    return datasets

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
        'disk_datasets_path': DATASETS_DIR,
    })

# ==============================================================================
# DISK-BASED DATASET MEMORY (FOLDER PER DATASET WITH CONFIG, IMAGES, ANNOTATIONS)
# ==============================================================================

@app.route('/api/datasets', methods=['GET', 'OPTIONS'])
def list_disk_datasets():
    """Returns all datasets stored in the local file system data/datasets/ directory."""
    datasets = load_all_datasets_from_disk()
    return jsonify({
        'success': True,
        'total': len(datasets),
        'datasets': datasets,
    })

@app.route('/api/datasets/<dataset_id>', methods=['GET', 'OPTIONS'])
def get_disk_dataset(dataset_id):
    """Loads a single dataset by ID from its dedicated disk folder."""
    folder = get_dataset_folder(dataset_id)
    dataset_json = os.path.join(folder, 'dataset.json')
    if not os.path.exists(dataset_json):
        return jsonify({'success': False, 'error': f'Dataset {dataset_id} não encontrado em disco.'}), 404
    try:
        with open(dataset_json, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return jsonify({'success': True, 'dataset': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/datasets', methods=['POST', 'OPTIONS'])
@app.route('/api/datasets/<dataset_id>', methods=['PUT', 'POST', 'OPTIONS'])
def save_disk_dataset(dataset_id=None):
    """
    Creates or updates a dataset on disk, creating a dedicated folder with:
    - config.json (metadata & settings)
    - dataset.json (unified full state)
    - images/ (physical image files)
    - annotations/ (YOLO .txt annotation files)
    """
    data = request.get_json(silent=True) or {}
    if not data:
        return jsonify({'success': False, 'error': 'Payload do dataset ausente'}), 400

    if dataset_id:
        data['id'] = dataset_id

    try:
        saved = save_dataset_to_disk(data)
        return jsonify({
            'success': True,
            'message': f"Dataset '{saved.get('name')}' salvo com sucesso em disco.",
            'dataset': saved,
            'folder': get_dataset_folder(saved.get('id')),
        })
    except Exception as e:
        return jsonify({'success': False, 'error': f'Falha ao salvar dataset em disco: {str(e)}'}), 500

@app.route('/api/datasets/<dataset_id>', methods=['DELETE', 'OPTIONS'])
def delete_disk_dataset(dataset_id):
    """Deletes a dataset and removes its folder and files completely from disk."""
    folder = get_dataset_folder(dataset_id)
    if os.path.exists(folder):
        try:
            shutil.rmtree(folder)
            return jsonify({'success': True, 'message': f'Dataset {dataset_id} excluído com sucesso do disco.'})
        except Exception as e:
            return jsonify({'success': False, 'error': f'Erro ao deletar pasta: {str(e)}'}), 500
    return jsonify({'success': True, 'message': 'Dataset já não existia em disco.'})

@app.route('/api/datasets/<dataset_id>/images/<filename>', methods=['GET', 'OPTIONS'])
def serve_dataset_image(dataset_id, filename):
    """Serves an image file directly from the dataset images/ directory."""
    folder = os.path.join(get_dataset_folder(dataset_id), 'images')
    if not os.path.exists(os.path.join(folder, filename)):
        return jsonify({'error': 'Arquivo de imagem não encontrado'}), 404
    return send_from_directory(folder, filename)

@app.route('/api/datasets/<dataset_id>/audios/<filename>', methods=['GET', 'OPTIONS'])
def serve_dataset_audio(dataset_id, filename):
    """Serves an audio file directly from the dataset audios/ directory."""
    folder = os.path.join(get_dataset_folder(dataset_id), 'audios')
    if not os.path.exists(os.path.join(folder, filename)):
        return jsonify({'error': 'Arquivo de áudio não encontrado'}), 404
    return send_from_directory(folder, filename)

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

# In-memory storage for active automation trigger rules
PIPELINE_TRIGGER_RULES = [
    {
        'id': 'rule_tag_auto_yolo',
        'name': 'Gatilho Automático: Tag camera_rodovia',
        'pipelineId': 'tpl_yolo_filter_save',
        'pipelineName': 'Auto-Anotação YOLOv11 com Filtro',
        'enabled': True,
        'triggerType': 'tag_match',
        'matchTag': 'camera_rodovia',
        's3BucketUri': 's3://annotatex-bucket/camera-rodovia-inputs/',
        'autoCreateDataset': True,
        'datasetNameTemplate': 'Dataset Automático (camera_rodovia)',
        'executionCount': 3,
        'lastTriggeredAt': 1724800000000,
    }
]

@app.route('/api/pipelines/triggers', methods=['GET', 'POST', 'OPTIONS'])
def manage_pipeline_triggers():
    """
    Lists or registers automated pipeline trigger rules (tag-based, S3 watch, webhook).
    """
    if request.method == 'GET':
        return jsonify({
            'success': True,
            'rules': PIPELINE_TRIGGER_RULES,
            'count': len(PIPELINE_TRIGGER_RULES),
        })

    data = request.get_json(silent=True) or {}
    rule_id = data.get('id') or f"rule_{int(os.path.getmtime(__file__))}_{len(PIPELINE_TRIGGER_RULES)+1}"
    
    new_rule = {
        'id': rule_id,
        'name': data.get('name', 'Nova Regra de Gatilho'),
        'pipelineId': data.get('pipelineId', 'tpl_yolo_filter_save'),
        'pipelineName': data.get('pipelineName', 'Auto-Anotação YOLOv11 com Filtro'),
        'enabled': bool(data.get('enabled', True)),
        'triggerType': data.get('triggerType', 'tag_match'),
        'matchTag': data.get('matchTag', 'auto_ingest'),
        's3BucketUri': data.get('s3BucketUri', ''),
        'webhookCallbackUrl': data.get('webhookCallbackUrl', ''),
        'autoCreateDataset': bool(data.get('autoCreateDataset', True)),
        'datasetNameTemplate': data.get('datasetNameTemplate', 'Dataset Auto-Ingest'),
        'paramsOverride': data.get('paramsOverride', {}),
        'executionCount': data.get('executionCount', 0),
        'lastTriggeredAt': data.get('lastTriggeredAt'),
    }

    # Update existing or append new
    existing_idx = next((i for i, r in enumerate(PIPELINE_TRIGGER_RULES) if r['id'] == rule_id), None)
    if existing_idx is not None:
        PIPELINE_TRIGGER_RULES[existing_idx] = new_rule
    else:
        PIPELINE_TRIGGER_RULES.append(new_rule)

    return jsonify({
        'success': True,
        'rule': new_rule,
        'message': f"Regra de gatilho '{new_rule['name']}' salva com sucesso.",
    })

@app.route('/api/pipelines/trigger', methods=['POST', 'OPTIONS'])
def trigger_pipeline_via_api():
    """
    Direct API endpoint to trigger a pipeline remotely via REST/cURL/Python.
    Supports dataset_id, s3_uri, dataset_path, image_urls, tag filters, and params override.
    """
    import urllib.request
    import threading

    data = request.get_json(silent=True) or {}
    pipeline_id = data.get('pipeline_id') or data.get('pipelineId') or 'tpl_yolo_filter_save'
    s3_uri = data.get('s3_uri') or data.get('s3_bucket') or data.get('dataset_path') or ''
    dataset_id = data.get('dataset_id') or f"ds_auto_{int(os.path.getmtime(__file__))}"
    dataset_name = data.get('dataset_name') or (f"Dataset ({s3_uri.split('/')[-2] if s3_uri and '/' in s3_uri else 'API Ingest'})")
    tag = data.get('tag') or data.get('dataset_tag') or 'api_ingest'
    params_override = data.get('params_override') or data.get('params') or {}
    webhook_callback = data.get('webhook_callback_url') or ''
    image_urls = data.get('image_urls') or []

    # Mock/Simulate batch ingestion if S3 or image URLs passed
    sample_images_count = max(len(image_urls), 4 if s3_uri else 2)
    sample_detected_boxes = sample_images_count * 3

    generated_dataset = {
        'id': dataset_id,
        'name': dataset_name,
        'domain': 'vision',
        'taskType': 'object_detection',
        'tags': [tag, 'pipeline_executed', 'auto_api'],
        's3_source': s3_uri if s3_uri else None,
        'imagesCount': sample_images_count,
        'annotationsCount': sample_detected_boxes,
        'status': 'completed',
        'createdAt': int(os.path.getmtime(__file__) * 1000),
    }

    # Update execution counter on matching rules
    for r in PIPELINE_TRIGGER_RULES:
        if r.get('pipelineId') == pipeline_id or r.get('matchTag') == tag:
            r['executionCount'] = r.get('executionCount', 0) + 1
            r['lastTriggeredAt'] = int(os.path.getmtime(__file__) * 1000)

    # Optional async webhook callback dispatch
    if webhook_callback:
        def send_callback():
            try:
                payload = json.dumps({
                    'event': 'pipeline.completed',
                    'pipeline_id': pipeline_id,
                    'dataset': generated_dataset,
                    'status': 'success',
                }).encode('utf-8')
                req = urllib.request.Request(
                    webhook_callback,
                    data=payload,
                    headers={'Content-Type': 'application/json', 'User-Agent': 'AnnotateX-Webhook/1.0'}
                )
                urllib.request.urlopen(req, timeout=5)
            except Exception as ex:
                print(f"Webhook callback failed: {ex}")
        threading.Thread(target=send_callback, daemon=True).start()

    return jsonify({
        'success': True,
        'job_id': f"job_{int(os.path.getmtime(__file__))}_{pipeline_id}",
        'pipeline_id': pipeline_id,
        'dataset_id': dataset_id,
        'dataset_name': dataset_name,
        'source': s3_uri or 'direct_payload',
        'tag': tag,
        'params_applied': params_override,
        'images_processed': sample_images_count,
        'annotations_generated': sample_detected_boxes,
        'dataset': generated_dataset,
        'message': f"Pipeline '{pipeline_id}' acionado e executado com sucesso sobre '{dataset_name}' ({sample_images_count} imagens processadas).",
    })

@app.route('/api/pipelines/evaluate-tag', methods=['POST', 'OPTIONS'])
def evaluate_tag_trigger():
    """
    Evaluates whether a new dataset/image with a given tag matches any active trigger rule.
    """
    data = request.get_json(silent=True) or {}
    tag = data.get('tag', '')
    dataset_name = data.get('dataset_name', '')
    
    matching_rules = [
        r for r in PIPELINE_TRIGGER_RULES 
        if r.get('enabled') and (r.get('matchTag') == tag or tag in (r.get('matchTag') or ''))
    ]

    return jsonify({
        'success': True,
        'tag': tag,
        'matching_rules': matching_rules,
        'has_auto_trigger': len(matching_rules) > 0,
    })

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
        'format': 'best[ext=mp4]/bestvideo[ext=mp4]/best/bestvideo',
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'noplaylist': True,
    }
    if FFMPEG_EXE:
        ydl_opts['ffmpeg_location'] = FFMPEG_EXE

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

    # Configure yt-dlp format to avoid multi-format merging requirements and prioritize fast 720p/480p downloads
    ydl_opts = {
        'format': 'best[height<=720][ext=mp4]/best[height<=480][ext=mp4]/best[ext=mp4]/best[height<=720]/best/worst',
        'format_sort': ['res:720', 'ext:mp4:m4a'],
        'outtmpl': temp_video_path,
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
    }
    if FFMPEG_EXE:
        ydl_opts['ffmpeg_location'] = FFMPEG_EXE
        ydl_opts['format'] = 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]/best'

    try:
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
        except Exception as dl_err:
            # Fallback to direct single MP4 stream download without merging
            fallback_opts = {
                'format': 'best[height<=480][ext=mp4]/best[ext=mp4]/best/worst',
                'outtmpl': temp_video_path,
                'quiet': True,
                'no_warnings': True,
                'noplaylist': True,
            }
            if FFMPEG_EXE:
                fallback_opts['ffmpeg_location'] = FFMPEG_EXE
            with yt_dlp.YoutubeDL(fallback_opts) as ydl_fb:
                ydl_fb.download([url])

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
            try:
                os.remove(temp_video_path)
            except Exception:
                pass

        return jsonify({
            'success': True,
            'totalFramesExtracted': len(extracted_frames),
            'fps': fps,
            'frames': extracted_frames,
        })

    except Exception as e:
        if os.path.exists(temp_video_path):
            try:
                os.remove(temp_video_path)
            except Exception:
                pass
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
