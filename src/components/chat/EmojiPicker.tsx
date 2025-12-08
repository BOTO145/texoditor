import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  'Gestures': ['👍', '👎', '👌', '🤌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤲', '🤝', '🙏'],
  'Objects': ['🎉', '🎊', '🎁', '🎈', '✨', '🌟', '⭐', '💫', '🔥', '💥', '💯', '🎵', '🎶', '💬', '💭', '🗯️', '📝', '✏️', '📎', '📌'],
  'Nature': ['🌸', '🌺', '🌻', '🌼', '🌷', '🌹', '🪻', '🌿', '🍀', '🌈', '☀️', '🌙', '⭐', '🌊', '🔥', '❄️', '🌪️'],
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose }) => {
  return (
    <div className="bg-card p-3 max-h-64 overflow-y-auto animate-slide-in-bottom">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">Emoji</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="space-y-3">
        {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
          <div key={category}>
            <p className="text-xs text-muted-foreground mb-1">{category}</p>
            <div className="flex flex-wrap gap-1">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onSelect(emoji)}
                  className="p-1.5 hover:bg-muted rounded transition-colors text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;
