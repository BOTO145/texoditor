import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SheetType } from '@/contexts/ProjectContext';
import LiveCursors from './LiveCursors';
import TextFormatToolbar from './TextFormatToolbar';
import { cn } from '@/lib/utils';

interface SheetEditorProps {
  content: string;
  onChange: (content: string) => void;
  sheetType: SheetType;
  projectId: string;
}

interface TextFormat {
  fontSize: string;
  fontFamily: string;
  textColor: string;
  highlightColor: string;
  activeFormats: Set<string>;
}

const SheetEditor: React.FC<SheetEditorProps> = ({ content, onChange, sheetType, projectId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lineCount, setLineCount] = useState(1);
  const [format, setFormat] = useState<TextFormat>({
    fontSize: '14',
    fontFamily: 'mono',
    textColor: '#000000',
    highlightColor: 'transparent',
    activeFormats: new Set(),
  });

  useEffect(() => {
    const lines = content.split('\n').length;
    setLineCount(Math.max(lines, 30));
  }, [content]);

  const handleFormat = useCallback((formatType: string, value?: string) => {
    setFormat(prev => {
      const newFormat = { ...prev };
      
      switch (formatType) {
        case 'fontSize':
          newFormat.fontSize = value || '14';
          break;
        case 'fontFamily':
          newFormat.fontFamily = value || 'mono';
          break;
        case 'textColor':
          newFormat.textColor = value || '#000000';
          break;
        case 'highlightColor':
          newFormat.highlightColor = value || 'transparent';
          break;
        case 'bold':
        case 'italic':
        case 'underline':
        case 'strikethrough':
        case 'doubleUnderline':
          const newFormats = new Set(prev.activeFormats);
          if (newFormats.has(formatType)) {
            newFormats.delete(formatType);
          } else {
            newFormats.add(formatType);
          }
          newFormat.activeFormats = newFormats;
          break;
      }
      
      return newFormat;
    });
  }, []);

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
      fontSize: `${format.fontSize}px`,
      color: format.textColor,
      backgroundColor: format.highlightColor,
    };

    if (format.activeFormats.has('bold')) styles.fontWeight = 'bold';
    if (format.activeFormats.has('italic')) styles.fontStyle = 'italic';
    if (format.activeFormats.has('underline')) {
      styles.textDecoration = 'underline';
    }
    if (format.activeFormats.has('strikethrough')) {
      styles.textDecoration = styles.textDecoration 
        ? `${styles.textDecoration} line-through` 
        : 'line-through';
    }
    if (format.activeFormats.has('doubleUnderline')) {
      styles.textDecorationLine = 'underline';
      styles.textDecorationStyle = 'double';
    }

    return styles;
  };

  const getFontClass = () => {
    switch (format.fontFamily) {
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
      case 'custom-cells':
        return 'sheet-grid';
      default:
        return 'bg-card';
    }
  };

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Format Toolbar */}
      <div className="bg-card rounded-lg border border-border p-2">
        <TextFormatToolbar
          onFormat={handleFormat}
          activeFormats={format.activeFormats}
          fontSize={format.fontSize}
          fontFamily={format.fontFamily}
          textColor={format.textColor}
          highlightColor={format.highlightColor}
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
        {/* Live Cursors */}
        <LiveCursors projectId={projectId} containerRef={containerRef} />

        <div className="flex h-full">
          {/* Line numbers */}
          <div className="w-12 bg-secondary/30 border-r border-border py-4 select-none flex-shrink-0">
            {Array.from({ length: lineCount }, (_, i) => (
              <div
                key={i}
                className="text-xs text-muted-foreground text-right pr-3 font-mono leading-6"
                style={{ height: `${parseInt(format.fontSize) + 10}px` }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Editor area */}
          <div className="flex-1 relative overflow-auto">
            {/* Lines overlay for single-lined */}
            {sheetType === 'single-lined' && (
              <div className="absolute inset-0 pointer-events-none py-4">
                {Array.from({ length: lineCount }, (_, i) => (
                  <div 
                    key={i} 
                    className="border-b border-border/30" 
                    style={{ height: `${parseInt(format.fontSize) + 10}px` }}
                  />
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => onChange(e.target.value)}
              className={cn(
                "w-full h-full min-h-full resize-none bg-transparent p-4 placeholder:text-muted-foreground focus:outline-none",
                getFontClass()
              )}
              style={{
                ...getTextStyles(),
                lineHeight: `${parseInt(format.fontSize) + 10}px`,
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
