import React, { useState, useEffect, useRef } from 'react';
import { SheetType } from '@/contexts/ProjectContext';

interface SheetEditorProps {
  content: string;
  onChange: (content: string) => void;
  sheetType: SheetType;
}

const SheetEditor: React.FC<SheetEditorProps> = ({ content, onChange, sheetType }) => {
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
    <div className={`flex-1 rounded-xl overflow-hidden border border-border ${getSheetClass()}`}>
      <div className="flex h-full">
        {/* Line numbers */}
        <div className="w-12 bg-secondary/30 border-r border-border py-4 select-none">
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i}
              className="h-6 text-xs text-muted-foreground text-right pr-3 font-mono leading-6"
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
                <div key={i} className="h-6 border-b border-border/30" />
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-full resize-none bg-transparent p-4 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-6"
            placeholder="Start typing your content here..."
            style={{ minHeight: '100%' }}
          />
        </div>
      </div>
    </div>
  );
};

export default SheetEditor;
