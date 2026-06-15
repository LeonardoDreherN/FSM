'use client';
import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import TechnicianTable from '@/components/Dashboard/TechnicianTable';
import { useRealtimeLocation } from '@/hooks/useRealtimeLocation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TechnicianMap = dynamic(() => import('@/components/Map/TechnicianMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-surface-100 animate-pulse rounded-xl" />,
});

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const companyId = user?.company?.id ?? '';

  useEffect(() => {
    try {
      const stored = localStorage.getItem('fsm_user');
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }, []);
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => api.get('/technicians').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['service-orders', today],
    queryFn: () => api.get(`/service-orders?date=${today}`).then((r) => r.data),
    refetchInterval: 15_000,
  });

  const realtimeLocations = useRealtimeLocation(companyId);

  const techMarkersForMap = useMemo(() => {
    return technicians.map((t: any) => {
      const rt = realtimeLocations.get(t.id);
      return {
        id: t.id,
        name: t.name,
        lat: rt?.lat ?? 0,
        lng: rt?.lng ?? 0,
        status: t.status,
        heading: rt?.heading,
      };
    }).filter((t: any) => t.lat !== 0);
  }, [technicians, realtimeLocations]);

  const osMarkersForMap = useMemo(() => {
    return orders
      .filter((o: any) => o.coordinates)
      .map((o: any) => ({
        id: o.id,
        lat: o.lat ?? 0,
        lng: o.lng ?? 0,
        clientName: o.clientName,
        status: o.status,
        priority: o.priority,
      }));
  }, [orders]);

  const stats = useMemo(() => ({
    online: technicians.filter((t: any) => t.status !== 'offline').length,
    total: technicians.length,
    pending: orders.filter((o: any) => o.status === 'pending').length,
    completed: orders.filter((o: any) => o.status === 'completed').length,
    emergency: orders.filter((o: any) => o.priority === 'emergency' && o.status !== 'completed').length,
  }), [technicians, orders]);

  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-surface-200 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-white">FSM</span>
          <span className="text-slate-500 text-sm">•</span>
          <span className="text-slate-400 text-sm">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {stats.emergency > 0 && (
            <span className="badge bg-red-500/20 text-red-400 animate-pulse">
              {stats.emergency} emergência{stats.emergency > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-slate-400 text-sm">{user?.name}</span>
        </div>
      </header>

      {/* Stats bar */}
      <div className="flex gap-4 px-6 py-3 border-b border-surface-200 shrink-0">
        {[
          { label: 'Técnicos Online', value: `${stats.online}/${stats.total}`, color: 'text-green-400' },
          { label: 'OSs Pendentes',   value: stats.pending,  color: 'text-amber-400' },
          { label: 'Concluídas Hoje', value: stats.completed, color: 'text-blue-400' },
          { label: 'Total Hoje',      value: orders.length,   color: 'text-slate-300' },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</span>
            <span className="text-slate-500 text-xs">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden gap-4 p-4">
        {/* Map */}
        <div className="flex-1 min-h-0">
          <TechnicianMap technicians={techMarkersForMap} serviceOrders={osMarkersForMap} />
        </div>

        {/* Side panel */}
        <div className="w-80 shrink-0 flex flex-col gap-4 overflow-y-auto">
          <TechnicianTable technicians={technicians} />

          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">OSs de Hoje</h2>
              <span className="text-xs text-slate-500">{orders.length} total</span>
            </div>
            <div className="divide-y divide-surface-200/50 max-h-96 overflow-y-auto">
              {orders.slice(0, 30).map((o: any) => (
                <div key={o.id} className="px-4 py-3 hover:bg-surface-100/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-200 truncate">{o.clientName}</p>
                    <span className={`badge shrink-0 text-xs ${
                      o.priority === 'emergency' ? 'bg-red-500/20 text-red-400' :
                      o.priority === 'high'      ? 'bg-orange-500/20 text-orange-400' :
                      'bg-surface-200 text-slate-400'
                    }`}>{o.priority}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{o.address}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {o.technician?.name ?? 'Não atribuído'} · {o.status}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
