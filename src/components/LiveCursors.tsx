import React, { useEffect, useState, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
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
  'hsl(340, 75%, 55%)',
  'hsl(200, 80%, 50%)',
  'hsl(45, 90%, 50%)',
  'hsl(280, 70%, 55%)',
  'hsl(160, 65%, 45%)',
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

  // Subscribe to cursor updates
  useEffect(() => {
    if (!projectId || !userProfile) return;

    const cursorsDocRef = doc(db, 'cursors', projectId);
    
    const unsubscribe = onSnapshot(cursorsDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Record<string, CursorPosition>;
        // Filter out stale cursors (older than 10 seconds) and own cursor
        const now = Date.now();
        const activeCursors: Record<string, CursorPosition> = {};
        
        Object.entries(data).forEach(([key, cursor]) => {
          if (key !== userProfile.uid && now - cursor.lastUpdated < 10000) {
            activeCursors[key] = cursor;
          }
        });
        
        setCursors(activeCursors);
      }
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

  // Track mouse movement
  useEffect(() => {
    if (!containerRef.current || !userProfile || !cursorDocRef.current) return;

    const container = containerRef.current;
    let lastUpdate = 0;
    const THROTTLE_MS = 50;

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastUpdate < THROTTLE_MS) return;
      lastUpdate = now;

      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        setDoc(cursorDocRef.current!, {
          [userProfile.uid]: {
            x,
            y,
            username: userProfile.username,
            color: getCursorColor(userProfile.username),
            lastUpdated: now
          }
        }, { merge: true }).catch(console.error);
      }
    };

    const handleMouseLeave = () => {
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
    };
  }, [containerRef, userProfile]);

  return (
    <>
      {Object.entries(cursors).map(([id, cursor]) => (
        cursor && (
          <div
            key={id}
            className="absolute pointer-events-none z-50 transition-all duration-75 ease-out"
            style={{
              left: `${cursor.x}%`,
              top: `${cursor.y}%`,
            }}
          >
            {/* Cursor pointer */}
            <svg
              className="cursor-pointer"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{ filter: `drop-shadow(0 2px 4px ${cursor.color}40)` }}
            >
              <path
                d="M0 0L16 12L8 12L4 16L0 0Z"
                fill={cursor.color}
              />
              <path
                d="M0.5 1.5L14 11.5H8.5L4.5 15L0.5 1.5Z"
                stroke="white"
                strokeWidth="0.5"
                strokeOpacity="0.5"
              />
            </svg>
            {/* Username label */}
            <div
              className="cursor-label"
              style={{
                backgroundColor: cursor.color,
                color: 'white',
                boxShadow: `0 2px 8px ${cursor.color}50`,
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