import React, { useEffect, useState, useRef, useMemo } from 'react';
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
  const [cursors, setCursors] = useState<Record<string, CursorPosition>>({});
  const cursorDocRef = useRef<ReturnType<typeof doc> | null>(null);
  const pendingUpdate = useRef<{ x: number; y: number } | null>(null);
  const sendIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to cursor updates with immediate rendering
  useEffect(() => {
    if (!projectId || !userProfile) return;

    const cursorsDocRef = doc(db, 'cursors', projectId);
    cursorDocRef.current = cursorsDocRef;
    
    const unsubscribe = onSnapshot(cursorsDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Record<string, CursorPosition>;
        const now = Date.now();
        
        const filtered: Record<string, CursorPosition> = {};
        Object.entries(data).forEach(([key, cursor]) => {
          if (cursor && key !== userProfile.uid && now - cursor.lastUpdated < 5000) {
            filtered[key] = cursor;
          }
        });
        
        setCursors(filtered);
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

  // Send batched cursor updates every 30ms for near-zero latency feel
  useEffect(() => {
    if (!userProfile) return;

    sendIntervalRef.current = setInterval(() => {
      if (pendingUpdate.current && cursorDocRef.current) {
        const { x, y } = pendingUpdate.current;
        setDoc(cursorDocRef.current, {
          [userProfile.uid]: {
            x,
            y,
            username: userProfile.username,
            color: getCursorColor(userProfile.username),
            lastUpdated: Date.now()
          }
        }, { merge: true }).catch(() => {});
        pendingUpdate.current = null;
      }
    }, 30);

    return () => {
      if (sendIntervalRef.current) {
        clearInterval(sendIntervalRef.current);
      }
    };
  }, [userProfile]);

  // Track mouse movement - update pending position immediately
  useEffect(() => {
    if (!containerRef.current || !userProfile) return;

    const container = containerRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        pendingUpdate.current = { x, y };
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
  }, [containerRef, userProfile]);

  const cursorElements = useMemo(() => (
    Object.entries(cursors).map(([id, cursor]) => (
      cursor && (
        <div
          key={id}
          className="absolute pointer-events-none z-50 will-change-transform"
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
