import '@testing-library/jest-dom';

// Polyfills & Mocks for DOM & Canvas
if (typeof window !== 'undefined') {
  // Mock HTMLCanvasElement.getContext
  HTMLCanvasElement.prototype.getContext = function (contextId: string) {
    if (contextId === '2d') {
      return {
        fillRect: () => {},
        clearRect: () => {},
        getImageData: (x: number, y: number, w: number, h: number) => ({
          data: new Array(w * h * 4),
        }),
        putImageData: () => {},
        createImageData: () => [],
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        fillText: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        fill: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        measureText: () => ({ width: 40 }),
        transform: () => {},
        rect: () => {},
        clip: () => {},
        roundRect: () => {},
        strokeRect: () => {},
        setLineDash: () => {},
        getLineDash: () => [],
      } as any;
    }
    return null;
  } as any;

  HTMLCanvasElement.prototype.toDataURL = function () {
    return 'data:image/jpeg;base64,mocked';
  };

  HTMLCanvasElement.prototype.toBlob = function (callback: (blob: Blob | null) => void) {
    callback(new Blob(['mock_blob'], { type: 'image/jpeg' }));
  };

  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
