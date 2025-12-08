import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Search, Loader2 } from 'lucide-react';

// Using Giphy's public beta key for demo purposes
const GIPHY_API_KEY = 'dc6zaTOxFJmzC';

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
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20`;
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      setGifs(
        data.data.map((gif: any) => ({
          id: gif.id,
          url: gif.images.fixed_height.url,
          preview: gif.images.fixed_height_small.url,
        }))
      );
    } catch (error) {
      console.error('Error fetching GIFs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGifs('');
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (search) {
        fetchGifs(search);
      }
    }, 500);
    return () => clearTimeout(debounce);
  }, [search]);

  return (
    <div className="bg-card p-3 max-h-72 overflow-hidden flex flex-col animate-slide-in-bottom">
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
        Powered by GIPHY
      </p>
    </div>
  );
};

export default GifPicker;
