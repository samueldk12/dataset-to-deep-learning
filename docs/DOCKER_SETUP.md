# Docker & Docker Compose Setup Guide

AnnotateX Studio is fully containerized with Docker and Docker Compose for simple, one-command deployment in any local, on-premise, or cloud environment.

---

## 🚀 Quick Start with Docker Compose

### 1. Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine (v20+)
- [Docker Compose](https://docs.docker.com/compose/) (v2+)

### 2. Build and Launch
From the project root directory, run:

```bash
docker-compose up --build -d
```

This will automatically:
1. Build the Python 3.11 backend with `OpenCV`, `FFmpeg`, and `yt-dlp`.
2. Build the React SPA with Node.js and serve it via an optimized Nginx container with automatic reverse proxy for `/api/`.

### 3. Accessing the Application
- **Web Interface:** [http://localhost:3000/](http://localhost:3000/)
- **Backend API:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🛑 Stopping the Services

```bash
docker-compose down
```

To also remove named volumes:
```bash
docker-compose down -v
```

---

## 🐳 Architecture of Docker Services

| Service | Container Name | Port | Description |
|---|---|---|---|
| `frontend` | `annotatex-frontend` | `3000 -> 80` | Production React SPA served via Nginx with API reverse proxy. |
| `backend` | `annotatex-backend` | `5000 -> 5000` | Python Flask service with OpenCV, FFmpeg, and yt-dlp. |
