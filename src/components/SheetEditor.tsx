import React, { useState, useEffect, useRef } from 'react';
import { SheetType } from '@/contexts/ProjectContext';
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

  useEffect(() => {
    const lines = content.split('\n').length;
    setLineCount(Math.max(lines, 30));
  }, [content]);

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
    <div className="h-full">
      {/* Editor Container */}
      <div 
        ref={containerRef}
        className={cn(
          "h-full rounded-xl overflow-hidden border border-border relative",
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
                className="text-xs text-muted-foreground text-right pr-3 font-mono h-6 leading-6"
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
                    className="border-b border-border/30 h-6" 
                  />
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-full min-h-full resize-none bg-transparent p-4 font-mono text-foreground placeholder:text-muted-foreground focus:outline-none text-sm leading-6"
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
