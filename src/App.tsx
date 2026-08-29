import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FolderPlus, UploadCloud, Video, FileArchive } from 'lucide-react';
import { Header } from './components/Header';
import { HomeHub } from './components/HomeHub';
import { Toolbar } from './components/Toolbar';
import { Canvas } from './components/Canvas';
import { CanvasControls } from './components/CanvasControls';
import { ImageStrip } from './components/ImageStrip';
import { ClassManager } from './components/Sidebar/ClassManager';
import { AnnotationList } from './components/Sidebar/AnnotationList';
import { DatasetStats } from './components/Sidebar/DatasetStats';
import { ImportModal } from './components/Modals/ImportModal';
import { ExportModal } from './components/Modals/ExportModal';
import { ShortcutsModal } from './components/Modals/ShortcutsModal';
import { LabelMapModal } from './components/Modals/LabelMapModal';
import { VideoImportModal } from './components/Modals/VideoImportModal';
import { NewDatasetModal } from './components/Modals/NewDatasetModal';
import { AIAnnotationModal } from './components/Modals/AIAnnotationModal';
import { AugmentationModal } from './components/Modals/AugmentationModal';
import { AISettingsModal } from './components/Modals/AISettingsModal';
import { GeminiSettingsModal } from './components/Modals/GeminiSettingsModal';
import { SidebarActionFooter } from './components/Sidebar/SidebarActionFooter';
import { ToolOptionsBar } from './components/Canvas/ToolOptionsBar';
import { predictImageWithAI } from './utils/aiClient';
import { AIModelType } from './types/aiModel';

// Specialized Workspaces
import { NLPWorkspace } from './components/Workspaces/NLPWorkspace';
import { AudioWorkspace } from './components/Workspaces/AudioWorkspace';
import { DocsWorkspace } from './components/Workspaces/DocsWorkspace';
import { PipelineStudioWorkspace } from './components/Workspaces/PipelineStudioWorkspace';

import { 
  DatasetProject, 
  DatasetClass, 
  DatasetImage, 
  Annotation, 
  ClassSet,
  DomainCategory,
  DatasetTaskType
} from './types/dataset';
import { ToolType, CanvasTransform, ImageFilters } from './types/canvas';
import { createSampleDataset } from './utils/sampleDatasets';
import { 
  saveProjectToStorage, 
  loadProjectFromStorage, 
  saveProjectToDisk, 
  loadProjectsFromDisk, 
  deleteProjectFromDisk 
} from './utils/storage';
import { computeConvexHull, mergeAnnotations } from './utils/geometry';
import { 
  autoClassifyAnnotation, 
  copyAnnotationsToClipboard, 
  getAnnotationClipboard, 
  hasAnnotationClipboard, 
  propagateAnnotationsToTargetImage 
} from './utils/autoClassifier';
import { getImageDimensions } from './utils/zipHandler';

export const App: React.FC = () => {
  // 1. Initial State
  const initialProject = createSampleDataset();
  const [projects, setProjects] = useState<DatasetProject[]>([initialProject]);
  const [currentProjectId, setCurrentProjectId] = useState<string>(initialProject.id);
  const [currentView, setCurrentView] = useState<'home' | 'docs' | 'pipelines' | DomainCategory>('home');

  const currentProject = projects.find((p) => p.id === currentProjectId) || projects[0] || initialProject;

  const [activeClassId, setActiveClassId] = useState<string>(() => currentProject.classes[0]?.id || 'cls_1');
  const [activeTool, setActiveTool] = useState<ToolType>('polygon');
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [selectedAnnotationIds, setSelectedAnnotationIds] = useState<string[]>([]);
  const [sidebarTab, setSidebarTab] = useState<'annotations' | 'classes' | 'stats'>('classes');

  // 2. Canvas Transform & Filters
  const [transform, setTransform] = useState<CanvasTransform>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  const [filters, setFilters] = useState<ImageFilters>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    invert: false,
    showGrid: false,
    showCrosshair: true,
    colorBy: 'label',
    annotationOpacity: 0.35,
    selectedOpacity: 0.65,
    outlinedBorders: true,
    strokeWidth: 2,
    showBitmap: false,
    showProjections: false,
    showLabels: true,
    showPoints: true,
  });

  // 3. Undo / Redo History Stacks
  const [undoStack, setUndoStack] = useState<DatasetProject[]>([]);
  const [redoStack, setRedoStack] = useState<DatasetProject[]>([]);

  // 4. Modals visibility
  const [isNewDatasetModalOpen, setIsNewDatasetModalOpen] = useState(false);
  const [newDatasetModalDomain, setNewDatasetModalDomain] = useState<DomainCategory>('vision');
  const [newDatasetModalTask, setNewDatasetModalTask] = useState<DatasetTaskType | undefined>(undefined);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isLabelMapOpen, setIsLabelMapOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isVideoStudioOpen, setIsVideoStudioOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isAugmentationModalOpen, setIsAugmentationModalOpen] = useState(false);
  const [isGeminiSettingsOpen, setIsGeminiSettingsOpen] = useState(false);
  const [defaultAIModelId, setDefaultAIModelId] = useState<AIModelType>(() => {
    return (localStorage.getItem('annotatex_default_ai_model') as AIModelType) || 'yolov11n';
  });

  // Tool parameter states (Magic Wand & Brush)
  const [wandTolerance, setWandTolerance] = useState(32);
  const [wandContiguous, setWandContiguous] = useState(true);
  const [brushSize, setBrushSize] = useState(20);
  const [brushMode, setBrushMode] = useState<'add' | 'erase'>('add');

  const quickFileInputRef = useRef<HTMLInputElement>(null);

  // Load saved datasets on mount (from disk folder API or local storage)
  useEffect(() => {
    loadProjectsFromDisk().then((diskDatasets) => {
      if (diskDatasets && diskDatasets.length > 0) {
        setProjects(diskDatasets);
        setCurrentProjectId(diskDatasets[0].id);
        setCurrentView(diskDatasets[0].domain);
        if (diskDatasets[0].classes?.[0]?.id) setActiveClassId(diskDatasets[0].classes[0].id);
      } else {
        loadProjectFromStorage().then((saved) => {
          if (saved && saved.id) {
            setProjects((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)]);
            setCurrentProjectId(saved.id);
            if (saved.classes?.[0]?.id) setActiveClassId(saved.classes[0].id);
          }
        });
      }
    });
  }, []);

  // Save current project changes to disk folder and storage with debouncing
  useEffect(() => {
    if (currentProject) {
      saveProjectToStorage(currentProject);
    }
  }, [currentProject]);

  const activeImage = currentProject.images?.find((img) => img.id === currentProject.activeImageId) || currentProject.images?.[0] || null;

  /* Helper to commit project mutations with undo support */
  const updateProject = useCallback(
    (newProjectOrUpdater: DatasetProject | ((prev: DatasetProject) => DatasetProject)) => {
      setProjects((prevProjects) => {
        const curr = prevProjects.find((p) => p.id === currentProjectId) || prevProjects[0];
        const next = typeof newProjectOrUpdater === 'function' ? newProjectOrUpdater(curr) : newProjectOrUpdater;

        setUndoStack((prev) => [...prev.slice(-30), curr]);
        setRedoStack([]);

        return prevProjects.map((p) => (p.id === currentProjectId ? { ...next, updatedAt: Date.now() } : p));
      });
    },
    [currentProjectId]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, currentProject]);
    setUndoStack((u) => u.slice(0, -1));
    setProjects((all) => all.map((p) => (p.id === prev.id ? prev : p)));
  }, [undoStack, currentProject]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, currentProject]);
    setRedoStack((r) => r.slice(0, -1));
    setProjects((all) => all.map((p) => (p.id === next.id ? next : p)));
  }, [redoStack, currentProject]);

  // Global Non-Ctrl Keyboard Shortcuts (U for Undo, Y for Redo, Shift+S for Export, Arrow keys for navigation)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // 1. Undo combinations: U (single key), Shift+Z, Alt+Z, or Ctrl+Z
      if (
        ((e.key === 'u' || e.key === 'U') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) ||
        ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey))
      ) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // 2. Redo combinations: Y (single key), Shift+Y, Shift+U, Alt+Y, or Ctrl+Y
      if (
        ((e.key === 'y' || e.key === 'Y') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) ||
        ((e.key === 'u' || e.key === 'U') && e.shiftKey) ||
        ((e.key === 'y' || e.key === 'Y') && (e.ctrlKey || e.metaKey))
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // 3. Export / Save: Shift+S or Alt+S
      if ((e.key === 's' || e.key === 'S') && (e.shiftKey || e.altKey)) {
        e.preventDefault();
        setIsExportOpen(true);
        return;
      }

      // 4. Quick image navigation: ArrowRight / ArrowLeft
      if (currentProject.images && currentProject.images.length > 1) {
        const currentIdx = currentProject.images.findIndex((img) => img.id === currentProject.activeImageId);
        if (e.key === 'ArrowRight' || (e.key === 'n' && !e.ctrlKey && !e.metaKey)) {
          e.preventDefault();
          const nextIdx = (currentIdx + 1) % currentProject.images.length;
          setCurrentProjectId(currentProject.id);
          updateProject((prev) => ({ ...prev, activeImageId: currentProject.images[nextIdx].id }));
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevIdx = (currentIdx - 1 + currentProject.images.length) % currentProject.images.length;
          updateProject((prev) => ({ ...prev, activeImageId: currentProject.images[prevIdx].id }));
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleUndo, handleRedo, currentProject, updateProject]);

  const handleCreateNewProject = (newProject: DatasetProject) => {
    setProjects((prev) => [newProject, ...prev]);
    setCurrentProjectId(newProject.id);
    setCurrentView(newProject.domain);
    if (newProject.classes?.[0]?.id) {
      setActiveClassId(newProject.classes[0].id);
    }
    // Create folder and files immediately on local disk
    saveProjectToDisk(newProject);
  };

  const handleSelectProject = (id: string) => {
    setCurrentProjectId(id);
    const selected = projects.find((p) => p.id === id);
    if (selected) {
      setCurrentView(selected.domain);
      if (selected.classes?.[0]?.id) setActiveClassId(selected.classes[0].id);
    }
  };

  /* Class & ClassSet Handlers */
  const handleSelectClassSet = (setId: string) => {
    const targetSet = currentProject.classSets.find((cs) => cs.id === setId);
    if (!targetSet) return;

    updateProject((prev) => {
      const activeImg = prev.images.find((img) => img.id === prev.activeImageId);
      let updatedImages = prev.images;

      if (activeImg) {
        updatedImages = prev.images.map((img) => {
          const storedLayers = img.annotationLayers || {};
          const currentAnn = img.annotations;
          const newLayers = { ...storedLayers, [prev.activeClassSetId]: currentAnn };
          const targetAnn = newLayers[setId] || [];

          return {
            ...img,
            annotationLayers: newLayers,
            annotations: targetAnn,
          };
        });
      }

      return {
        ...prev,
        activeClassSetId: setId,
        classes: targetSet.classes,
        images: updatedImages,
      };
    });

    if (targetSet.classes.length > 0) {
      setActiveClassId(targetSet.classes[0].id);
    }
  };

  const handleCreateClassSet = (name: string, cloneCurrent: boolean) => {
    const activeSet = currentProject.classSets.find((cs) => cs.id === currentProject.activeClassSetId) || currentProject.classSets[0];
    const newClasses: DatasetClass[] = cloneCurrent
      ? activeSet.classes.map((c, i) => ({ ...c, id: `cls_${Date.now()}_${i}` }))
      : [
          {
            id: `cls_${Date.now()}_0`,
            name: 'Classe_1',
            color: '#3b82f6',
            shortcutKey: '1',
            visible: true,
            locked: false,
          },
        ];

    const newSet: ClassSet = {
      id: `cset_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name,
      classes: newClasses,
      createdAt: Date.now(),
    };

    updateProject((prev) => ({
      ...prev,
      classSets: [...prev.classSets, newSet],
      activeClassSetId: newSet.id,
      classes: newClasses,
    }));

    setActiveClassId(newClasses[0].id);
  };

  const handleRenameClassSet = (id: string, name: string) => {
    updateProject((prev) => ({
      ...prev,
      classSets: prev.classSets.map((cs) => (cs.id === id ? { ...cs, name } : cs)),
    }));
  };

  const handleDeleteClassSet = (id: string) => {
    if (currentProject.classSets.length <= 1) return;
    const remaining = currentProject.classSets.filter((cs) => cs.id !== id);
    const newActive = remaining[0];

    updateProject((prev) => ({
      ...prev,
      classSets: remaining,
      activeClassSetId: newActive.id,
      classes: newActive.classes,
    }));

    if (newActive.classes.length > 0) {
      setActiveClassId(newActive.classes[0].id);
    }
  };

  /* Add Images / Frames */
  const handleAddImagesToProject = (newImages: DatasetImage[]) => {
    if (newImages.length === 0) return;
    updateProject((prev) => {
      const existing = prev.images || [];
      const updated = [...existing, ...newImages];
      return {
        ...prev,
        images: updated,
        activeImageId: prev.activeImageId || newImages[0].id,
      };
    });
  };

  /* Quick Image File Upload */
  const handleQuickImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imported: DatasetImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      const url = URL.createObjectURL(file);
      const dims = await getImageDimensions(url);

      imported.push({
        id: `img_user_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
        name: file.name,
        url,
        width: dims.width,
        height: dims.height,
        size: file.size,
        annotations: [],
        tags: ['uploaded'],
        status: 'unannotated',
        fileBlob: file,
      });
    }

    if (imported.length > 0) {
      handleAddImagesToProject(imported);
    }
  };

  /* Multi-Selection & Annotation Handlers */
  const handleSelectAnnotation = (id: string | null, multi = false) => {
    if (id === null) {
      setSelectedAnnotationId(null);
      setSelectedAnnotationIds([]);
      return;
    }

    if (multi) {
      setSelectedAnnotationIds((prev) => {
        const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
        setSelectedAnnotationId(next[0] || null);
        return next;
      });
    } else {
      setSelectedAnnotationId(id);
      setSelectedAnnotationIds([id]);
    }
  };

  const handleMergeAnnotations = (idsToMerge?: string[], targetClassId?: string) => {
    if (!activeImage) return;
    const targetIds = idsToMerge && idsToMerge.length >= 2 ? idsToMerge : selectedAnnotationIds;
    if (targetIds.length < 2) return;

    const annsToMerge = activeImage.annotations.filter((a) => targetIds.includes(a.id));
    const merged = mergeAnnotations(annsToMerge, targetClassId);
    if (!merged) return;

    const remainingAnns = activeImage.annotations.filter((a) => !targetIds.includes(a.id));
    const updatedAnns = [...remainingAnns, merged];

    updateProject((prev) => ({
      ...prev,
      images: prev.images.map((img) =>
        img.id === activeImage.id ? { ...img, annotations: updatedAnns } : img
      ),
    }));

    handleSelectAnnotation(merged.id);
  };

  const handleAutoClassify = () => {
    if (!activeImage || !activeImage.annotations.length) return;

    const updatedAnns = activeImage.annotations.map((ann) => {
      const suggestedClassId = autoClassifyAnnotation(
        ann,
        currentProject.classes,
        activeImage.width,
        activeImage.height
      );
      return { ...ann, classId: suggestedClassId };
    });

    updateProject((prev) => ({
      ...prev,
      images: prev.images.map((img) =>
        img.id === activeImage.id ? { ...img, annotations: updatedAnns } : img
      ),
    }));
  };

  const handlePropagateToNext = () => {
    if (!activeImage || !activeImage.annotations.length || !currentProject.images.length) return;
    const currentIdx = currentProject.images.findIndex((img) => img.id === activeImage.id);
    if (currentIdx === -1) return;

    const nextIdx = (currentIdx + 1) % currentProject.images.length;
    const nextImg = currentProject.images[nextIdx];
    if (!nextImg || nextImg.id === activeImage.id) return;

    const updatedNext = propagateAnnotationsToTargetImage(activeImage.annotations, nextImg);

    updateProject((prev) => ({
      ...prev,
      images: prev.images.map((img) => (img.id === nextImg.id ? updatedNext : img)),
      activeImageId: nextImg.id,
    }));
  };

  const handleCopyAnnotations = () => {
    if (!activeImage) return;
    const annsToCopy = selectedAnnotationIds.length > 0
      ? activeImage.annotations.filter((a) => selectedAnnotationIds.includes(a.id))
      : activeImage.annotations;

    if (annsToCopy.length > 0) {
      copyAnnotationsToClipboard(annsToCopy);
    }
  };

  const handlePasteAnnotations = () => {
    if (!activeImage || !hasAnnotationClipboard()) return;
    const pasted = getAnnotationClipboard();
    const updatedAnns = [...activeImage.annotations, ...pasted];

    updateProject((prev) => ({
      ...prev,
      images: prev.images.map((img) =>
        img.id === activeImage.id ? { ...img, annotations: updatedAnns, status: 'completed' } : img
      ),
    }));

    setSelectedAnnotationIds(pasted.map((p) => p.id));
    setSelectedAnnotationId(pasted[0]?.id || null);
  };

  const handleAddAnnotation = (ann: Annotation) => {
    if (!activeImage) return;
    const updatedAnns = [...activeImage.annotations, ann];
    updateProject((prev) => ({
      ...prev,
      images: prev.images.map((img) =>
        img.id === activeImage.id ? { ...img, annotations: updatedAnns, status: 'completed' } : img
      ),
    }));
    handleSelectAnnotation(ann.id);
  };

  const handleUpdateAnnotation = (ann: Annotation) => {
    if (!activeImage) return;
    const updatedAnns = activeImage.annotations.map((a) => (a.id === ann.id ? ann : a));
    updateProject((prev) => ({
      ...prev,
      images: prev.images.map((img) => (img.id === activeImage.id ? { ...img, annotations: updatedAnns } : img)),
    }));
  };

  const handleDeleteAnnotation = (id: string) => {
    if (!activeImage) return;
    const updatedAnns = activeImage.annotations.filter((a) => a.id !== id);
    updateProject((prev) => ({
      ...prev,
      images: prev.images.map((img) => (img.id === activeImage.id ? { ...img, annotations: updatedAnns } : img)),
    }));
    setSelectedAnnotationIds((prev) => prev.filter((item) => item !== id));
    if (selectedAnnotationId === id) setSelectedAnnotationId(null);
  };

  const handleSelectImage = (id: string) => {
    updateProject((prev) => ({
      ...prev,
      activeImageId: id,
    }));
    setSelectedAnnotationId(null);
    setSelectedAnnotationIds([]);
  };

  const handleConvexHull = () => {
    if (!activeImage || !selectedAnnotationId) return;
    const ann = activeImage.annotations.find((a) => a.id === selectedAnnotationId);
    if (!ann || ann.points.length < 3) return;

    const hullPoints = computeConvexHull(ann.points);
    handleUpdateAnnotation({
      ...ann,
      type: 'polygon',
      points: hullPoints,
    });
  };

  /* Pre-Trained AI & Augmentation Handlers */
  const handleApplyAnnotations = (
    imageId: string,
    annotations: any[],
    newClasses: DatasetClass[],
    overwrite: boolean
  ) => {
    updateProject((prev) => {
      const updatedClasses = newClasses.length > 0 ? [...prev.classes, ...newClasses] : prev.classes;
      const updatedImages = prev.images.map((img) => {
        if (img.id === imageId) {
          const finalAnns = overwrite ? annotations : [...img.annotations, ...annotations];
          return {
            ...img,
            annotations: finalAnns,
            status: (finalAnns.length > 0 ? 'completed' : img.status) as 'unannotated' | 'in_progress' | 'completed',
          };
        }
        return img;
      });

      return {
        ...prev,
        classes: updatedClasses,
        images: updatedImages,
      };
    });
  };

  const handleBatchApplyAnnotations = (
    results: Array<{ imageId: string; annotations: any[] }>,
    newClasses: DatasetClass[]
  ) => {
    const resultMap = new Map(results.map((r) => [r.imageId, r.annotations]));
    updateProject((prev) => {
      const updatedClasses = newClasses.length > 0 ? [...prev.classes, ...newClasses] : prev.classes;
      const updatedImages = prev.images.map((img) => {
        const aiAnns = resultMap.get(img.id);
        if (aiAnns) {
          return {
            ...img,
            annotations: [...img.annotations, ...aiAnns],
            status: 'completed' as const,
          };
        }
        return img;
      });

      return {
        ...prev,
        classes: updatedClasses,
        images: updatedImages,
      };
    });
  };

  const handleApplyAugmentedImages = (newImages: DatasetImage[]) => {
    if (!newImages.length) return;
    updateProject((prev) => ({
      ...prev,
      images: [...prev.images, ...newImages],
    }));
  };

  /* Clone / Copy Annotations from Previous Image */
  const handleCloneFromPrevious = () => {
    if (!activeImage) return;
    const currentIndex = currentProject.images.findIndex((img) => img.id === activeImage.id);
    if (currentIndex <= 0) return;
    const prevImage = currentProject.images[currentIndex - 1];
    if (!prevImage || !prevImage.annotations.length) return;

    const clonedAnns = prevImage.annotations.map((ann) => ({
      ...ann,
      id: `ann_cloned_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: Date.now(),
    }));

    updateProject((prev) => ({
      ...prev,
      images: prev.images.map((img) =>
        img.id === activeImage.id
          ? { ...img, annotations: [...img.annotations, ...clonedAnns], status: 'completed' as const }
          : img
      ),
    }));

    setSelectedAnnotationIds(clonedAnns.map((a) => a.id));
    setSelectedAnnotationId(clonedAnns[0]?.id || null);
  };

  /* Run Remembered Default AI Model on Active Image */
  const handleRunDefaultAI = async () => {
    if (!activeImage) return;
    try {
      const res = await predictImageWithAI(
        activeImage,
        {
          modelId: defaultAIModelId,
          confidenceThreshold: 0.25,
          iouThreshold: 0.45,
          autoAddNewClasses: true,
          overwriteExisting: false,
        },
        currentProject.classes
      );
      handleApplyAnnotations(activeImage.id, res.annotations, res.newClasses, false);
    } catch (e) {
      console.error('Failed to run default AI inference:', e);
    }
  };

  /* Batch Gallery Handlers */
  const handleDeleteSelectedImages = (ids: string[]) => {
    updateProject((prev) => ({
      ...prev,
      images: prev.images.filter((img) => !ids.includes(img.id)),
      activeImageId: ids.includes(prev.activeImageId || '')
        ? prev.images.find((img) => !ids.includes(img.id))?.id || null
        : prev.activeImageId,
    }));
  };

  const handleRunAIOnSelected = async (ids: string[]) => {
    const targetImages = currentProject.images.filter((img) => ids.includes(img.id));
    const results: Array<{ imageId: string; annotations: Annotation[] }> = [];
    let currentClasses = [...currentProject.classes];
    const newClassesOverall: DatasetClass[] = [];

    for (const img of targetImages) {
      const res = await predictImageWithAI(
        img,
        {
          modelId: defaultAIModelId,
          confidenceThreshold: 0.25,
          iouThreshold: 0.45,
          autoAddNewClasses: true,
          overwriteExisting: false,
        },
        currentClasses
      );
      results.push({ imageId: img.id, annotations: res.annotations });
      if (res.newClasses.length > 0) {
        currentClasses = [...currentClasses, ...res.newClasses];
        newClassesOverall.push(...res.newClasses);
      }
    }

    handleBatchApplyAnnotations(results, newClassesOverall);
  };

  const handlePasteToSelected = (ids: string[]) => {
    if (!activeImage || !activeImage.annotations.length) return;
    const templateAnns = activeImage.annotations;
    updateProject((prev) => ({
      ...prev,
      images: prev.images.map((img) => {
        if (ids.includes(img.id) && img.id !== activeImage.id) {
          const freshAnns = templateAnns.map((ann) => ({
            ...ann,
            id: `ann_batch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            createdAt: Date.now(),
          }));
          return {
            ...img,
            annotations: [...img.annotations, ...freshAnns],
            status: 'completed' as const,
          };
        }
        return img;
      }),
    }));
  };

  const annotationCountByClass = new Map<string, number>();
  (currentProject.images || []).forEach((img) => {
    img.annotations.forEach((ann) => {
      annotationCountByClass.set(ann.classId, (annotationCountByClass.get(ann.classId) || 0) + 1);
    });
  });

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#080b11] text-slate-100 font-sans select-none">
      {/* 1. Universal Top Navigation Header */}
      <Header
        currentView={currentView}
        onNavigateView={(view) => setCurrentView(view)}
        projects={projects}
        currentProject={currentProject}
        onSelectProject={handleSelectProject}
        onOpenNewDatasetModal={(domain, taskType) => {
          setNewDatasetModalDomain(domain || 'vision');
          setNewDatasetModalTask(taskType);
          setIsNewDatasetModalOpen(true);
        }}
        onUpdateProjectName={(name) => updateProject((prev) => ({ ...prev, name }))}
        onOpenAIModal={() => setIsAIModalOpen(true)}
        onOpenAugmentationModal={() => setIsAugmentationModalOpen(true)}
        onOpenGeminiSettings={() => setIsGeminiSettingsOpen(true)}
      />

      {/* 2. Main View Router */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* VIEW A: HOME DASHBOARD HUB */}
        {currentView === 'home' && (
          <HomeHub
            projects={projects}
            currentProjectId={currentProjectId}
            onSelectProject={(id) => handleSelectProject(id)}
            onOpenNewDatasetModal={(domain, taskType) => {
              setNewDatasetModalDomain(domain || 'vision');
              setNewDatasetModalTask(taskType);
              setIsNewDatasetModalOpen(true);
            }}
            onOpenExportModal={(proj) => {
              if (proj) setCurrentProjectId(proj.id);
              setIsExportOpen(true);
            }}
            onOpenVideoStudio={(proj) => {
              if (proj) setCurrentProjectId(proj.id);
              setIsVideoStudioOpen(true);
            }}
            onOpenPipelines={() => setCurrentView('pipelines')}
          />
        )}

        {/* VIEW B: IN-APP DOCUMENTATION */}
        {currentView === 'docs' && <DocsWorkspace />}

        {/* VIEW B: NLP & LLM STUDIO */}
        {currentView === 'nlp' && (
          <NLPWorkspace
            project={currentProject}
            activeClassId={activeClassId}
            onUpdateProject={(updated) => updateProject(updated)}
            onOpenExportModal={() => setIsExportOpen(true)}
            onOpenNewDatasetModal={(domain, taskType) => {
              setNewDatasetModalDomain(domain || 'nlp');
              setNewDatasetModalTask(taskType);
              setIsNewDatasetModalOpen(true);
            }}
          />
        )}

        {/* VIEW C: AUDIO & SPEECH STUDIO */}
        {currentView === 'audio' && (
          <AudioWorkspace
            project={currentProject}
            onUpdateProject={(updated) => updateProject(updated)}
            onOpenExportModal={() => setIsExportOpen(true)}
          />
        )}

        {/* VIEW D: VISUAL PIPELINES & NODE STUDIO */}
        {currentView === 'pipelines' && (
          <PipelineStudioWorkspace
            project={currentProject}
            projects={projects}
            onUpdateProject={(updated) => updateProject(updated)}
            onOpenExportModal={() => setIsExportOpen(true)}
            onOpenNewDatasetModal={(domain, taskType) => {
              setNewDatasetModalDomain(domain || 'vision');
              setNewDatasetModalTask(taskType);
              setIsNewDatasetModalOpen(true);
            }}
          />
        )}

        {/* VIEW E: COMPUTER VISION & YOLO CANVAS STUDIO */}
        {currentView === 'vision' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Toolbar */}
            <Toolbar
              activeTool={activeTool}
              onSelectTool={setActiveTool}
              canUndo={undoStack.length > 0}
              canRedo={redoStack.length > 0}
              onUndo={() => {
                if (undoStack.length === 0) return;
                const prev = undoStack[undoStack.length - 1];
                setRedoStack((r) => [...r, currentProject]);
                setUndoStack((u) => u.slice(0, -1));
                setProjects((all) => all.map((p) => (p.id === prev.id ? prev : p)));
              }}
              onRedo={() => {
                if (redoStack.length === 0) return;
                const next = redoStack[redoStack.length - 1];
                setUndoStack((u) => [...u, currentProject]);
                setRedoStack((r) => r.slice(0, -1));
                setProjects((all) => all.map((p) => (p.id === next.id ? next : p)));
              }}
              hasSelection={selectedAnnotationIds.length > 0 || !!selectedAnnotationId}
              onDeleteSelected={() => {
                if (selectedAnnotationIds.length > 0) {
                  selectedAnnotationIds.forEach(id => handleDeleteAnnotation(id));
                } else if (selectedAnnotationId) {
                  handleDeleteAnnotation(selectedAnnotationId);
                }
              }}
              onOpenShortcuts={() => setIsShortcutsOpen(true)}
              onMergeSelected={handleMergeAnnotations}
              canMerge={selectedAnnotationIds.length >= 2}
              wandTolerance={wandTolerance}
              onWandToleranceChange={setWandTolerance}
              wandContiguous={wandContiguous}
              onWandContiguousChange={setWandContiguous}
              brushSize={brushSize}
              onBrushSizeChange={setBrushSize}
              brushMode={brushMode}
              onBrushModeChange={setBrushMode}
            />

            {/* Hidden Input for Quick Image Add */}
            <input
              ref={quickFileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleQuickImageUpload}
              className="hidden"
            />

            {/* Center Canvas Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#06080d]">
              {/* Photoshop Style Tool Options Bar */}
              <ToolOptionsBar
                activeTool={activeTool}
                wandTolerance={wandTolerance}
                onWandToleranceChange={setWandTolerance}
                wandContiguous={wandContiguous}
                onWandContiguousChange={setWandContiguous}
                brushSize={brushSize}
                onBrushSizeChange={setBrushSize}
                brushMode={brushMode}
                onBrushModeChange={setBrushMode}
              />

              <div className="flex-1 relative w-full h-full overflow-hidden">
                <Canvas
                  image={activeImage}
                  classes={currentProject.classes}
                  activeClassId={activeClassId}
                  activeTool={activeTool}
                  selectedAnnotationId={selectedAnnotationId}
                  selectedAnnotationIds={selectedAnnotationIds}
                  onSelectAnnotation={handleSelectAnnotation}
                  onAddAnnotation={handleAddAnnotation}
                  onUpdateAnnotation={handleUpdateAnnotation}
                  onDeleteAnnotation={handleDeleteAnnotation}
                  onMergeAnnotations={handleMergeAnnotations}
                  onPropagateToNext={handlePropagateToNext}
                  onCloneFromPrevious={handleCloneFromPrevious}
                  onSelectTool={setActiveTool}
                  onFitScreen={() => setTransform({ scale: 0.95, offsetX: 0, offsetY: 0 })}
                  onOpenAIModal={() => setIsAIModalOpen(true)}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  wandTolerance={wandTolerance}
                  wandContiguous={wandContiguous}
                  brushSize={brushSize}
                  brushMode={brushMode}
                  transform={transform}
                  onTransformChange={setTransform}
                  filters={filters}
                />

                {/* Empty Dataset Action Card */}
                {(!activeImage || currentProject.images.length === 0) && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none p-4">
                    <div className="pointer-events-auto bg-slate-900/95 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl backdrop-blur-md text-center flex flex-col items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <FolderPlus className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-slate-100">{currentProject.name}</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Este dataset está vazio. Adicione imagens ou extraia frames de vídeos para começar a anotar.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 w-full mt-2">
                        <button
                          onClick={() => quickFileInputRef.current?.click()}
                          className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
                        >
                          <UploadCloud className="w-4 h-4" />
                          <span>Selecionar Imagens do Computador</span>
                        </button>
                        <button
                          onClick={() => setIsVideoStudioOpen(true)}
                          className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-all flex items-center justify-center gap-2"
                        >
                          <Video className="w-4 h-4 text-indigo-400" />
                          <span>Extrair de Vídeo ou Link da Web</span>
                        </button>
                        <button
                          onClick={() => setIsImportOpen(true)}
                          className="w-full py-2 px-4 rounded-xl bg-transparent hover:bg-slate-800/60 text-slate-400 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                        >
                          <FileArchive className="w-3.5 h-3.5" />
                          <span>Carregar Arquivo ZIP / COCO / YOLO</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Canvas Controls */}
              <CanvasControls
                transform={transform}
                filters={filters}
                onTransformChange={setTransform}
                onFiltersChange={setFilters}
                onFitScreen={() => setTransform({ scale: 0.95, offsetX: 0, offsetY: 0 })}
                canMerge={selectedAnnotationIds.length >= 2}
                onMergeSelected={handleMergeAnnotations}
              />

              {/* Bottom Image Filmstrip with Multi-Select */}
              <ImageStrip
                images={currentProject.images || []}
                activeImageId={currentProject.activeImageId}
                onSelectImage={handleSelectImage}
                onAddImages={() => quickFileInputRef.current?.click()}
                onDeleteImage={(id) => {
                  updateProject((prev) => ({
                    ...prev,
                    images: prev.images.filter((img) => img.id !== id),
                  }));
                }}
                onDeleteSelectedImages={handleDeleteSelectedImages}
                onRunAIOnSelected={handleRunAIOnSelected}
                onPasteToSelected={handlePasteToSelected}
              />
            </div>

            {/* Right Sidebar */}
            <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 h-full">
              {/* Sidebar Tabs */}
              <div className="flex border-b border-slate-800 bg-slate-950/80 text-xs">
                <button
                  onClick={() => setSidebarTab('classes')}
                  className={`flex-1 py-3 font-semibold transition-colors border-b-2 ${
                    sidebarTab === 'classes'
                      ? 'border-blue-500 text-blue-400 bg-slate-900/60'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Classes & Schemas
                </button>
                <button
                  onClick={() => setSidebarTab('annotations')}
                  className={`flex-1 py-3 font-semibold transition-colors border-b-2 ${
                    sidebarTab === 'annotations'
                      ? 'border-blue-500 text-blue-400 bg-slate-900/60'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Anotações ({activeImage?.annotations.length || 0})
                </button>
                <button
                  onClick={() => setSidebarTab('stats')}
                  className={`flex-1 py-3 font-semibold transition-colors border-b-2 ${
                    sidebarTab === 'stats'
                      ? 'border-blue-500 text-blue-400 bg-slate-900/60'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Estatísticas
                </button>
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 overflow-hidden">
                {sidebarTab === 'classes' && (
                  <ClassManager
                    classSets={currentProject.classSets}
                    activeClassSetId={currentProject.activeClassSetId}
                    onSelectClassSet={handleSelectClassSet}
                    onCreateClassSet={handleCreateClassSet}
                    onRenameClassSet={handleRenameClassSet}
                    onDeleteClassSet={handleDeleteClassSet}
                    classes={currentProject.classes}
                    activeClassId={activeClassId}
                    onSelectClass={setActiveClassId}
                    onAddClass={(cls) =>
                      updateProject((prev) => ({ ...prev, classes: [...prev.classes, cls] }))
                    }
                    onUpdateClass={(cls) =>
                      updateProject((prev) => ({
                        ...prev,
                        classes: prev.classes.map((c) => (c.id === cls.id ? cls : c)),
                      }))
                    }
                    onDeleteClass={(id) =>
                      updateProject((prev) => ({
                        ...prev,
                        classes: prev.classes.filter((c) => c.id !== id),
                      }))
                    }
                    annotationCountByClass={annotationCountByClass}
                  />
                )}

                {sidebarTab === 'annotations' && (
                  <AnnotationList
                    image={activeImage}
                    classes={currentProject.classes}
                    selectedAnnotationId={selectedAnnotationId}
                    selectedAnnotationIds={selectedAnnotationIds}
                    onSelectAnnotation={handleSelectAnnotation}
                    onUpdateAnnotation={handleUpdateAnnotation}
                    onDeleteAnnotation={handleDeleteAnnotation}
                    onAddAnnotation={handleAddAnnotation}
                    onMergeAnnotations={handleMergeAnnotations}
                    onUpdateImageTags={(tags) => {
                      if (!activeImage) return;
                      updateProject((prev) => ({
                        ...prev,
                        images: prev.images.map((img) => (img.id === activeImage.id ? { ...img, tags } : img)),
                      }));
                    }}
                  />
                )}

                {sidebarTab === 'stats' && (
                  <DatasetStats project={currentProject} onClose={() => setSidebarTab('classes')} />
                )}
              </div>

              {/* Bottom Actions Footer inside Sidebar (Under Classes / Annotations / Stats) */}
              <SidebarActionFooter
                currentModelId={defaultAIModelId}
                onRunDefaultAI={handleRunDefaultAI}
                onOpenAIConfigModal={() => setIsAIModalOpen(true)}
                onOpenAugmentationModal={() => setIsAugmentationModalOpen(true)}
                onAutoClassify={handleAutoClassify}
                onCloneFromPrevious={handleCloneFromPrevious}
                onFitScreen={() => setTransform({ scale: 0.95, offsetX: 0, offsetY: 0 })}
                onOpenAddImages={() => quickFileInputRef.current?.click()}
                onOpenVideoStudio={() => setIsVideoStudioOpen(true)}
                onOpenExportModal={() => setIsExportOpen(true)}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Global Modals */}
      <NewDatasetModal
        isOpen={isNewDatasetModalOpen}
        onClose={() => setIsNewDatasetModalOpen(false)}
        initialDomain={newDatasetModalDomain}
        initialTaskType={newDatasetModalTask}
        onCreateProject={handleCreateNewProject}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        project={currentProject}
      />

      <VideoImportModal
        isOpen={isVideoStudioOpen}
        onClose={() => setIsVideoStudioOpen(false)}
        onAddImagesToProject={handleAddImagesToProject}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        project={currentProject}
        onAddImagesToProject={handleAddImagesToProject}
        onReplaceProject={(p) => updateProject(p)}
        onOpenVideoStudio={() => setIsVideoStudioOpen(true)}
      />

      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      <LabelMapModal
        isOpen={isLabelMapOpen}
        onClose={() => setIsLabelMapOpen(false)}
        classes={currentProject.classes}
        onUpdateClasses={(classes) => updateProject((prev) => ({ ...prev, classes }))}
      />

      {/* AI Pre-Trained Models Auto-Annotation Modal */}
      <AIAnnotationModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        project={currentProject}
        activeImage={activeImage}
        defaultModelId={defaultAIModelId}
        onModelChange={(id) => setDefaultAIModelId(id)}
        onOpenAISettings={() => setIsGeminiSettingsOpen(true)}
        onApplyAnnotations={handleApplyAnnotations}
        onBatchApplyAnnotations={handleBatchApplyAnnotations}
      />

      {/* Interactive Data Augmentation Studio Modal */}
      <AugmentationModal
        isOpen={isAugmentationModalOpen}
        onClose={() => setIsAugmentationModalOpen(false)}
        project={currentProject}
        activeImage={activeImage}
        onApplyAugmentedImages={handleApplyAugmentedImages}
      />

      {/* Universal AI Providers & API Keys Settings Modal */}
      <AISettingsModal
        isOpen={isGeminiSettingsOpen}
        onClose={() => setIsGeminiSettingsOpen(false)}
      />
    </div>
  );
};

export default App;
