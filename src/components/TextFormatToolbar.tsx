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
  Palette,
  Type
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TextFormat {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  fontSize: string;
  color: string;
}

interface TextFormatToolbarProps {
  format: TextFormat;
  onFormatChange: (format: Partial<TextFormat>) => void;
}

const FONT_SIZES = ['12', '14', '16', '18', '20', '24', '28', '32'];

const COLORS = [
  { name: 'Default', value: 'default' },
  { name: 'Brown', value: '#3C2A21' },
  { name: 'Tan', value: '#D5CEA3' },
  { name: 'Cream', value: '#E5E5CB' },
  { name: 'Red', value: '#DC2626' },
  { name: 'Orange', value: '#EA580C' },
  { name: 'Yellow', value: '#CA8A04' },
  { name: 'Green', value: '#16A34A' },
  { name: 'Blue', value: '#2563EB' },
  { name: 'Purple', value: '#9333EA' },
];

const TextFormatToolbar: React.FC<TextFormatToolbarProps> = ({ format, onFormatChange }) => {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50 border border-border/50">
      {/* Bold */}
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-7 w-7", format.bold && "bg-primary/20 text-primary")}
        onClick={() => onFormatChange({ bold: !format.bold })}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-3.5 w-3.5" />
      </Button>

      {/* Italic */}
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-7 w-7", format.italic && "bg-primary/20 text-primary")}
        onClick={() => onFormatChange({ italic: !format.italic })}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>

      {/* Underline */}
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-7 w-7", format.underline && "bg-primary/20 text-primary")}
        onClick={() => onFormatChange({ underline: !format.underline })}
        title="Underline (Ctrl+U)"
      >
        <Underline className="h-3.5 w-3.5" />
      </Button>

      {/* Strikethrough */}
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-7 w-7", format.strikethrough && "bg-primary/20 text-primary")}
        onClick={() => onFormatChange({ strikethrough: !format.strikethrough })}
        title="Strikethrough"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Font Size */}
      <Select value={format.fontSize} onValueChange={(value) => onFormatChange({ fontSize: value })}>
        <SelectTrigger className="h-7 w-16 text-xs border-none bg-transparent hover:bg-secondary">
          <Type className="h-3 w-3 mr-1" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="glass">
          {FONT_SIZES.map((size) => (
            <SelectItem key={size} value={size} className="text-xs">
              {size}px
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Color Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Text Color"
          >
            <Palette className="h-3.5 w-3.5" />
            {format.color !== 'default' && (
              <div 
                className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full"
                style={{ backgroundColor: format.color }}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="glass w-auto p-2" align="start">
          <div className="grid grid-cols-5 gap-1">
            {COLORS.map((color) => (
              <button
                key={color.value}
                className={cn(
                  "w-6 h-6 rounded-md border border-border/50 transition-all hover:scale-110",
                  format.color === color.value && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                )}
                style={{ 
                  backgroundColor: color.value === 'default' ? 'hsl(var(--foreground))' : color.value 
                }}
                onClick={() => onFormatChange({ color: color.value })}
                title={color.name}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TextFormatToolbar;