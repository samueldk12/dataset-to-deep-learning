import { describe, it, expect, vi, beforeEach } from 'vitest';
import JSZip from 'jszip';
import { DatasetClass, DatasetImage, DatasetProject } from '../types/dataset';

// Capture the Blob passed to file-saver instead of actually triggering a browser download.
let savedBlob: Blob | null = null;
let savedName = '';
vi.mock('file-saver', () => ({
  saveAs: (blob: Blob, name: string) => {
    savedBlob = blob;
    savedName = name;
  },
}));

import { downloadDatasetZip } from '../utils/zipHandler';

describe('zipHandler (ZIP dataset export)', () => {
  const sampleClasses: DatasetClass[] = [
    { id: 'cls_car', name: 'Car', color: '#3b82f6', shortcutKey: '1', visible: true, locked: false },
    { id: 'cls_ped', name: 'Pedestrian', color: '#10b981', shortcutKey: '2', visible: true, locked: false },
  ];

  const makeProject = (images: DatasetImage[]): DatasetProject => ({
    id: 'proj_1',
    name: 'Zip Export Demo',
    description: 'Test Dataset',
    domain: 'vision',
    taskType: 'object_detection',
    classSets: [{ id: 'c1', name: 'Main', classes: sampleClasses, createdAt: Date.now() }],
    activeClassSetId: 'c1',
    classes: sampleClasses,
    images,
    activeImageId: images[0]?.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  beforeEach(() => {
    savedBlob = null;
    savedName = '';
  });

  it('writes the correct class index (not always 0) into YOLO label files', async () => {
    const img: DatasetImage = {
      id: 'img_01',
      name: 'test_image.jpg',
      url: 'data:image/jpeg;base64,mock',
      fileBlob: new Blob(['fake-jpeg-bytes'], { type: 'image/jpeg' }),
      width: 800,
      height: 600,
      annotations: [
        {
          id: 'ann_car',
          classId: 'cls_car',
          type: 'bbox',
          points: [{ x: 100, y: 150 }, { x: 300, y: 350 }],
          visible: true,
          locked: false,
        },
        {
          id: 'ann_ped',
          classId: 'cls_ped',
          type: 'bbox',
          points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
          visible: true,
          locked: false,
        },
      ],
      tags: [],
      status: 'completed',
    };

    await downloadDatasetZip(makeProject([img]), 'yolo');

    expect(savedBlob).not.toBeNull();
    const zip = await JSZip.loadAsync(savedBlob as Blob);
    const labelTxt = await zip.file('labels/test_image.txt')!.async('string');
    const lines = labelTxt.trim().split('\n');

    // cls_car is class index 0, cls_ped is class index 1 — previously both were
    // written as 0 because the internal classMap was never populated.
    expect(lines[0].startsWith('0 ')).toBe(true);
    expect(lines[1].startsWith('1 ')).toBe(true);
  });

  it('does not emit an orphaned label file for an image whose blob could not be fetched', async () => {
    const goodImg: DatasetImage = {
      id: 'img_good',
      name: 'good.jpg',
      url: 'data:image/jpeg;base64,mock',
      fileBlob: new Blob(['ok'], { type: 'image/jpeg' }),
      width: 100,
      height: 100,
      annotations: [],
      tags: [],
      status: 'unannotated',
    };
    const badImg: DatasetImage = {
      id: 'img_bad',
      name: 'bad.jpg',
      // No fileBlob and an unfetchable URL forces getImageBlob() to return null.
      url: 'not-a-real-protocol://unreachable',
      width: 100,
      height: 100,
      annotations: [
        {
          id: 'ann_x',
          classId: 'cls_car',
          type: 'bbox',
          points: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
          visible: true,
          locked: false,
        },
      ],
      tags: [],
      status: 'completed',
    };

    await downloadDatasetZip(makeProject([goodImg, badImg]), 'yolo');

    const zip = await JSZip.loadAsync(savedBlob as Blob);
    expect(zip.file('images/good.jpg')).not.toBeNull();
    expect(zip.file('labels/good.txt')).not.toBeNull();
    // The image never made it into the archive, so its label file must not either.
    expect(zip.file('images/bad.jpg')).toBeNull();
    expect(zip.file('labels/bad.txt')).toBeNull();
  });
});
