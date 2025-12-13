import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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

const LiveCursors: React.FC<LiveCursorsProps> = ({ projectId, containerRef }) => {
  const { userProfile } = useAuth();
  const [cursors, setCursors] = useState<Record<string, InterpolatedCursor>>({});
  const cursorDocRef = useRef<ReturnType<typeof doc> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastSendTime = useRef<number>(0);
  const pendingPosition = useRef<{ x: number; y: number } | null>(null);

  // Smooth interpolation animation loop - runs at 60fps
  useEffect(() => {
    const interpolate = () => {
      setCursors(prev => {
        const updated = { ...prev };
        let hasChanges = false;
        
        Object.entries(updated).forEach(([key, cursor]) => {
          const dx = cursor.targetX - cursor.x;
          const dy = cursor.targetY - cursor.y;
          
          // Fast interpolation - 40% per frame for snappy feel
          if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            updated[key] = {
              ...cursor,
              x: cursor.x + dx * 0.4,
              y: cursor.y + dy * 0.4,
            };
            hasChanges = true;
          }
        });
        
        return hasChanges ? updated : prev;
      });
      
      animationFrameRef.current = requestAnimationFrame(interpolate);
    };
    
    animationFrameRef.current = requestAnimationFrame(interpolate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Subscribe to cursor updates
  useEffect(() => {
    if (!projectId || !userProfile) return;

    const cursorsDocRef = doc(db, 'cursors', projectId);
    cursorDocRef.current = cursorsDocRef;
    
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
                // Update target position, keep current interpolated position
                updated[key] = {
                  ...cursor,
                  x: existing.x,
                  y: existing.y,
                  targetX: cursor.x,
                  targetY: cursor.y,
                };
              } else {
                // New cursor - start at target position
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

    return () => {
      unsubscribe();
      if (userProfile && cursorDocRef.current) {
        setDoc(cursorDocRef.current, {
          [userProfile.uid]: null
        }, { merge: true }).catch(() => {});
      }
    };
  }, [projectId, userProfile]);

  // Send cursor position - throttled to 16ms (60fps) for minimal latency
  const sendCursorPosition = useCallback((x: number, y: number) => {
    const now = Date.now();
    
    // Send immediately if enough time has passed (16ms = 60fps)
    if (now - lastSendTime.current >= 16 && cursorDocRef.current && userProfile) {
      lastSendTime.current = now;
      
      updateDoc(cursorDocRef.current, {
        [userProfile.uid]: {
          x,
          y,
          username: userProfile.username,
          color: getCursorColor(userProfile.username),
          lastUpdated: now
        }
      }).catch(() => {
        // If updateDoc fails, try setDoc with merge
        setDoc(cursorDocRef.current!, {
          [userProfile.uid]: {
            x,
            y,
            username: userProfile.username,
            color: getCursorColor(userProfile.username),
            lastUpdated: now
          }
        }, { merge: true }).catch(() => {});
      });
    }
  }, [userProfile]);

  // Track mouse movement
  useEffect(() => {
    if (!containerRef.current || !userProfile) return;

    const container = containerRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        sendCursorPosition(x, y);
      }
    };

    const handleMouseLeave = () => {
      if (cursorDocRef.current && userProfile) {
        setDoc(cursorDocRef.current, {
          [userProfile.uid]: null
        }, { merge: true }).catch(() => {});
      }
    };

    container.addEventListener('mousemove', handleMouseMove, { passive: true });
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [containerRef, userProfile, sendCursorPosition]);

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
            willChange: 'left, top',
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
            className="absolute left-4 top-4 px-2 py-1 rounded text-xs font-medium whitespace-nowrap font-sans"
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
