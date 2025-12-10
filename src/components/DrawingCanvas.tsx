import React, { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Pencil, 
  Eraser, 
  Trash2, 
  Download,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DrawingCanvasRef {
  getDataUrl: () => string | null;
  clear: () => void;
}

interface DrawingCanvasProps {
  initialData?: string;
  onSave?: (dataUrl: string) => void;
  className?: string;
  containerRef?: React.RefObject<HTMLElement>;
}

const COLORS = [
  '#000000', '#374151', '#ef4444', '#f97316', 
  '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', 
  '#ec4899', '#ffffff',
];

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({ 
  initialData, 
  onSave,
  className,
  containerRef: externalContainerRef,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef || internalContainerRef;
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const hasChanges = useRef(false);
  const canvasSize = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  useImperativeHandle(ref, () => ({
    getDataUrl: () => {
      const canvas = canvasRef.current;
      return canvas ? canvas.toDataURL('image/png') : null;
    },
    clear: () => clearCanvas(),
  }));

  // Initialize and resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      
      // Store the current drawing
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx && canvasSize.current.width > 0) {
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCtx.drawImage(canvas, 0, 0);
      }

      // Resize canvas
      canvas.width = rect.width;
      canvas.height = rect.height;
      canvasSize.current = { width: rect.width, height: rect.height };

      // Clear and restore
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Restore previous drawing or load initial data
      if (tempCtx && tempCanvas.width > 0) {
        ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
      } else if (initialData) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = initialData;
      }
    };

    resizeCanvas();
    
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(container);

    return () => observer.disconnect();
  }, [containerRef, initialData]);

  // Load initial data when it changes
  useEffect(() => {
    if (!initialData) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = initialData;
  }, [initialData]);

  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const point = getCanvasPoint(e);
    if (!point) return;

    setIsDrawing(true);
    lastPoint.current = point;
  }, [getCanvasPoint]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !lastPoint.current) return;

    const point = getCanvasPoint(e);
    if (!point) return;

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 3;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
    }
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPoint.current = point;
    hasChanges.current = true;
  }, [isDrawing, color, brushSize, tool, getCanvasPoint]);

  const stopDrawing = useCallback(() => {
    if (isDrawing && hasChanges.current) {
      const canvas = canvasRef.current;
      if (canvas && onSave) {
        onSave(canvas.toDataURL('image/png'));
      }
    }
    setIsDrawing(false);
    lastPoint.current = null;
  }, [isDrawing, onSave]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasChanges.current = true;
    
    if (onSave) {
      onSave(canvas.toDataURL('image/png'));
    }
  }, [onSave]);

  const downloadCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'drawing.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-card rounded-lg border border-border mb-2">
        <Button
          variant={tool === 'pen' ? 'default' : 'ghost'}
          size="icon"
          onClick={() => setTool('pen')}
          title="Pen"
        >
          <Pencil className="h-4 w-4" />
        </Button>

        <Button
          variant={tool === 'eraser' ? 'default' : 'ghost'}
          size="icon"
          onClick={() => setTool('eraser')}
          title="Eraser"
        >
          <Eraser className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" title="Color">
              <div 
                className="w-5 h-5 rounded-full border-2 border-border"
                style={{ backgroundColor: color }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-5 gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-7 h-7 rounded-full border-2 hover:scale-110 transition-transform',
                    color === c ? 'border-primary' : 'border-border'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-2 ml-1">
          <Minus className="h-3 w-3 text-muted-foreground" />
          <Slider
            value={[brushSize]}
            onValueChange={(v) => setBrushSize(v[0])}
            min={1}
            max={20}
            step={1}
            className="w-20"
          />
          <div className="w-5 h-5 flex items-center justify-center">
            <div 
              className="rounded-full bg-foreground"
              style={{ width: brushSize, height: brushSize }}
            />
          </div>
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        <Button variant="ghost" size="icon" onClick={clearCanvas} title="Clear Canvas">
          <Trash2 className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" onClick={downloadCanvas} title="Download">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Canvas Container */}
      <div 
        ref={internalContainerRef}
        className="flex-1 relative rounded-xl border border-border overflow-hidden bg-transparent"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
    </div>
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';

export default DrawingCanvas;
