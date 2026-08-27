# 🚀 AnnotateX Studio

> **Plataforma Unificada de Criação, Anotação e Exportação de Datasets para IA & Deep Learning.**
> 
> *Unified Multi-Modal Dataset Annotation, Curation & Export Studio for Deep Learning.*
>
> *用于深度学习的统一多模态数据集标注、管理与导出平台。*
>
> *Единая платформа для разметки, создания и экспорта датасетов глубокого обучения.*

---

<p align="center">
  <a href="#-português">🇧🇷 Português</a> •
  <a href="#-english">🇺🇸 English</a> •
  <a href="#-中文-chinese">🇨🇳 中文</a> •
  <a href="#-русский-russian">🇷🇺 Русский</a>
</p>

---

## 🇧🇷 Português

O **AnnotateX Studio** é uma plataforma profissional de anotação de dados de código aberto para engenheiros de Machine Learning, pesquisadores e equipes de IA. A ferramenta unifica o ciclo de vida completo de datasets em **38 paradigmas de IA** abrangendo **Visão Computacional**, **Processamento de Linguagem Natural (NLP & LLMs)** e **Áudio & Fala**.

### ✨ Funcionalidades Principais
- **Visão Computacional (14 Tarefas):** Bounding Boxes 2D, Polígonos com edição de vértices e cálculo de Fecho Convexo (*Convex Hull*), Keypoints anatômicos, Cubóides 3D, Círculos, Linhas e Máscaras de Pixel.
- **Painel de Aparência (Estilo CVAT):** Opções `Color by` (Label / Instance / Group), sliders de `Opacity` e `Selected opacity`, `Outlined borders`, `Show bitmap` e `Show projections`.
- **Mesclagem de Anotações:** Mescla 2 ou mais anotações (união de caixas ou fecho convexo de polígonos) com a tecla `M` ou botão dedicado.
- **Auto-Classificação & Propagação:** Classificador automático por geometria e propagação/cópia de anotações entre imagens (`Shift+D` / `Ctrl+C`, `Ctrl+V`).
- **Exportação com `config.yaml` e `data.yaml` por padrão:** Suporte a YOLOv11/v8/v9/v10/v5/v7, COCO JSON, Pascal VOC e **Apache Parquet**.
- **Model Context Protocol (MCP):** Servidor MCP embutido (`/api/mcp` e `server/mcp_server.py`) para interação autônoma com agentes Claude, Cursor e Antigravity.

### 🐳 Execução Rápida com Docker
```bash
docker-compose up --build -d
```
Acesse:
- **Web App:** [http://localhost:3000/](http://localhost:3000/)
- **Backend API & MCP:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🇺🇸 English

**AnnotateX Studio** is an open-source, full-stack data annotation and dataset curation platform designed for Machine Learning engineers, researchers, and AI developers. It unifies **38 deep learning paradigms** across **Computer Vision**, **Natural Language Processing (NLP & LLMs)**, and **Audio & Speech**.

### ✨ Key Features
- **Computer Vision (14 Paradigms):** 2D Bounding Boxes, Segmentation Polygons with interactive vertex editing and Convex Hull, Pose Keypoints, 3D Cuboids, Ellipses, Polylines, and Pixel Masks.
- **Appearance Control Panel (CVAT-Style):** `Color by` (Label, Instance, Group), `Opacity` and `Selected Opacity` sliders, `Outlined borders`, `Show bitmap`, and coordinate axis `Show projections`.
- **Annotation Merging:** Seamlessly merge 2+ annotations into unified bounding boxes or convex hull polygon masks (`M` shortcut).
- **Auto-Classifier & Frame Propagation:** Intelligent heuristic auto-labeling and cross-image copy-paste/propagation (`Shift+D`, `Ctrl+C`/`Ctrl+V`).
- **Automatic `config.yaml` & `data.yaml` Export:** Standardized export packaging for YOLOv11/v8, COCO, Pascal VOC, and column-oriented **Apache Parquet**.
- **Model Context Protocol (MCP) Server:** Native MCP endpoint (`/api/mcp` & `server/mcp_server.py`) enabling AI agents (Claude Desktop, Cursor, Antigravity) to manage datasets programmatically.

### 🐳 Quick Start with Docker
```bash
docker-compose up --build -d
```
- **Web Interface:** [http://localhost:3000/](http://localhost:3000/)
- **Backend Service:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🇨🇳 中文 (Chinese)

**AnnotateX Studio** 是一款专为机器学习工程师和人工智能研究人员打造的开源全栈多模态数据标注与数据集管理平台。它支持计算机视觉、自然语言处理（NLP与大语言模型）以及语音音频领域的 **38 种深度学习任务范式**。

### ✨ 核心功能
- **计算机视觉（14 种任务）：** 2D 目标检测边界框、多边形分割（支持交互式顶点调整与凸包计算）、人体姿态关键点、3D 空间长方体、圆形/椭圆、多段线及像素级掩码画笔。
- **外观渲染面板（CVAT 风格）：** 支持按标签类别、实例 ID 或分组着色（`Color by: Label / Instance / Group`）、透明度滑块、高亮边框和投影参考线（`Show projections`）。
- **标注合并（Merge）：** 选中两个或多个标注即可一键合并为外接矩形或凸包多边形（快捷键 `M`）。
- **自动分类与跨帧复制：** 启发式几何自动归类算法，支持将标注快速传播复制到下一帧或目标图像（`Shift+D`）。
- **默认导出 `config.yaml` 与 `data.yaml`：** 原生支持 YOLOv11/v8/v9/v10、COCO JSON、Pascal VOC 以及高性能二进制 **Apache Parquet** 格式。
- **模型上下文协议（MCP）支持：** 内置 Python MCP 服务器（`/api/mcp` 和 `server/mcp_server.py`），支持 Claude Desktop、Cursor 和 AI Agent 自动化调用。

### 🐳 Docker 一键启动
```bash
docker-compose up --build -d
```
- **前端页面：** [http://localhost:3000/](http://localhost:3000/)
- **后端接口：** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🇷🇺 Русский (Russian)

**AnnotateX Studio** — это профессиональная платформа с открытым исходным кодом для разметки, создания и экспорта наборов данных для глубокого обучения. Инструмент охватывает **38 парадигм искусственного интеллекта** в области **компьютерного зрения**, **обработки естественного языка (NLP и LLM)** и **обработки аудио и речи**.

### ✨ Основные возможности
- **Компьютерное зрение (14 задач):** 2D Bounding Box, полигональная сегментация с редактированием вершин и вычислением выпуклой оболочки (*Convex Hull*), ключевые точки позы, 3D-кубоиды, полилинии и кисть масок.
- **Панель внешнего вида (стиль CVAT):** Режимы раскраски `Color by` (Label / Instance / Group), регуляторы прозрачности `Opacity` и `Selected opacity`, четкие границы `Outlined borders` и проекционные линии `Show projections`.
- **Объединение аннотаций (Merge):** Быстрое слияние 2 и более аннотаций в единый BBox или полигон по клавише `M`.
- **Автоклассификация и перенос аннотаций:** Эвристическая авторазметка по геометрии и копирование разметки на следующий кадр (`Shift+D` / `Ctrl+C`, `Ctrl+V`).
- **Экспорт с `config.yaml` и `data.yaml` по умолчанию:** Поддержка YOLOv11/v8/v9/v10, COCO JSON, Pascal VOC и бинарного формата **Apache Parquet**.
- **Поддержка Model Context Protocol (MCP):** Встроенный сервер MCP (`/api/mcp` и `server/mcp_server.py`) для взаимодействия с Claude Desktop, Cursor и автономными агентами.

### 🐳 Запуск через Docker Compose
```bash
docker-compose up --build -d
```
- **Веб-интерфейс:** [http://localhost:3000/](http://localhost:3000/)
- **Сервер API и MCP:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 📄 License

Distributed under the **MIT License**.
