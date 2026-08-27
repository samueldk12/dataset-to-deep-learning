# Catalog of Supported Dataset Paradigms (38 Formats)

AnnotateX Studio provides specialized workflows and standardized data schemas for 38 distinct Deep Learning dataset paradigms across Computer Vision, Natural Language Processing (NLP & LLMs), and Audio & Speech.

---

## 👁️ 1. Computer Vision Paradigms (14 Tasks)

| Paradigm / Task | Target Models | Export Formats | Output Description |
|---|---|---|---|
| **Object Detection** | YOLOv11, YOLOv8, Faster-RCNN | YOLO TXT, COCO JSON, Pascal VOC, Parquet | Normalized bounding boxes `[x_center, y_center, width, height]` with class indices. |
| **Instance Segmentation** | YOLOv11-Seg, Mask R-CNN | YOLO-Seg, COCO Mask, PNG Masks | Normalized polygon vertex series `[x1, y1, x2, y2, ...]` delimiting object boundaries. |
| **Panoptic Segmentation** | Mask2Former, OneFormer | COCO Panoptic, RGB Mask PNG | Pixel-level semantic category segmentation combined with individual instance IDs. |
| **Pose Estimation** | YOLO-Pose, HRNet, MediaPipe | YOLO-Pose TXT, COCO Keypoints | Anatomical landmark keypoint coordinates `[x, y, visibility]` with skeleton connections. |
| **Multi-Object Tracking (MOT)**| ByteTrack, DeepOCSORT | MOT16/20 TXT, FairMOT CSV | Frame-by-frame tracked bounding boxes with persistent identity IDs across time. |
| **OCR & Text Spotting** | PaddleOCR, TrOCR, EasyOCR | COCO-Text, ICDAR JSON, CSV | Quadrilateral polygon text boundaries paired with ground-truth transcribed text strings. |
| **Visual Grounding** | GLIP, Grounding DINO, MDETR | Grounding JSON, HuggingFace Dataset | Natural language referring expressions aligned to specific target bounding boxes. |
| **VQA & Captioning** | LLaVA, BLIP-2, MiniGPT-4 | LLaVA JSON, ShareGPT4V JSONL | Images paired with conversational question-and-answer pairs or dense descriptive captions. |
| **Depth Estimation** | MiDaS, Depth Anything, DPT | 16-bit PNG Depth Maps, EXR Float32 | Metric or relative per-pixel depth distance estimation arrays. |
| **Super-Resolution (SR)** | Real-ESRGAN, HAT, SwinIR | Dual Directory Paired PNG | Low-Resolution (LR) and High-Resolution (HR) aligned image pairs (2x, 4x, 8x). |
| **3D Point Clouds** | PointNet++, PV-RCNN, Gaussian Splat | KITTI 3D Bin, PLY, PCD, Parquet | 3D oriented bounding boxes `[x, y, z, dx, dy, dz, r, p, y]` from LiDAR point clouds. |
| **Optical Flow** | RAFT, FlowNet2, GMA | Flo Binary, UV Color PNG | Pixel motion displacement vectors between consecutive video frames `[dx, dy]`. |
| **Text-to-Image / Diffusion**| Stable Diffusion, FLUX, SDXL | Parquet, WebDataset, Metadata JSONL | High-resolution images paired with detailed descriptive prompt conditioning captions. |
| **ControlNet Conditioning** | ControlNet SD1.5 / SDXL | Multi-Directory Condition Pairs | Source images paired with spatial condition maps (Canny edges, OpenPose, Depth, Normal). |

---

## 📄 2. NLP & Large Language Models Paradigms (12 Tasks)

| Paradigm / Task | Target Models | Export Formats | Output Description |
|---|---|---|---|
| **Extractive QA (SQuAD)** | BERT, RoBERTa, DeBERTa | SQuAD 2.0 JSON, HuggingFace | Paragraph context, question, and exact character start/end span indices (`answer_start`, `answer_text`). |
| **Text-to-SQL & Code Gen** | DeepSeek-Coder, CodeLlama, StarCoder | Spider JSON, SQL DDL JSONL | Database DDL schema, user question in natural language, and executable SQL query. |
| **Reasoning & CoT** | DeepSeek-R1, OpenAI o1, QwQ | JSON Lines (.jsonl), ShareGPT | Problem prompt, detailed step-by-step reasoning thought trace (`thought`), and final answer (`response`). |
| **Tool Use & Function Calling**| Hermes 2/3, Mistral, Toolformer | OpenAI Tool JSON, ShareGPT | Available API tool definitions schema, user request, and generated JSON tool invocation payload. |
| **RAG Triplet Retrieval** | BGE-M3, ColBERT, Cohere Rerank | BEIR JSONL, Triplet TSV | Query string paired with positive passage document and challenging hard-negative candidate passages. |
| **Named Entity Recognition** | SpaCy, HuggingFace NER | CoNLL-2003, SpaCy JSON, BIO Tags | Tokenized text with character/token span category entity classifications (PER, ORG, LOC, MISC). |
| **Coreference Resolution** | CorefQA, LingMess-Coref | CoNLL-2012, Mention Clusters JSON | Entity mention clusters referring to the same real-world entity throughout text discourse. |
| **Relation Extraction** | REBEL, OpenIE, Luke | Knowledge Graph JSON, RDF Triples | Subject-Predicate-Object semantic relationship triples extracted from sentences. |
| **Sentence Pairs & NLI** | Cross-Encoder, SentenceTransformers | NLI JSONL, CSV Pairs | Sentence A and Sentence B pairs annotated with Entailment, Contradiction, or Neutral relationships. |
| **Instruction Tuning (SFT)** | Llama-3, Mistral, Gemma | Alpaca JSON, ShareGPT JSONL | Multi-turn conversational instruction datasets for Supervised Fine-Tuning. |
| **Preference & DPO Tuning** | DPO, ORPO, RLHF Alignment | DPO JSONL, UltraFeedback Format | Prompt paired with human-preferred response (`chosen`) and dispreferred response (`rejected`). |
| **Text Classification** | FastText, ModernBERT, RoBERTa | CSV, Parquet, JSONL | Single-label or multi-label categorical document classifications. |

---

## 🎙️ 3. Audio & Speech Processing Paradigms (12 Tasks)

| Paradigm / Task | Target Models | Export Formats | Output Description |
|---|---|---|---|
| **Speech Recognition (ASR)**| Whisper, Conformer, MMS | Manifest JSONL, WebDataset, CSV | Audio WAV/FLAC files paired with precise verbatim ground-truth transcriptions. |
| **Speaker Diarization** | PyAnnote, Kaldi, NeMo | RTTM (.rttm), NIST Diarization | Multi-speaker time segment intervals with speaker identity labels (`start`, `end`, `speaker_id`). |
| **Forced Alignment** | Montreal Forced Aligner, Charsiu | Praat TextGrid, JSON Alignment | Sub-second word-level and phoneme-level boundary timestamps synchronized with spoken speech. |
| **Sound Event Detection (SED)**| YAMNet, AudioSpectrogramTransformer | DCASE TSV, Audioset CSV | Environmental sound event timestamps with acoustic class labels (e.g. siren, glass break, dog bark). |
| **Text-to-Speech (TTS)** | VITS, FastSpeech 2, XTTS | LJSpeech CSV, Audio Manifest | High-fidelity studio audio recordings paired with phoneme/text transcriptions. |
| **Audio Classification** | Audio Spectrogram Transformer, BEATs | CSV, Parquet, Manifest JSON | Global audio clip classification labels (e.g. musical genre, engine diagnostics). |
| **Source Separation** | Demucs, Spleeter, Conv-TasNet | Multi-Track Stems (WAV/FLAC) | Mixed audio track aligned with isolated individual stem recordings (vocals, drums, bass, others). |
| **Speech Denoising** | DeepFilterNet, VoiceBank | Paired Clean/Noisy WAV | Clean target speech paired with background noise-injected audio tracks. |
| **Voice Conversion (VC)** | FreeVC, OpenVoice | Paired Source/Target WAV | Audio of speaker A paired with identical linguistic utterance in the voice profile of speaker B. |
| **Music Info Retrieval (MIR)**| Crepe, Madmom, Librosa | MIDI, Sonic Visualizer JAMS | Musical beat, downbeat, tempo (BPM), chord progression, and melodic pitch tracking annotations. |
| **Lip-sync & Audio-Visual** | Wav2Lip, SyncNet, VideoRetalking | Video Frames + Aligned Audio WAV | Synchronized visual facial mouth movements paired with acoustic phoneme audio frames. |
| **Speech-to-Speech (S2ST)** | SeamlessM4T, AudioPaLM | Multi-lingual Aligned Audio WAV | Source spoken audio in language A paired with translated spoken audio in language B. |
