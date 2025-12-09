import React from 'react';
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
  Underline,
  Strikethrough,
  Highlighter,
  Palette,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TextFormatToolbarProps {
  onFormat: (format: string, value?: string) => void;
  activeFormats: Set<string>;
  fontSize: string;
  fontFamily: string;
  textColor: string;
  highlightColor: string;
}

const FONT_SIZES = ['10', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48'];
const FONT_FAMILIES = [
  { value: 'mono', label: 'Monospace' },
  { value: 'serif', label: 'Serif' },
  { value: 'sans', label: 'Sans-serif' },
  { value: 'literata', label: 'Literata' },
];

const COLORS = [
  '#000000', '#374151', '#6b7280', '#9ca3af',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
];

const HIGHLIGHT_COLORS = [
  'transparent', '#fef08a', '#bbf7d0', '#bfdbfe',
  '#ddd6fe', '#fbcfe8', '#fed7aa', '#fecaca',
];

const TextFormatToolbar: React.FC<TextFormatToolbarProps> = ({
  onFormat,
  activeFormats,
  fontSize,
  fontFamily,
  textColor,
  highlightColor,
}) => {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Font Family */}
      <Select value={fontFamily} onValueChange={(v) => onFormat('fontFamily', v)}>
        <SelectTrigger className="w-28 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONT_FAMILIES.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Font Size */}
      <Select value={fontSize} onValueChange={(v) => onFormat('fontSize', v)}>
        <SelectTrigger className="w-16 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONT_SIZES.map((size) => (
            <SelectItem key={size} value={size}>
              {size}px
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Bold */}
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8', activeFormats.has('bold') && 'bg-muted')}
        onClick={() => onFormat('bold')}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>

      {/* Italic */}
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8', activeFormats.has('italic') && 'bg-muted')}
        onClick={() => onFormat('italic')}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>

      {/* Underline */}
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8', activeFormats.has('underline') && 'bg-muted')}
        onClick={() => onFormat('underline')}
        title="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </Button>

      {/* Strikethrough */}
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8', activeFormats.has('strikethrough') && 'bg-muted')}
        onClick={() => onFormat('strikethrough')}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>

      {/* Double Underline */}
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8', activeFormats.has('doubleUnderline') && 'bg-muted')}
        onClick={() => onFormat('doubleUnderline')}
        title="Double Underline"
      >
        <div className="flex flex-col items-center">
          <div className="w-3 h-px bg-current" />
          <div className="w-3 h-px bg-current mt-0.5" />
        </div>
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Highlight Color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Highlight Color">
            <Highlighter 
              className="h-4 w-4" 
              style={{ color: highlightColor !== 'transparent' ? highlightColor : undefined }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="grid grid-cols-4 gap-1">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => onFormat('highlightColor', color)}
                className={cn(
                  'w-6 h-6 rounded border border-border hover:scale-110 transition-transform',
                  color === 'transparent' && 'bg-[repeating-linear-gradient(45deg,#ccc,#ccc_2px,#fff_2px,#fff_4px)]'
                )}
                style={{ backgroundColor: color !== 'transparent' ? color : undefined }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Text Color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Text Color">
            <div className="flex flex-col items-center">
              <Type className="h-3.5 w-3.5" />
              <div className="w-3.5 h-1 rounded-sm mt-0.5" style={{ backgroundColor: textColor }} />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="grid grid-cols-4 gap-1">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => onFormat('textColor', color)}
                className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TextFormatToolbar;
