import React, { useState, useEffect, useRef } from 'react';
import { SheetType } from '@/contexts/ProjectContext';
import TextFormatToolbar, { TextFormat } from './TextFormatToolbar';
import LiveCursors from './LiveCursors';
import { cn } from '@/lib/utils';

interface SheetEditorProps {
  content: string;
  onChange: (content: string) => void;
  sheetType: SheetType;
  projectId: string;
}

const SheetEditor: React.FC<SheetEditorProps> = ({ content, onChange, sheetType, projectId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lineCount, setLineCount] = useState(1);
  const [format, setFormat] = useState<TextFormat>({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    fontSize: '16',
    color: 'default',
  });

  useEffect(() => {
    const lines = content.split('\n').length;
    setLineCount(Math.max(lines, 30));
  }, [content]);

  const handleFormatChange = (updates: Partial<TextFormat>) => {
    setFormat(prev => ({ ...prev, ...updates }));
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && textareaRef.current === document.activeElement) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            handleFormatChange({ bold: !format.bold });
            break;
          case 'i':
            e.preventDefault();
            handleFormatChange({ italic: !format.italic });
            break;
          case 'u':
            e.preventDefault();
            handleFormatChange({ underline: !format.underline });
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [format]);

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

  const getTextStyle = (): React.CSSProperties => ({
    fontWeight: format.bold ? 'bold' : 'normal',
    fontStyle: format.italic ? 'italic' : 'normal',
    textDecoration: [
      format.underline ? 'underline' : '',
      format.strikethrough ? 'line-through' : ''
    ].filter(Boolean).join(' ') || 'none',
    fontSize: `${format.fontSize}px`,
    color: format.color === 'default' ? 'inherit' : format.color,
  });

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Formatting Toolbar */}
      <TextFormatToolbar format={format} onFormatChange={handleFormatChange} />

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
          <div className="w-12 bg-secondary/30 border-r border-border py-4 select-none">
            {Array.from({ length: lineCount }, (_, i) => (
              <div
                key={i}
                className="text-xs text-muted-foreground text-right pr-3 font-mono"
                style={{ height: `${parseInt(format.fontSize) * 1.5}px`, lineHeight: `${parseInt(format.fontSize) * 1.5}px` }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Editor area */}
          <div className="flex-1 relative">
            {/* Lines overlay for single-lined */}
            {sheetType === 'single-lined' && (
              <div className="absolute inset-0 pointer-events-none py-4">
                {Array.from({ length: lineCount }, (_, i) => (
                  <div 
                    key={i} 
                    className="border-b border-border/30" 
                    style={{ height: `${parseInt(format.fontSize) * 1.5}px` }}
                  />
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-full resize-none bg-transparent p-4 font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
              placeholder="Start typing your content here..."
              style={{ 
                minHeight: '100%',
                ...getTextStyle(),
                lineHeight: '1.5',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SheetEditor;