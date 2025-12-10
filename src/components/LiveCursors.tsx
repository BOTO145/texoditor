import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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

interface InterpolatedCursor extends CursorPosition {
  targetX: number;
  targetY: number;
}

interface LiveCursorsProps {
  projectId: string;
  containerRef: React.RefObject<HTMLElement>;
}

const CURSOR_COLORS = [
  '#E57373', '#64B5F6', '#81C784', '#FFD54F', '#BA68C8',
];

const getCursorColor = (username: string): string => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
};

// Smooth interpolation helper
const lerp = (start: number, end: number, factor: number) => {
  return start + (end - start) * factor;
};

const LiveCursors: React.FC<LiveCursorsProps> = ({ projectId, containerRef }) => {
  const { userProfile } = useAuth();
  const [cursors, setCursors] = useState<Record<string, InterpolatedCursor>>({});
  const cursorDocRef = useRef<ReturnType<typeof doc> | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastSendTime = useRef<number>(0);

  // Animation loop for smooth cursor movement
  useEffect(() => {
    const animate = () => {
      setCursors(prev => {
        const updated = { ...prev };
        let hasChanges = false;
        
        Object.keys(updated).forEach(key => {
          const cursor = updated[key];
          if (!cursor) return;
          
          const dx = cursor.targetX - cursor.x;
          const dy = cursor.targetY - cursor.y;
          
          if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            hasChanges = true;
            updated[key] = {
              ...cursor,
              x: lerp(cursor.x, cursor.targetX, 0.3),
              y: lerp(cursor.y, cursor.targetY, 0.3),
            };
          }
        });
        
        return hasChanges ? updated : prev;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Subscribe to cursor updates
  useEffect(() => {
    if (!projectId || !userProfile) return;

    const cursorsDocRef = doc(db, 'cursors', projectId);
    
    const unsubscribe = onSnapshot(cursorsDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Record<string, CursorPosition>;
        const now = Date.now();
        
        setCursors(prev => {
          const updated: Record<string, InterpolatedCursor> = {};
          
          Object.entries(data).forEach(([key, cursor]) => {
            if (cursor && key !== userProfile.uid && now - cursor.lastUpdated < 5000) {
              const existing = prev[key];
              if (existing) {
                // Update target position for interpolation
                updated[key] = {
                  ...cursor,
                  x: existing.x,
                  y: existing.y,
                  targetX: cursor.x,
                  targetY: cursor.y,
                };
              } else {
                // New cursor, start at target position
                updated[key] = {
                  ...cursor,
                  targetX: cursor.x,
                  targetY: cursor.y,
                };
              }
            }
          });
          
          return updated;
        });
      }
    }, (error) => {
      console.log('Cursor sync unavailable:', error.message);
    });

    cursorDocRef.current = cursorsDocRef;

    return () => {
      unsubscribe();
      if (userProfile && cursorDocRef.current) {
        setDoc(cursorDocRef.current, {
          [userProfile.uid]: null
        }, { merge: true }).catch(() => {});
      }
    };
  }, [projectId, userProfile]);

  // Track mouse movement - send updates every 50ms for low latency
  useEffect(() => {
    if (!containerRef.current || !userProfile || !cursorDocRef.current) return;

    const container = containerRef.current;
    const SEND_INTERVAL = 50; // Send updates every 50ms

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastSendTime.current < SEND_INTERVAL) return;
      
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        lastSendTime.current = now;
        
        setDoc(cursorDocRef.current!, {
          [userProfile.uid]: {
            x,
            y,
            username: userProfile.username,
            color: getCursorColor(userProfile.username),
            lastUpdated: now
          }
        }, { merge: true }).catch(() => {});
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

  const cursorElements = useMemo(() => (
    Object.entries(cursors).map(([id, cursor]) => (
      cursor && (
        <div
          key={id}
          className="absolute pointer-events-none z-50"
          style={{
            left: `${cursor.x}%`,
            top: `${cursor.y}%`,
            transform: 'translate(-2px, -2px)',
          }}
        >
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
    ))
  ), [cursors]);

  return <>{cursorElements}</>;
};

export default LiveCursors;
