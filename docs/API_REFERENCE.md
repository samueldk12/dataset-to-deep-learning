# Backend API Reference

The AnnotateX Python Video & Stream Backend exposes lightweight REST endpoints on port `5000` to process remote streams, download web videos without CORS limitations, and capture frame batches with OpenCV.

---

## 🛰️ Endpoints

### 1. Health Check
`GET /api/health`

Returns service health status and yt-dlp version.

**Response:**
```json
{
  "status": "online",
  "service": "AnnotateX Python Video & Stream Server",
  "yt_dlp_version": "2024.08.06"
}
```

---

### 2. Extract Video Information & Stream
`POST /api/extract-youtube`

Extracts direct streaming URLs, duration, and resolution from YouTube, Reddit, or direct video URLs.

**Request Payload:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Response:**
```json
{
  "success": true,
  "title": "Video Title Example",
  "duration": 213,
  "thumbnail": "https://i.ytimg.com/...",
  "streamUrl": "https://rr2---sn-....googlevideo.com/...",
  "width": 1280,
  "height": 720
}
```

---

### 3. Server-Side Frame Extraction Batch
`POST /api/download-and-extract-frames`

Downloads the video on the backend and uses OpenCV to extract frames at a specified interval or target frame count, returning base64 JPEG strings to prevent browser canvas tainting.

**Request Payload:**
```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "intervalSec": 2.0,
  "maxFrames": 20
}
```

**Response:**
```json
{
  "success": true,
  "totalFramesExtracted": 20,
  "fps": 30.0,
  "frames": [
    {
      "frameIndex": 0,
      "timestampSec": 0.0,
      "timestampStr": "00:00",
      "width": 1280,
      "height": 720,
      "dataUrl": "data:image/jpeg;base64,..."
    }
  ]
}
```

---

### 4. Live Stream & RTSP Snapshot Grabber
`POST /api/live-stream-snapshot`

Connects to an RTSP camera stream, HLS URL, or live stream and returns a single uncompressed high-resolution frame.

**Request Payload:**
```json
{
  "streamUrl": "rtsp://admin:pass@192.168.1.100:554/stream1"
}
```

**Response:**
```json
{
  "success": true,
  "width": 1920,
  "height": 1080,
  "dataUrl": "data:image/jpeg;base64,..."
}
```
