'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import dynamic from 'next/dynamic';
import { ClipboardList, Users, CheckCircle2, Clock, AlertTriangle, RefreshCw, Wifi } from 'lucide-react';

const TechnicianMap = dynamic(() => import('@/components/Map/TechnicianMap'), { ssr: false, loading: () => (
  <div style={{ height: '100%', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <RefreshCw size={20} color="var(--text-muted)" className="animate-spin" />
  </div>
) });

function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const diff = target - start;
    if (diff === 0) return;
    const t0 = performance.now();
    const frame = (t: number) => {
      const p = Math.min((t - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(start + diff * ease));
      if (p < 1) requestAnimationFrame(frame);
      else { prev.current = target; }
    };
    requestAnimationFrame(frame);
  }, [target, duration]);
  return val;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--yellow)', routed: 'var(--blue)', in_transit: 'var(--blue)',
  in_progress: 'var(--purple)', completed: 'var(--green)', canceled: 'var(--red)',
};
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente', routed: 'Roteirizado', in_transit: 'Em Trânsito',
  in_progress: 'Em Atendimento', completed: 'Concluído', canceled: 'Cancelado',
};
const TECH_STATUS: Record<string, { label: string; color: string; pulse: boolean }> = {
  online:     { label: 'Disponível',      color: 'var(--green)',  pulse: true },
  in_transit: { label: 'Em Trânsito',    color: 'var(--blue)',   pulse: true },
  busy:       { label: 'Ocupado',        color: 'var(--purple)', pulse: false },
  offline:    { label: 'Offline',        color: 'var(--text-muted)', pulse: false },
};

export default function DashboardPage() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: orders = [], refetch: refetchOrders } = useQuery({
    queryKey: ['orders-today'],
    queryFn: () => api.get(`/service-orders?date=${today}`).then(r => r.data),
    refetchInterval: 20000,
  });
  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians-dash'],
    queryFn: () => api.get('/technicians').then(r => r.data),
    refetchInterval: 15000,
  });

  const totalOS = useCountUp(orders.length);
  const pendingOS = useCountUp(orders.filter((o: any) => o.status === 'pending').length);
  const doneOS = useCountUp(orders.filter((o: any) => o.status === 'completed').length);
  const onlineTech = useCountUp(technicians.filter((t: any) => t.status !== 'offline').length);

  const stats = [
    { label: 'Total de OS', value: totalOS, icon: ClipboardList, color: 'var(--accent)', bg: 'var(--accent-muted)' },
    { label: 'Pendentes', value: pendingOS, icon: Clock, color: 'var(--yellow)', bg: 'var(--yellow-muted)' },
    { label: 'Concluídas', value: doneOS, icon: CheckCircle2, color: 'var(--green)', bg: 'var(--green-muted)' },
    { label: 'Técnicos Online', value: onlineTech, icon: Wifi, color: 'var(--blue)', bg: 'var(--blue-muted)' },
  ];

  const recentOrders = [...orders].slice(-6).reverse();

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div className="live-dot" />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: 1 }}>Ao Vivo</span>
          </div>
          <h1 className="page-title">Painel de Controle</h1>
          <p className="page-subtitle">{format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
        </div>
        <button onClick={() => refetchOrders()} className="btn-secondary" style={{ gap: 6 }}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {stats.map(({ label, value, icon: Icon, color, bg }, i) => (
          <div key={label} className={`stat-card animate-fadeUp stagger-${i + 1}`}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, minHeight: 540 }}>
        {/* Map */}
        <div className="glass animate-fadeUp stagger-3" style={{ overflow: 'hidden', minHeight: 480 }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="live-dot" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Mapa em Tempo Real</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{technicians.length} técnicos</span>
          </div>
          <div style={{ height: 'calc(100% - 50px)', minHeight: 430 }}>
            <TechnicianMap technicians={technicians} serviceOrders={orders} />
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Technicians */}
          <div className="glass animate-fadeUp stagger-4" style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Técnicos</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{technicians.filter((t: any) => t.status !== 'offline').length} ativos</span>
            </div>
            <div style={{ padding: 8, maxHeight: 220, overflowY: 'auto' }}>
              {technicians.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>
                  <Users size={28} color="var(--text-muted)" />
                  <span style={{ fontSize: 13 }}>Nenhum técnico</span>
                </div>
              ) : technicians.map((t: any) => {
                const s = TECH_STATUS[t.status] ?? TECH_STATUS.offline;
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, transition: 'background .1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#fff',
                    }}>{t.name?.[0]?.toUpperCase() ?? '?'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.vehicleType}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, animation: s.pulse ? 'pulse-dot 1.8s ease infinite' : 'none', flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: s.color, fontWeight: 600 }}>{s.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent OS */}
          <div className="glass animate-fadeUp stagger-5" style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>OS Recentes</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>hoje</span>
            </div>
            <div style={{ padding: 8, maxHeight: 220, overflowY: 'auto' }}>
              {recentOrders.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>
                  <ClipboardList size={28} color="var(--text-muted)" />
                  <span style={{ fontSize: 13 }}>Nenhuma OS hoje</span>
                </div>
              ) : recentOrders.map((os: any) => {
                const color = STATUS_COLORS[os.status] ?? 'var(--text-muted)';
                return (
                  <div key={os.id} style={{ padding: '8px 10px', borderRadius: 8, transition: 'background .1s', cursor: 'default' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{os.clientName}</span>
                      <span style={{ fontSize: 10, color, fontWeight: 600, flexShrink: 0 }}>{STATUS_LABELS[os.status] ?? os.status}</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{os.address}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
