import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Search, Loader2 } from 'lucide-react';

// Tenor API (free, no key required for basic usage with anonymous ID)
const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Google's public Tenor API key

interface Gif {
  id: string;
  url: string;
  preview: string;
}

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

const GifPicker: React.FC<GifPickerProps> = ({ onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGifs = async (query: string) => {
    setLoading(true);
    try {
      const endpoint = query
        ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=20&media_filter=gif`
        : `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=20&media_filter=gif`;
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.results) {
        setGifs(
          data.results.map((gif: any) => ({
            id: gif.id,
            url: gif.media_formats?.gif?.url || gif.media_formats?.mediumgif?.url,
            preview: gif.media_formats?.tinygif?.url || gif.media_formats?.nanogif?.url,
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching GIFs:', error);
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGifs('');
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchGifs(search);
    }, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  return (
    <div className="bg-card p-3 max-h-72 overflow-hidden flex flex-col animate-slide-in-bottom rounded-lg border border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">GIFs</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search GIFs..."
          className="pl-8 h-8 text-sm"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            No GIFs found
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => onSelect(gif.url)}
                className="aspect-square overflow-hidden rounded hover:ring-2 ring-primary transition-all"
              >
                <img
                  src={gif.preview}
                  alt="GIF"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>
      
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        Powered by Tenor
      </p>
    </div>
  );
};

export default GifPicker;