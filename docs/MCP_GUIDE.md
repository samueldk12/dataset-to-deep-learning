# Model Context Protocol (MCP) Guide for AnnotateX Studio

AnnotateX Studio provides built-in support for the **Model Context Protocol (MCP)**, allowing Large Language Models and AI agents (such as Claude Desktop, Cursor, Antigravity, and LangChain) to create, annotate, auto-classify, merge, and export datasets programmatically.

---

## 🛠️ Available MCP Tools

| Tool Name | Description |
|---|---|
| `annotatex_create_dataset` | Creates a new Vision, NLP, or Audio dataset with custom taxonomy classes. |
| `annotatex_extract_video_frames` | Extracts frames from YouTube/Reddit/Stream URLs without CORS restrictions. |
| `annotatex_merge_annotations` | Unifies 2 or more annotations into a single BBox or Convex Hull polygon. |
| `annotatex_auto_classify` | Applies heuristic classifiers to label objects automatically. |
| `annotatex_export_dataset` | Exports annotations to YOLOv11/v8, COCO, or Parquet with `config.yaml`. |

---

## ⚙️ Configuration for AI Agents

### 1. Claude Desktop Configuration
Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "annotatex": {
      "command": "python",
      "args": ["server/mcp_server.py"],
      "cwd": "/path/to/dataset-to-deep-learning"
    }
  }
}
```

### 2. HTTP / JSON-RPC Endpoint
If connecting over HTTP:
- **URL:** `http://localhost:5000/api/mcp`
- **Method:** `POST` with standard JSON-RPC 2.0 payload (`tools/list`, `tools/call`).
