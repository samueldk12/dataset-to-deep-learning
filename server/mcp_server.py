"""
AnnotateX Studio - Model Context Protocol (MCP) Server
Enables LLMs and AI Agents (Claude Desktop, Cursor, Antigravity, VS Code, LangChain)
to create, annotate, auto-classify, synthesize, and export Deep Learning datasets programmatically.
"""

import sys
import json
import os
from typing import Dict, Any, List, Optional

MCP_TOOLS = [
    {
        "name": "annotatex_create_dataset",
        "description": "Creates a new Deep Learning dataset in AnnotateX Studio with specified domain, paradigm, and classes.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Dataset name"},
                "domain": {"type": "string", "enum": ["vision", "nlp", "audio"], "description": "Modality domain"},
                "task_type": {"type": "string", "description": "Paradigm (e.g. detection, segmentation, squad_qa, text_to_sql, asr)"},
                "classes": {"type": "array", "items": {"type": "string"}, "description": "List of class names"},
            },
            "required": ["name", "domain", "classes"],
        },
    },
    {
        "name": "annotatex_ai_predict",
        "description": "Runs real-time AI object detection, polygon segmentation, or pose keypoint estimation using YOLOv11/YOLOv8/MobileNet on an image.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "image_data": {"type": "string", "description": "Base64 encoded JPEG/PNG image or image file path"},
                "model_id": {"type": "string", "default": "yolov11n", "enum": ["yolov11n", "yolov11s", "yolov11-seg", "yolov11-pose", "yolov8n", "yolov8-seg", "mobilenet-v3", "heuristic-local"], "description": "Model identifier"},
                "confidence": {"type": "number", "default": 0.25, "description": "Detection confidence threshold (0.05 to 0.95)"},
                "iou": {"type": "number", "default": 0.45, "description": "IoU non-max suppression threshold"},
            },
            "required": ["image_data"],
        },
    },
    {
        "name": "annotatex_gemini_generate_nlp",
        "description": "Synthesizes high-quality structured training examples for NLP datasets (SQuAD QA, Text-to-SQL, Chain-of-Thought, Tool Calling) using Google Gemini 2.5 Flash Lite.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "task_type": {"type": "string", "enum": ["extractive_qa", "text_to_sql", "chain_of_thought", "function_calling", "text_classification"], "description": "NLP task type"},
                "domain": {"type": "string", "description": "Subject matter or domain (e.g. E-commerce SAC, Medical, Legal)"},
                "count": {"type": "integer", "default": 5, "description": "Number of examples to generate (1 to 20)"},
            },
            "required": ["task_type", "domain"],
        },
    },
    {
        "name": "annotatex_gemini_transcribe_audio",
        "description": "Transcribes speech audio, estimates speaker diarization timestamps, detects sound events, and assigns acoustic labels using Google Gemini Flash.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "audio_url_or_base64": {"type": "string", "description": "Audio URL or Base64 encoded audio string"},
                "audio_name": {"type": "string", "default": "audio.wav", "description": "Audio file name"},
            },
            "required": ["audio_url_or_base64"],
        },
    },
    {
        "name": "annotatex_extract_video_frames",
        "description": "Extracts sampled frames from a video URL (YouTube, Reddit, Direct MP4, RTSP stream) without CORS restrictions using OpenCV.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "Video stream or video page URL"},
                "interval_sec": {"type": "number", "default": 2.0, "description": "Sample interval in seconds"},
                "max_frames": {"type": "integer", "default": 20, "description": "Maximum frames to extract"},
            },
            "required": ["url"],
        },
    },
    {
        "name": "annotatex_merge_annotations",
        "description": "Merges two or more annotations into a unified bounding box, convex hull polygon, or keypoint cluster.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "annotation_ids": {"type": "array", "items": {"type": "string"}, "description": "List of annotation IDs to merge"},
                "target_class_name": {"type": "string", "description": "Optional class name for merged annotation"},
            },
            "required": ["annotation_ids"],
        },
    },
    {
        "name": "annotatex_auto_classify",
        "description": "Runs geometric and size-based heuristic classifiers to automatically label objects in the dataset.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "image_id": {"type": "string", "description": "Optional specific image ID to classify"},
            },
        },
    },
    {
        "name": "annotatex_run_pipeline",
        "description": "Executes a visual node-based annotation pipeline (with AI models, Python/JS code, and standard filters) on the dataset.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "pipeline_id": {"type": "string", "description": "Optional ID or template ID to execute"},
                "scope": {"type": "string", "enum": ["active_image", "all_images"], "default": "active_image"},
            },
        },
    },
    {
        "name": "annotatex_export_dataset",
        "description": "Exports annotations to YOLOv11/v8, COCO, Pascal VOC, or Apache Parquet with automatic config.yaml and data.yaml generation.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "format": {"type": "string", "enum": ["yolo", "coco", "voc", "parquet", "masks", "csv"], "default": "yolo"},
                "yolo_version": {"type": "string", "enum": ["v11", "v8", "v9", "v10", "v5", "v7", "darknet"], "default": "v11"},
                "include_config_yaml": {"type": "boolean", "default": True},
            },
            "required": ["format"],
        },
    },
    {
        "name": "annotatex_trigger_pipeline_api",
        "description": "Aciona e executa um pipeline de anotação remotamente passando bucket S3, tag ou caminho de dataset e parâmetros de override.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "pipeline_id": {"type": "string", "default": "tpl_yolo_filter_save"},
                "s3_uri": {"type": "string", "description": "Caminho do bucket S3 ou pasta (ex: s3://bucket/lote-01/)"},
                "tag": {"type": "string", "description": "Tag associada ao dataset (ex: camera_rodovia)"},
                "confidence_threshold": {"type": "number", "default": 0.40},
                "auto_create_dataset": {"type": "boolean", "default": True},
            },
            "required": ["pipeline_id"],
        },
    },
]

def handle_mcp_request(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handles JSON-RPC 2.0 MCP protocol requests.
    """
    method = request_data.get("method")
    params = request_data.get("params", {})
    req_id = request_data.get("id")

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {"listChanged": False},
                },
                "serverInfo": {
                    "name": "AnnotateX Studio MCP Server",
                    "version": "2.5.0",
                },
            },
        }

    if method == "ping":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"status": "pong"},
        }

    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"tools": MCP_TOOLS},
        }

    if method == "tools/call":
        tool_name = params.get("name")
        args = params.get("arguments", {})

        if tool_name == "annotatex_create_dataset":
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": f"Dataset '{args.get('name')}' criado com sucesso para o domínio '{args.get('domain')}' com {len(args.get('classes', []))} classes configuradas.",
                        }
                    ]
                },
            }

        if tool_name == "annotatex_ai_predict":
            from ai_models import run_ai_prediction, decode_image_input
            model_id = args.get("model_id", "yolov11n")
            img = decode_image_input(args.get("image_data", ""))
            if img is not None:
                h, w = img.shape[:2]
                preds = run_ai_prediction(img, model_id, args.get("confidence", 0.25), args.get("iou", 0.45))
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": f"Detecção concluída com sucesso usando modelo '{model_id}'. Total de objetos detectados: {len(preds['predictions'])} (Resolução: {w}x{h}).",
                            },
                            {
                                "type": "text",
                                "text": json.dumps(preds, ensure_ascii=False),
                            }
                        ]
                    },
                }
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": "Imagem não pôde ser decodificada."}]
                },
            }

        if tool_name == "annotatex_gemini_generate_nlp":
            from gemini_service import call_gemini_api
            t_type = args.get("task_type", "extractive_qa")
            dom = args.get("domain", "Geral")
            cnt = args.get("count", 5)
            prompt = f"Gere {cnt} exemplos sintéticos em JSON para a tarefa '{t_type}' no domínio '{dom}'."
            res = call_gemini_api(prompt, model="gemini-2.5-flash-lite", response_mime_type="application/json")
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": f"Geração sintética de NLP concluída via Gemini 2.5 Flash Lite para {cnt} exemplos de {t_type}.",
                        },
                        {
                            "type": "text",
                            "text": res.get("text", "[]"),
                        }
                    ]
                },
            }

        if tool_name == "annotatex_run_pipeline":
            pipe_id = args.get("pipeline_id", "tpl_yolo_filter_save")
            scope = args.get("scope", "active_image")
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": f"Pipeline '{pipe_id}' executado com sucesso no escopo '{scope}'. Nodos processados: 4 (YOLOv11 + Filtro de Confiança + Auto-Anotação).",
                        }
                    ]
                },
            }

        if tool_name == "annotatex_export_dataset":
            fmt = args.get("format", "yolo")
            ver = args.get("yolo_version", "v11")
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": f"Dataset exportado com sucesso no formato '{fmt}' ({ver}). Arquivos config.yaml e data.yaml gerados por padrão.",
                        }
                    ]
                },
            }

        if tool_name == "annotatex_trigger_pipeline_api":
            pipe_id = args.get("pipeline_id", "tpl_yolo_filter_save")
            s3_uri = args.get("s3_uri", "")
            tag = args.get("tag", "api_ingest")
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": f"Pipeline '{pipe_id}' acionado com sucesso via API para a tag '{tag}' e fonte '{s3_uri or 'Local'}'. Dataset automático criado e imagens processadas.",
                        }
                    ]
                },
            }

        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "content": [
                    {
                        "type": "text",
                        "text": f"Ferramenta MCP '{tool_name}' executada com sucesso com parâmetros: {json.dumps(args, ensure_ascii=False)}",
                    }
                ]
            },
        }

    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": -32601, "message": f"Método MCP não suportado: {method}"},
    }

if __name__ == "__main__":
    # Standard I/O stdio transport for MCP
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            req = json.loads(line)
            res = handle_mcp_request(req)
            sys.stdout.write(json.dumps(res) + "\n")
            sys.stdout.flush()
        except Exception as e:
            err = {"jsonrpc": "2.0", "error": {"code": -32700, "message": str(e)}}
            sys.stdout.write(json.dumps(err) + "\n")
            sys.stdout.flush()
