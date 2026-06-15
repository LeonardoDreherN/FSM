'use client';
import { useEffect, useRef, useState } from 'react';
import { connectAsManager } from '@/lib/socket';
import type { Socket } from 'socket.io-client';

interface LocationUpdate {
  technicianId: string;
  lat: number;
  lng: number;
  heading?: number;
  speedKmh?: number;
  ts: number;
}

export function useRealtimeLocation(companyId: string) {
  const [locations, setLocations] = useState<Map<string, LocationUpdate>>(new Map());
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!companyId) return;

    const socket = connectAsManager(companyId);
    socketRef.current = socket;

    socket.on('location:update', (update: LocationUpdate) => {
      setLocations((prev) => {
        const next = new Map(prev);
        next.set(update.technicianId, update);
        return next;
      });
    });

    return () => {
      socket.off('location:update');
    };
  }, [companyId]);

  return locations;
}
