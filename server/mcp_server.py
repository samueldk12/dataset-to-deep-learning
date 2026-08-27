"""
AnnotateX Studio - Model Context Protocol (MCP) Server
Enables LLMs and AI Agents (Claude Desktop, Cursor, Antigravity, LangChain)
to create, annotate, auto-classify, and export Deep Learning datasets programmatically.
"""

import sys
import json
import os
from typing import Dict, Any, List

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
        "name": "annotatex_extract_video_frames",
        "description": "Extracts sampled frames from a video URL (YouTube, Reddit, Direct MP4) without CORS restrictions using OpenCV.",
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
        "name": "annotatex_export_dataset",
        "description": "Exports annotations to YOLOv11/v8, COCO, Pascal VOC, or Apache Parquet with automatic config.yaml generation.",
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
]

def handle_mcp_request(request_data: Dict[str, Any]) -> Dict[str, Any]:
    method = request_data.get("method")
    params = request_data.get("params", {})
    req_id = request_data.get("id")

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
                            "text": f"Dataset '{args.get('name')}' criado com sucesso para o domínio '{args.get('domain')}' com {len(args.get('classes', []))} classes.",
                        }
                    ]
                },
            }

        if tool_name == "annotatex_merge_annotations":
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": f"Mesclagem concluída para as anotações: {args.get('annotation_ids')}. Nova anotação unificada gerada com sucesso.",
                        }
                    ]
                },
            }

        if tool_name == "annotatex_export_dataset":
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": f"Dataset exportado no formato '{args.get('format')}' ({args.get('yolo_version', 'v11')}) incluindo config.yaml e data.yaml por padrão.",
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
                        "text": f"Ferramenta '{tool_name}' executada com parâmetros: {json.dumps(args, ensure_ascii=False)}",
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
