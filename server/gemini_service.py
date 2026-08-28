"""
AnnotateX Studio - Google Gemini Service
Provides ultra-fast and low-cost NLP dataset synthesis and Audio transcription/labeling
using Google Gemini 2.5 Flash Lite & Gemini 2.5 Flash.
"""

import os
import json
import base64
import urllib.request
from typing import Dict, Any, Optional

DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite"

def get_api_key(custom_key: Optional[str] = None) -> str:
    if custom_key and custom_key.strip():
        return custom_key.strip()
    return os.environ.get("GEMINI_API_KEY", "").strip()

def call_gemini_api(
    prompt: str,
    model: str = DEFAULT_GEMINI_MODEL,
    custom_api_key: Optional[str] = None,
    response_mime_type: str = "application/json",
    audio_base64: Optional[str] = None,
    audio_mime_type: str = "audio/wav"
) -> Dict[str, Any]:
    api_key = get_api_key(custom_api_key)
    if not api_key:
        return {
            "success": False,
            "error": "Chave de API do Google Gemini não configurada. Adicione sua chave no arquivo .env ou no modal de configurações."
        }

    # Ensure model has clean name
    clean_model = model.replace("models/", "")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent?key={api_key}"

    parts = []
    if audio_base64:
        if "," in audio_base64:
            audio_base64 = audio_base64.split(",", 1)[1]
        parts.append({
            "inlineData": {
                "mimeType": audio_mime_type,
                "data": audio_base64.strip()
            }
        })

    parts.append({"text": prompt})

    body = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "responseMimeType": response_mime_type,
            "temperature": 0.7
        }
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            candidate = data.get("candidates", [{}])[0]
            text = candidate.get("content", {}).get("parts", [{}])[0].get("text", "")
            return {
                "success": True,
                "model": clean_model,
                "text": text
            }
    except Exception as e:
        print(f"Error in call_gemini_api: {e}")
        return {
            "success": False,
            "error": str(e)
        }
