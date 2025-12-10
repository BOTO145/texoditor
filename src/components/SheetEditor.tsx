import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SheetType, TextFormat } from '@/contexts/ProjectContext';
import LiveCursors from './LiveCursors';
import TextFormatToolbar from './TextFormatToolbar';
import { cn } from '@/lib/utils';

interface FormattedSpan {
  start: number;
  end: number;
  format: TextFormat;
}

interface SheetEditorProps {
  content: string;
  onChange: (content: string) => void;
  sheetType: SheetType;
  projectId: string;
  textFormat?: TextFormat;
  onFormatChange?: (format: TextFormat) => void;
  drawingMode?: boolean;
  drawingDataUrl?: string;
}

const SheetEditor: React.FC<SheetEditorProps> = ({ 
  content, 
  onChange, 
  sheetType, 
  projectId,
  textFormat: savedFormat,
  onFormatChange,
  drawingMode = false,
  drawingDataUrl,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lineCount, setLineCount] = useState(1);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  
  // Current format for new text or toolbar display
  const [currentFormat, setCurrentFormat] = useState<TextFormat>(() => savedFormat || {
    fontSize: '14',
    fontFamily: 'mono',
    textColor: 'hsl(var(--foreground))',
    highlightColor: 'transparent',
    activeFormats: [],
  });

  // Sync with saved format on load
  useEffect(() => {
    if (savedFormat) {
      setCurrentFormat(savedFormat);
    }
  }, [savedFormat]);

  useEffect(() => {
    const lines = content.split('\n').length;
    setLineCount(Math.max(lines, 30));
  }, [content]);

  // Track selection changes
  const handleSelectionChange = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start !== end) {
      setSelection({ start, end });
    } else {
      setSelection(null);
    }
  }, []);

  const handleFormat = useCallback((formatType: string, value?: string) => {
    setCurrentFormat(prev => {
      const newFormat = { ...prev };
      
      switch (formatType) {
        case 'fontSize':
          newFormat.fontSize = value || '14';
          break;
        case 'fontFamily':
          newFormat.fontFamily = value || 'mono';
          break;
        case 'textColor':
          newFormat.textColor = value || 'hsl(var(--foreground))';
          break;
        case 'highlightColor':
          newFormat.highlightColor = value || 'transparent';
          break;
        case 'bold':
        case 'italic':
        case 'underline':
        case 'strikethrough':
        case 'doubleUnderline':
          const activeFormats = [...prev.activeFormats];
          const idx = activeFormats.indexOf(formatType);
          if (idx > -1) {
            activeFormats.splice(idx, 1);
          } else {
            activeFormats.push(formatType);
          }
          newFormat.activeFormats = activeFormats;
          break;
      }
      
      // Save format to project (this applies as the default format)
      onFormatChange?.(newFormat);
      
      return newFormat;
    });
  }, [onFormatChange]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          handleFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          handleFormat('italic');
          break;
        case 'u':
          e.preventDefault();
          handleFormat('underline');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleFormat]);

  const getTextStyles = () => {
    const styles: React.CSSProperties = {
      fontSize: `${currentFormat.fontSize}px`,
      color: currentFormat.textColor,
      backgroundColor: currentFormat.highlightColor,
    };

    if (currentFormat.activeFormats.includes('bold')) styles.fontWeight = 'bold';
    if (currentFormat.activeFormats.includes('italic')) styles.fontStyle = 'italic';
    if (currentFormat.activeFormats.includes('underline')) {
      styles.textDecoration = 'underline';
    }
    if (currentFormat.activeFormats.includes('strikethrough')) {
      styles.textDecoration = styles.textDecoration 
        ? `${styles.textDecoration} line-through` 
        : 'line-through';
    }
    if (currentFormat.activeFormats.includes('doubleUnderline')) {
      styles.textDecorationLine = 'underline';
      styles.textDecorationStyle = 'double';
    }

    return styles;
  };

  const getFontClass = () => {
    switch (currentFormat.fontFamily) {
      case 'serif': return 'font-serif';
      case 'sans': return 'font-sans';
      case 'literata': return 'font-body';
      default: return 'font-mono';
    }
  };

  const getSheetClass = () => {
    switch (sheetType) {
      case 'single-lined':
        return 'bg-card';
      case 'crosslined':
        return 'sheet-crossline';
      case 'clear':
        return 'bg-card';
      case 'dot-pattern':
        return 'sheet-dot-pattern';
      default:
        return 'bg-card';
    }
  };

  const activeFormatsSet = new Set(currentFormat.activeFormats);

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Format Toolbar */}
      <div className="bg-card rounded-lg border border-border p-2">
        <TextFormatToolbar
          onFormat={handleFormat}
          activeFormats={activeFormatsSet}
          fontSize={currentFormat.fontSize}
          fontFamily={currentFormat.fontFamily}
          textColor={currentFormat.textColor}
          highlightColor={currentFormat.highlightColor}
        />
      </div>

      {/* Editor Container */}
      <div 
        ref={containerRef}
        className={cn(
          "flex-1 rounded-xl overflow-hidden border border-border relative",
          getSheetClass()
        )}
      >
        {/* Drawing Layer - shown behind text when in write mode */}
        {drawingDataUrl && (
          <div 
            className={cn(
              "absolute inset-0 pointer-events-none transition-opacity duration-300",
              drawingMode ? "opacity-100" : "opacity-30"
            )}
          >
            <img 
              src={drawingDataUrl} 
              alt="Drawing" 
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Live Cursors */}
        <LiveCursors projectId={projectId} containerRef={containerRef} />

        <div className="flex h-full">
          {/* Line numbers - hidden for clear sheet */}
          {sheetType !== 'clear' && (
            <div className="w-12 bg-secondary/30 border-r border-border py-4 select-none flex-shrink-0">
              {Array.from({ length: lineCount }, (_, i) => (
                <div
                  key={i}
                  className="text-xs text-muted-foreground text-right pr-3 font-mono leading-6"
                  style={{ height: `${parseInt(currentFormat.fontSize) + 10}px` }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          )}

          {/* Editor area */}
          <div className="flex-1 relative overflow-auto">
            {/* Lines overlay for single-lined */}
            {sheetType === 'single-lined' && (
              <div className="absolute inset-0 pointer-events-none py-4">
                {Array.from({ length: lineCount }, (_, i) => (
                  <div 
                    key={i} 
                    className="border-b border-border/30" 
                    style={{ height: `${parseInt(currentFormat.fontSize) + 10}px` }}
                  />
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => onChange(e.target.value)}
              onSelect={handleSelectionChange}
              onKeyUp={handleSelectionChange}
              onClick={handleSelectionChange}
              disabled={drawingMode}
              className={cn(
                "w-full h-full min-h-full resize-none bg-transparent p-4 placeholder:text-muted-foreground focus:outline-none",
                getFontClass(),
                drawingMode && "pointer-events-none opacity-50"
              )}
              style={{
                ...getTextStyles(),
                lineHeight: `${parseInt(currentFormat.fontSize) + 10}px`,
              }}
              placeholder="Start typing your content here..."
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SheetEditor;