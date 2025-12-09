import React, { useRef, useState, useEffect, useCallback } from 'react';
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

interface DrawingCanvasProps {
  onClose: () => void;
  initialData?: string;
  onSave?: (dataUrl: string) => void;
}

const COLORS = [
  '#000000', '#374151', '#ef4444', '#f97316', 
  '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', 
  '#ec4899', '#ffffff',
];

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onClose, initialData, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const hasChanges = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load initial data if available
    if (initialData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = initialData;
    }
  }, [initialData]);

  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
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
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPoint.current = point;
    hasChanges.current = true;
  }, [isDrawing, color, brushSize, tool, getCanvasPoint]);

  const stopDrawing = useCallback(() => {
    if (isDrawing && hasChanges.current) {
      // Auto-save when stopping drawing
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

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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

  const handleClose = () => {
    // Save before closing
    const canvas = canvasRef.current;
    if (canvas && onSave && hasChanges.current) {
      onSave(canvas.toDataURL('image/png'));
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          {/* Pen Tool */}
          <Button
            variant={tool === 'pen' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setTool('pen')}
            title="Pen"
          >
            <Pencil className="h-4 w-4" />
          </Button>

          {/* Eraser Tool */}
          <Button
            variant={tool === 'eraser' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setTool('eraser')}
            title="Eraser"
          >
            <Eraser className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-2" />

          {/* Color Picker */}
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

          {/* Brush Size */}
          <div className="flex items-center gap-2 ml-2">
            <Minus className="h-3 w-3 text-muted-foreground" />
            <Slider
              value={[brushSize]}
              onValueChange={(v) => setBrushSize(v[0])}
              min={1}
              max={20}
              step={1}
              className="w-24"
            />
            <div className="w-5 h-5 flex items-center justify-center">
              <div 
                className="rounded-full bg-foreground"
                style={{ width: brushSize, height: brushSize }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Clear */}
          <Button variant="ghost" size="icon" onClick={clearCanvas} title="Clear Canvas">
            <Trash2 className="h-4 w-4" />
          </Button>

          {/* Download */}
          <Button variant="ghost" size="icon" onClick={downloadCanvas} title="Download">
            <Download className="h-4 w-4" />
          </Button>

          {/* Close */}
          <Button variant="outline" size="sm" onClick={handleClose}>
            Done
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="w-full h-full bg-white rounded-xl border border-border shadow-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair touch-none"
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
    </div>
  );
};

export default DrawingCanvas;