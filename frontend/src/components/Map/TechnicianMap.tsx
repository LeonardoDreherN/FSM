'use client';
import { useEffect, useRef } from 'react';

interface TechnicianMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  heading?: number;
}

interface OSMarker {
  id: string;
  lat: number;
  lng: number;
  clientName: string;
  status: string;
  priority: string;
}

interface Props {
  technicians: TechnicianMarker[];
  serviceOrders: OSMarker[];
}

const STATUS_COLORS: Record<string, string> = {
  online:     '#22c55e',
  in_transit: '#3b82f6',
  busy:       '#f59e0b',
  break:      '#94a3b8',
  offline:    '#475569',
  delayed:    '#ef4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  low:       '#94a3b8',
  medium:    '#f59e0b',
  high:      '#f97316',
  emergency: '#ef4444',
};

export default function TechnicianMap({ technicians, serviceOrders }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const techMarkersRef = useRef<Map<string, any>>(new Map());
  const osMarkersRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (!containerRef.current) return;
    if ((containerRef.current as any)._leaflet_id) return;

    import('leaflet').then((L) => {
      if ((containerRef.current as any)._leaflet_id) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      mapRef.current = L.map(containerRef.current!, {
        center: [-15.77, -47.93], // centro do Brasil — será sobrescrito pelo geolocation
        zoom: 12,
        zoomControl: true,
      });

      // Centraliza na localização real do usuário
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 13);
          },
          () => {
            // Sem permissão: tenta IP geolocation gratuito
            fetch('https://ipapi.co/json/')
              .then(r => r.json())
              .then(d => {
                if (d.latitude && d.longitude) {
                  mapRef.current?.setView([d.latitude, d.longitude], 12);
                }
              })
              .catch(() => {});
          }
        );
      }

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync technician markers
  useEffect(() => {
    if (!mapRef.current) return;

    import('leaflet').then((L) => {
      technicians.forEach((tech) => {
        const color = STATUS_COLORS[tech.status] ?? '#475569';
        const svg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="3"/>
            <polygon points="16,6 20,22 16,18 12,22" fill="white" transform="rotate(${tech.heading ?? 0}, 16, 16)"/>
          </svg>`;

        const icon = L.divIcon({
          html: svg,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const existing = techMarkersRef.current.get(tech.id);
        if (existing) {
          existing.setLatLng([tech.lat, tech.lng]);
          existing.setIcon(icon);
        } else {
          const marker = L.marker([tech.lat, tech.lng], { icon })
            .bindPopup(`<strong>${tech.name}</strong><br/>${tech.status}`)
            .addTo(mapRef.current);
          techMarkersRef.current.set(tech.id, marker);
        }
      });
    });
  }, [technicians]);

  // Sync OS markers
  useEffect(() => {
    if (!mapRef.current) return;

    import('leaflet').then((L) => {
      serviceOrders.forEach((os) => {
        if (osMarkersRef.current.has(os.id) || !os.lat || !os.lng) return;

        const color = PRIORITY_COLORS[os.priority] ?? '#94a3b8';
        const svg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="7" fill="${color}" stroke="white" stroke-width="2" opacity="${os.status === 'completed' ? '0.3' : '1'}"/>
          </svg>`;

        const icon = L.divIcon({
          html: svg,
          className: '',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const marker = L.marker([os.lat, os.lng], { icon })
          .bindPopup(`<strong>${os.clientName}</strong><br/>${os.status} · ${os.priority}`)
          .addTo(mapRef.current);

        osMarkersRef.current.set(os.id, marker);
      });
    });
  }, [serviceOrders]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden" />
    </>
  );
}
