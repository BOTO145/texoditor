import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const FONT_SIZES = ['12', '14', '16', '18', '20', '24', '28', '32'];
const FONT_FAMILIES = [
  { value: 'monospace', label: 'Mono' },
  { value: 'serif', label: 'Serif' },
  { value: 'sans-serif', label: 'Sans' },
  { value: 'Literata', label: 'Literata' },
  { value: 'Belleza', label: 'Belleza' },
];

const COLORS = [
  '#000000', '#374151', '#991b1b', '#c2410c', 
  '#a16207', '#166534', '#1d4ed8', '#7c3aed', 
  '#be185d', '#ffffff',
];

const HIGHLIGHT_COLORS = [
  'transparent', '#fef08a', '#bbf7d0', '#bfdbfe', 
  '#fecaca', '#e9d5ff', '#fed7aa',
];

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  sheetType: string;
  drawingMode?: boolean;
  drawingDataUrl?: string;
  showLineNumbers?: boolean;
  onLineCountChange?: (count: number) => void;
}

// Custom extension for font size
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: element => element.style.fontSize?.replace('px', ''),
        renderHTML: attributes => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}px` };
        },
      },
    };
  },
});

const MenuBar: React.FC<{ editor: Editor | null }> = ({ editor }) => {
  if (!editor) return null;

  const setFontSize = (size: string) => {
    editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-card rounded-lg border border-border mb-2">
      {/* Font Family */}
      <Select
        value={editor.getAttributes('textStyle').fontFamily || 'monospace'}
        onValueChange={(value) => editor.chain().focus().setFontFamily(value).run()}
      >
        <SelectTrigger className="w-24 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONT_FAMILIES.map((font) => (
            <SelectItem key={font.value} value={font.value}>
              <span style={{ fontFamily: font.value }}>{font.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Font Size */}
      <Select
        value={editor.getAttributes('textStyle').fontSize || '14'}
        onValueChange={setFontSize}
      >
        <SelectTrigger className="w-16 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONT_SIZES.map((size) => (
            <SelectItem key={size} value={size}>{size}px</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Bold */}
      <Button
        variant={editor.isActive('bold') ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>

      {/* Italic */}
      <Button
        variant={editor.isActive('italic') ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>

      {/* Underline */}
      <Button
        variant={editor.isActive('underline') ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline (Ctrl+U)"
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>

      {/* Strikethrough */}
      <Button
        variant={editor.isActive('strike') ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Highlight Color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Highlight">
            <Highlighter className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="grid grid-cols-4 gap-1">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => {
                  if (color === 'transparent') {
                    editor.chain().focus().unsetHighlight().run();
                  } else {
                    editor.chain().focus().toggleHighlight({ color }).run();
                  }
                }}
                className={cn(
                  'w-7 h-7 rounded border-2 hover:scale-110 transition-transform',
                  color === 'transparent' ? 'border-dashed border-muted-foreground' : 'border-border'
                )}
                style={{ backgroundColor: color === 'transparent' ? 'transparent' : color }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Text Color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Text Color">
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="grid grid-cols-5 gap-1">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => editor.chain().focus().setColor(color).run()}
                className={cn(
                  'w-7 h-7 rounded-full border-2 hover:scale-110 transition-transform',
                  'border-border'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  sheetType,
  drawingMode = false,
  drawingDataUrl,
  showLineNumbers = true,
  onLineCountChange,
}) => {
  const [lineCount, setLineCount] = useState(30);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
    ],
    content: content || '<p></p>',
    editable: !drawingMode,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      
      // Count lines
      const text = editor.getText();
      const lines = Math.max(text.split('\n').length, 30);
      setLineCount(lines);
      onLineCountChange?.(lines);
    },
  });

  // Sync content from external changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '<p></p>');
    }
  }, [content, editor]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!drawingMode);
    }
  }, [drawingMode, editor]);

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

  return (
    <div className="h-full flex flex-col gap-3">
      <MenuBar editor={editor} />

      <div className={cn(
        "flex-1 rounded-xl overflow-hidden border border-border relative",
        getSheetClass()
      )}>
        {/* Drawing Layer */}
        {drawingDataUrl && (
          <div className={cn(
            "absolute inset-0 pointer-events-none transition-opacity duration-300 z-10",
            drawingMode ? "opacity-100" : "opacity-30"
          )}>
            <img src={drawingDataUrl} alt="Drawing" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex h-full">
          {/* Line numbers - optional */}
          {showLineNumbers && sheetType !== 'clear' && (
            <div className="w-12 bg-secondary/30 border-r border-border py-4 select-none flex-shrink-0">
              {Array.from({ length: lineCount }, (_, i) => (
                <div
                  key={i}
                  className="text-xs text-muted-foreground text-right pr-3 font-mono"
                  style={{ height: '24px', lineHeight: '24px' }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          )}

          {/* Editor area */}
          <div className={cn(
            "flex-1 relative overflow-auto",
            drawingMode && "pointer-events-none opacity-50"
          )}>
            {/* Lines overlay for single-lined */}
            {sheetType === 'single-lined' && (
              <div className="absolute inset-0 pointer-events-none py-4">
                {Array.from({ length: lineCount }, (_, i) => (
                  <div key={i} className="border-b border-border/30" style={{ height: '24px' }} />
                ))}
              </div>
            )}

            <EditorContent 
              editor={editor} 
              className="prose prose-sm dark:prose-invert max-w-none p-4 min-h-full [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RichTextEditor;
