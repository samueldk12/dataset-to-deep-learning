# 🚀 AnnotateX Studio

> **Plataforma Unificada de Criação, Anotação e Exportação de Datasets para Inteligência Artificial e Deep Learning.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![Python](https://img.shields.io/badge/Python-3.11-3776ab.svg)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ed.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)

---

## 📖 Visão Geral

O **AnnotateX Studio** é uma plataforma profissional de anotação de dados de código aberto projetada para engenheiros de Machine Learning, pesquisadores e desenvolvedores. A ferramenta unifica o ciclo de vida completo de datasets em **38 paradigmas de IA** abrangendo **Visão Computacional**, **Processamento de Linguagem Natural (NLP & LLMs)** e **Processamento de Áudio & Fala**.

---

## ✨ Principais Funcionalidades

### 👁️ 1. Visão Computacional (14 Tarefas)
- **Modos de Anotação Vetorial:**
  - Caixas delimitadoras (*Bounding Boxes*) com 8 alças de redimensionamento e translação.
  - Polígonos de segmentação com arraste interativo de vértices e cálculo automático de **Fecho Convexo (*Convex Hull*)**.
  - Keypoints e esqueletos anatômicos para *Pose Estimation*.
  - Polilinhas, traçados lineares e círculos delimitadores.
- **Ingestão de Mídia & Vídeos sem CORS:**
  - Extração de frames com precisão de milissegundos via **Python backend com `yt-dlp` e `OpenCV`**.
  - Suporte a vídeos do YouTube, Reddit, links web diretos e gravação ao vivo por **Webcam / Stream RTSP/HLS**.
- **Multi-ClassSets (Conjuntos de Classes Independentes):**
  - Crie e alterne entre múltiplos conjuntos de classes no mesmo conjunto de imagens para exportar versões comparativas.
- **Formatos de Exportação:**
  - **YOLO:** YOLOv11, YOLOv8, YOLOv9, YOLOv10, YOLOv5, YOLOv7, Darknet com geração de `data.yaml` e divisão *Train/Val*.
  - **COCO 1.0 JSON:** Padrão Detectron2 e TorchVision.
  - **Pascal VOC XML:** Formato clássico baseado em XML.
  - **Apache Parquet (`.parquet`):** Formato binário colunar de alta performance que empacota bytes de imagens e anotações para consumo direto no Pandas ou HuggingFace `datasets`.

---

### 📄 2. Processamento de Linguagem Natural & LLMs (12 Tarefas)
- **Extractive Question Answering (SQuAD 2.0):** Seleção de spans de resposta no texto de contexto diretamente com o mouse, calculando automaticamente `answer_start` e `answer_end`.
- **Text-to-SQL & Geração de Código:** Pareamento de perguntas em linguagem natural, schema do banco de dados (DDL) e consultas SQL executáveis (*Spider benchmark*).
- **Reasoning & Chain-of-Thought (CoT):** Estruturação do raciocínio passo a passo (`thought`) para modelos como **DeepSeek-R1** e **OpenAI o1**.
- **Tool Use & Function Calling:** Definição determinística de ferramentas e argumentos JSON (`tool_calls`).
- **RAG Triplet Retrieval:** Pares de consulta com passagens positivas e exemplos negativos desafiadores (*Hard Negatives*).
- **Formatos:** JSON Lines (`.jsonl`), SQuAD JSON, ShareGPT, Alpaca, Apache Parquet.

---

### 🎙️ 3. Áudio & Fala (12 Tarefas)
- **Visualizador Waveform Interativo:** Player com scrubber milimétrico e formas de onda acústicas.
- **Reconhecimento de Fala (ASR / Whisper):** Pareamento de áudio com transcrição textual *ground truth*.
- **Diarização de Locutores:** Marcação de turnos temporais de oradores (`start`, `end`, `speaker`).
- **Detecção de Eventos Sonoros (SED):** Registro de intervalos acústicos de alarmes, sirenes e sons ambientes.
- **Alinhamento Forçado:** Sincronização temporal de palavras e fonemas.
- **Formatos:** Audio Manifest JSONL, RTTM Diarização, Praat TextGrid, Apache Parquet.

---

## 🐳 Executando com Docker Compose

O projeto é 100% conteinerizado para execução com um único comando:

```bash
docker-compose up --build -d
```

### Serviços Inicializados:
- **Frontend React (SPA):** [http://localhost:3000/](http://localhost:3000/)
- **Backend Python (Flask/OpenCV/yt-dlp):** [http://localhost:5000/api/health](http://localhost:5000/api/health)

Para parar os serviços:
```bash
docker-compose down
```

---

## 💻 Execução Local sem Docker

### 1. Pré-requisitos
- **Node.js:** Versão 18+ ou 20+
- **Python:** Versão 3.10+
- **FFmpeg:** Instalado e disponível no PATH do sistema.

### 2. Passo a Passo

#### A. Frontend (React + TypeScript + Vite)
```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento Vite (porta 3000)
npm run dev
```

#### B. Backend Python (yt-dlp & OpenCV)
```bash
# Instalar dependências Python
pip install -r server/requirements.txt

# Iniciar serviço Flask (porta 5000)
python server/app.py
```

---

## 📚 Documentação do Projeto

A documentação técnica detalhada está disponível tanto na pasta `/docs` quanto diretamente na interface web da aplicação:

- [Visão Geral da Arquitetura](docs/ARCHITECTURE.md)
- [Guia dos 38 Paradigmas de Dataset](docs/PARADIGMS_GUIDE.md)
- [Referência da API do Backend](docs/API_REFERENCE.md)
- [Guia de Configuração Docker](docs/DOCKER_SETUP.md)

---

## 🧪 Testes Automatizados

O projeto conta com suíte de testes unitários e de integração validando geometria, exportadores e navegação:

```bash
# Executar todos os testes com Vitest
npm test

# Executar compilação de produção e validação estática TypeScript
npm run build
```

---

## 🛠️ Tecnologias Utilizadas

- **Interface:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite.
- **Processamento Gráfico:** HTML5 Canvas 2D API, Algoritmo Graham Scan (Convex Hull).
- **Manipulação de Dados & Arquivos:** `JSZip`, `file-saver`, `hyparquet-writer`.
- **Backend & Mídia:** Python 3.11, Flask, Flask-CORS, OpenCV (`cv2`), `yt-dlp`, FFmpeg.
- **Infraestrutura:** Docker, Docker Compose, Nginx Alpine.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Consulte `LICENSE` para mais detalhes.
