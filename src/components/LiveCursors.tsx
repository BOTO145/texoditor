import React, { useEffect, useState, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface CursorPosition {
  x: number;
  y: number;
  username: string;
  color: string;
  lastUpdated: number;
}

interface LiveCursorsProps {
  projectId: string;
  containerRef: React.RefObject<HTMLElement>;
}

const CURSOR_COLORS = [
  '#E57373', // soft red
  '#64B5F6', // soft blue
  '#81C784', // soft green
  '#FFD54F', // soft yellow
  '#BA68C8', // soft purple
];

const getCursorColor = (username: string): string => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
};

const LiveCursors: React.FC<LiveCursorsProps> = ({ projectId, containerRef }) => {
  const { userProfile } = useAuth();
  const [cursors, setCursors] = useState<Record<string, CursorPosition>>({});
  const cursorDocRef = useRef<ReturnType<typeof doc> | null>(null);
  const pendingUpdate = useRef<CursorPosition | null>(null);
  const updateTimeout = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to cursor updates
  useEffect(() => {
    if (!projectId || !userProfile) return;

    const cursorsDocRef = doc(db, 'cursors', projectId);
    
    const unsubscribe = onSnapshot(cursorsDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Record<string, CursorPosition>;
        const now = Date.now();
        const activeCursors: Record<string, CursorPosition> = {};
        
        Object.entries(data).forEach(([key, cursor]) => {
          // Filter out own cursor and stale cursors (older than 5 seconds)
          if (cursor && key !== userProfile.uid && now - cursor.lastUpdated < 5000) {
            activeCursors[key] = cursor;
          }
        });
        
        setCursors(activeCursors);
      }
    }, (error) => {
      console.log('Cursor sync unavailable:', error.message);
    });

    cursorDocRef.current = cursorsDocRef;

    return () => {
      unsubscribe();
      // Clean up own cursor on unmount
      if (userProfile && cursorDocRef.current) {
        setDoc(cursorDocRef.current, {
          [userProfile.uid]: null
        }, { merge: true }).catch(() => {});
      }
    };
  }, [projectId, userProfile]);

  // Batch cursor updates for performance
  const flushCursorUpdate = useCallback(() => {
    if (pendingUpdate.current && cursorDocRef.current && userProfile) {
      setDoc(cursorDocRef.current, {
        [userProfile.uid]: pendingUpdate.current
      }, { merge: true }).catch(() => {});
      pendingUpdate.current = null;
    }
  }, [userProfile]);

  // Track mouse movement with optimized throttling
  useEffect(() => {
    if (!containerRef.current || !userProfile || !cursorDocRef.current) return;

    const container = containerRef.current;
    const THROTTLE_MS = 16; // ~60fps local, batched to Firebase

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        pendingUpdate.current = {
          x,
          y,
          username: userProfile.username,
          color: getCursorColor(userProfile.username),
          lastUpdated: now
        };

        // Clear existing timeout and set a new one
        if (updateTimeout.current) {
          clearTimeout(updateTimeout.current);
        }
        updateTimeout.current = setTimeout(flushCursorUpdate, THROTTLE_MS);
      }
    };

    const handleMouseLeave = () => {
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current);
      }
      if (cursorDocRef.current && userProfile) {
        setDoc(cursorDocRef.current, {
          [userProfile.uid]: null
        }, { merge: true }).catch(() => {});
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current);
      }
    };
  }, [containerRef, userProfile, flushCursorUpdate]);

  return (
    <>
      {Object.entries(cursors).map(([id, cursor]) => (
        cursor && (
          <div
            key={id}
            className="absolute pointer-events-none z-50"
            style={{
              left: `${cursor.x}%`,
              top: `${cursor.y}%`,
              transition: 'left 0.05s linear, top 0.05s linear',
            }}
          >
            {/* Cursor arrow */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              style={{ filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.3))` }}
            >
              <path
                d="M5 3L19 12L12 12L9 20L5 3Z"
                fill={cursor.color}
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>
            {/* Username label */}
            <div
              className="absolute left-4 top-4 px-2 py-1 rounded text-xs font-medium whitespace-nowrap"
              style={{
                backgroundColor: cursor.color,
                color: 'white',
              }}
            >
              {cursor.username}
            </div>
          </div>
        )
      ))}
    </>
  );
};

export default LiveCursors;