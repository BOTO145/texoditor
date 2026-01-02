import React, { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { 
  Pencil, 
  Eraser, 
  Trash2, 
  Download,
  Minus,
  Undo2,
  Redo2,
  Square,
  Circle,
  Triangle,
  Star,
  Heart,
  Hexagon,
  Pentagon,
  Octagon,
  Diamond,
  Shapes,
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

type Tool = 'pen' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'triangle' | 'star' | 'heart' | 'hexagon' | 'pentagon' | 'octagon' | 'diamond';

const COMMON_SHAPES: Tool[] = ['rectangle', 'circle', 'triangle', 'line'];
const UNCOMMON_SHAPES: Tool[] = ['star', 'heart', 'diamond', 'hexagon', 'pentagon', 'octagon'];

const SHAPE_ICONS: Record<Tool, React.ReactNode> = {
  pen: <Pencil className="h-4 w-4" />,
  eraser: <Eraser className="h-4 w-4" />,
  line: <Minus className="h-4 w-4 rotate-[-45deg]" />,
  rectangle: <Square className="h-4 w-4" />,
  circle: <Circle className="h-4 w-4" />,
  triangle: <Triangle className="h-4 w-4" />,
  star: <Star className="h-4 w-4" />,
  heart: <Heart className="h-4 w-4" />,
  hexagon: <Hexagon className="h-4 w-4" />,
  pentagon: <Pentagon className="h-4 w-4" />,
  octagon: <Octagon className="h-4 w-4" />,
  diamond: <Diamond className="h-4 w-4" />,
};

const MAX_HISTORY = 50;

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({ 
  initialData, 
  onSave,
  className,
  containerRef: externalContainerRef,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef || internalContainerRef;
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState<Tool>('pen');
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const hasChanges = useRef(false);
  const canvasSize = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  
  // Undo/Redo history
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedo = useRef(false);
  
  // Preview canvas for shapes
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    getDataUrl: () => {
      const canvas = canvasRef.current;
      return canvas ? canvas.toDataURL('image/png') : null;
    },
    clear: () => clearCanvas(),
  }));

  // Save state to history
  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isUndoRedo.current) return;
    
    const dataUrl = canvas.toDataURL('image/png');
    
    setHistory(prev => {
      // Remove any redo states
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add new state
      newHistory.push(dataUrl);
      // Limit history size
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    isUndoRedo.current = true;
    const newIndex = historyIndex - 1;
    
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHistoryIndex(newIndex);
      isUndoRedo.current = false;
      if (onSave) onSave(canvas.toDataURL('image/png'));
    };
    img.src = history[newIndex];
  }, [history, historyIndex, onSave]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    isUndoRedo.current = true;
    const newIndex = historyIndex + 1;
    
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHistoryIndex(newIndex);
      isUndoRedo.current = false;
      if (onSave) onSave(canvas.toDataURL('image/png'));
    };
    img.src = history[newIndex];
  }, [history, historyIndex, onSave]);

  // Initialize and resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !previewCanvas || !container) return;

    const ctx = canvas.getContext('2d');
    const previewCtx = previewCanvas.getContext('2d');
    if (!ctx || !previewCtx) return;

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

      // Resize canvases
      canvas.width = rect.width;
      canvas.height = rect.height;
      previewCanvas.width = rect.width;
      previewCanvas.height = rect.height;
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
          // Save initial state to history
          saveToHistory();
        };
        img.src = initialData;
      } else {
        // Save empty canvas to history
        saveToHistory();
      }
    };

    resizeCanvas();
    
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(container);

    return () => observer.disconnect();
  }, [containerRef, initialData, saveToHistory]);

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

  // Draw shape helper
  const drawShape = useCallback((ctx: CanvasRenderingContext2D, shapeType: Tool, start: { x: number; y: number }, end: { x: number; y: number }, strokeColor: string, lineWidth: number) => {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const width = end.x - start.x;
    const height = end.y - start.y;
    const centerX = start.x + width / 2;
    const centerY = start.y + height / 2;
    const radiusX = Math.abs(width / 2);
    const radiusY = Math.abs(height / 2);
    const radius = Math.min(radiusX, radiusY);

    switch (shapeType) {
      case 'line':
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        break;
      case 'rectangle':
        ctx.rect(start.x, start.y, width, height);
        break;
      case 'circle':
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        break;
      case 'triangle':
        ctx.moveTo(centerX, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.lineTo(start.x, end.y);
        ctx.closePath();
        break;
      case 'star': {
        const spikes = 5;
        const outerRadius = radius;
        const innerRadius = radius / 2;
        for (let i = 0; i < spikes * 2; i++) {
          const r = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (Math.PI / spikes) * i - Math.PI / 2;
          const x = centerX + r * Math.cos(angle);
          const y = centerY + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;
      }
      case 'heart': {
        const scale = radius / 15;
        ctx.moveTo(centerX, centerY + 10 * scale);
        ctx.bezierCurveTo(centerX, centerY + 7 * scale, centerX - 5 * scale, centerY, centerX - 15 * scale, centerY);
        ctx.bezierCurveTo(centerX - 20 * scale, centerY - 12 * scale, centerX, centerY - 15 * scale, centerX, centerY - 5 * scale);
        ctx.bezierCurveTo(centerX, centerY - 15 * scale, centerX + 20 * scale, centerY - 12 * scale, centerX + 15 * scale, centerY);
        ctx.bezierCurveTo(centerX + 5 * scale, centerY, centerX, centerY + 7 * scale, centerX, centerY + 10 * scale);
        break;
      }
      case 'diamond':
        ctx.moveTo(centerX, start.y);
        ctx.lineTo(end.x, centerY);
        ctx.lineTo(centerX, end.y);
        ctx.lineTo(start.x, centerY);
        ctx.closePath();
        break;
      case 'hexagon': {
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 2;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;
      }
      case 'pentagon': {
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;
      }
      case 'octagon': {
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI / 4) * i - Math.PI / 8;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;
      }
    }
    ctx.stroke();
  }, []);

  const isShapeTool = tool !== 'pen' && tool !== 'eraser';

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const point = getCanvasPoint(e);
    if (!point) return;

    setIsDrawing(true);
    lastPoint.current = point;
    startPoint.current = point;
  }, [getCanvasPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const point = getCanvasPoint(e);
    
    // Update cursor position directly via ref for zero latency
    if (point && cursorRef.current) {
      cursorRef.current.style.left = `${point.x}px`;
      cursorRef.current.style.top = `${point.y}px`;
      cursorRef.current.style.display = 'block';
    }

    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const previewCanvas = previewCanvasRef.current;
    const previewCtx = previewCanvas?.getContext('2d');
    if (!canvas || !ctx || !lastPoint.current || !point) return;

    if (isShapeTool && startPoint.current && previewCtx && previewCanvas) {
      // Clear preview and draw shape preview
      previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      drawShape(previewCtx, tool, startPoint.current, point, color, brushSize);
    } else {
      // Freehand drawing
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
    }
    
    hasChanges.current = true;
  }, [isDrawing, color, brushSize, tool, getCanvasPoint, isShapeTool, drawShape]);

  const handleMouseLeave = useCallback(() => {
    if (cursorRef.current) {
      cursorRef.current.style.display = 'none';
    }
    
    if (isDrawing && hasChanges.current) {
      const canvas = canvasRef.current;
      if (canvas && onSave) {
        onSave(canvas.toDataURL('image/png'));
      }
      saveToHistory();
    }
    setIsDrawing(false);
    lastPoint.current = null;
    startPoint.current = null;
    
    // Clear preview
    const previewCanvas = previewCanvasRef.current;
    const previewCtx = previewCanvas?.getContext('2d');
    if (previewCanvas && previewCtx) {
      previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    }
  }, [isDrawing, onSave, saveToHistory]);

  const stopDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const previewCanvas = previewCanvasRef.current;
    const previewCtx = previewCanvas?.getContext('2d');
    
    // If it's a shape tool, finalize the shape on main canvas
    if (isShapeTool && startPoint.current && lastPoint.current && ctx && canvas) {
      const point = lastPoint.current;
      ctx.globalCompositeOperation = 'source-over';
      drawShape(ctx, tool, startPoint.current, point, color, brushSize);
    }
    
    // Clear preview canvas
    if (previewCanvas && previewCtx) {
      previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    }
    
    if (isDrawing && hasChanges.current) {
      if (canvas && onSave) {
        onSave(canvas.toDataURL('image/png'));
      }
      saveToHistory();
    }
    setIsDrawing(false);
    lastPoint.current = null;
    startPoint.current = null;
  }, [isDrawing, onSave, isShapeTool, tool, color, brushSize, drawShape, saveToHistory]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasChanges.current = true;
    saveToHistory();
    
    if (onSave) {
      onSave(canvas.toDataURL('image/png'));
    }
  }, [onSave, saveToHistory]);

  const downloadCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'drawing.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  const getCursorSize = () => {
    if (tool === 'eraser') return brushSize * 3;
    if (isShapeTool) return 16;
    return brushSize;
  };

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-card rounded-lg border border-border mb-2 flex-wrap">
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

        {/* Line Tool */}
        <Button
          variant={tool === 'line' ? 'default' : 'ghost'}
          size="icon"
          onClick={() => setTool('line')}
          title="Line"
        >
          <Minus className="h-4 w-4 rotate-[-45deg]" />
        </Button>

        {/* Shape Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant={COMMON_SHAPES.includes(tool) || UNCOMMON_SHAPES.includes(tool) ? 'default' : 'ghost'} 
              size="icon"
              title="Shapes"
            >
              {(COMMON_SHAPES.includes(tool) || UNCOMMON_SHAPES.includes(tool)) && tool !== 'line' 
                ? SHAPE_ICONS[tool] 
                : <Shapes className="h-4 w-4" />
              }
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-popover border border-border z-50">
            <DropdownMenuLabel>Common Shapes</DropdownMenuLabel>
            {COMMON_SHAPES.filter(s => s !== 'line').map((shape) => (
              <DropdownMenuItem key={shape} onClick={() => setTool(shape)} className="flex items-center gap-2 cursor-pointer">
                {SHAPE_ICONS[shape]}
                <span className="capitalize">{shape}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>More Shapes</DropdownMenuLabel>
            {UNCOMMON_SHAPES.map((shape) => (
              <DropdownMenuItem key={shape} onClick={() => setTool(shape)} className="flex items-center gap-2 cursor-pointer">
                {SHAPE_ICONS[shape]}
                <span className="capitalize">{shape}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

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
          <PopoverContent className="w-auto p-2 bg-popover border border-border z-50">
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

        {/* Undo/Redo */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={undo} 
          disabled={historyIndex <= 0}
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={redo} 
          disabled={historyIndex >= history.length - 1}
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>

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
        className="flex-1 relative rounded-xl border border-border overflow-hidden bg-transparent cursor-none"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-none touch-none"
          onMouseDown={startDrawing}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrawing}
          onMouseLeave={handleMouseLeave}
          onTouchStart={startDrawing}
          onTouchMove={handleMouseMove}
          onTouchEnd={stopDrawing}
        />
        
        {/* Preview canvas for shapes */}
        <canvas
          ref={previewCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
        
        {/* Custom Cursor - using ref for zero latency */}
        <div
          ref={cursorRef}
          className="absolute pointer-events-none z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ display: 'none' }}
        >
          {/* Outer ring */}
          <div
            className="absolute rounded-full border-2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: getCursorSize() + 8,
              height: getCursorSize() + 8,
              borderColor: tool === 'eraser' ? 'hsl(var(--destructive))' : color,
              opacity: 0.6,
            }}
          />
          {/* Inner dot */}
          <div
            className="absolute rounded-full -translate-x-1/2 -translate-y-1/2"
            style={{
              width: getCursorSize(),
              height: getCursorSize(),
              backgroundColor: tool === 'eraser' ? 'hsl(var(--destructive) / 0.3)' : (isShapeTool ? 'transparent' : color),
              border: isShapeTool ? `2px solid ${color}` : 'none',
            }}
          />
          {/* Crosshair */}
          <div className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <div className="w-4 h-[1px] bg-foreground/50" />
          </div>
          <div className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <div className="w-[1px] h-4 bg-foreground/50" />
          </div>
        </div>
      </div>
    </div>
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';

export default DrawingCanvas;
