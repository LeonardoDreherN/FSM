'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  MapPin, Clock, Phone, Navigation, CheckCircle2,
  LogOut, Wifi, WifiOff, ChevronRight, AlertCircle,
  PlayCircle, Flag, Star, HardHat, RefreshCw,
} from 'lucide-react';

const STATUS_NEXT: Record<string, { action: string; next: string; color: string; icon: any }> = {
  pending:     { action: 'Sair para Atendimento', next: 'in_transit',  color: '#6366F1', icon: PlayCircle },
  in_transit:  { action: 'Cheguei no Local',      next: 'in_progress', color: '#3B82F6', icon: Flag },
  in_progress: { action: 'Concluir Atendimento',  next: 'completed',   color: '#10B981', icon: CheckCircle2 },
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pendente',        color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  in_transit:  { label: 'A Caminho',       color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  in_progress: { label: 'Em Atendimento',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  completed:   { label: 'Concluído',       color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  routed:      { label: 'Roteirizado',     color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low:       { label: 'Baixa',       color: 'var(--text-muted)' },
  medium:    { label: 'Média',       color: '#F59E0B' },
  high:      { label: 'Alta',        color: '#F97316' },
  emergency: { label: 'EMERGÊNCIA',  color: '#EF4444' },
};

export default function TechnicianDashboard() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tech, setTech] = useState<any>(null);
  const [gpsActive, setGpsActive] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);
  const socketRef = useRef<any>(null);
  const today = format(new Date(), 'yyyy-MM-dd');

  // Auth check + load tech
  useEffect(() => {
    const token = localStorage.getItem('fsm_tech_token');
    const techData = localStorage.getItem('fsm_tech');
    if (!token || !techData) { router.replace('/tecnico'); return; }
    try { setTech(JSON.parse(techData)); } catch { router.replace('/tecnico'); }
  }, []);

  // Set auth header for tech token
  useEffect(() => {
    const token = localStorage.getItem('fsm_tech_token');
    if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    return () => {
      const mgr = localStorage.getItem('fsm_token');
      if (mgr) api.defaults.headers.common['Authorization'] = `Bearer ${mgr}`;
    };
  }, []);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['my-orders', today],
    queryFn: () => api.get(`/service-orders/my?date=${today}`).then(r => r.data),
    enabled: !!tech,
    refetchInterval: 30000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/service-orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-orders'] }),
  });

  // GPS tracking via WebSocket
  const startGPS = useCallback(() => {
    if (!tech || !navigator.geolocation) return;

    import('socket.io-client').then(({ io }) => {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3000';
      socketRef.current = io(wsUrl, { transports: ['websocket'] });

      socketRef.current.on('connect', () => {
        socketRef.current.emit('technician:join', {
          technicianId: tech.id,
          companyId: tech.companyId,
        });
        setGpsActive(true);
      });

      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          socketRef.current?.emit('technician:location', {
            technicianId: tech.id,
            companyId: tech.companyId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            heading: pos.coords.heading ?? 0,
            speed: pos.coords.speed ?? 0,
          });
        },
        () => setGpsActive(false),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    });
  }, [tech]);

  const stopGPS = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    socketRef.current?.disconnect();
    socketRef.current = null;
    setGpsActive(false);
  }, []);

  useEffect(() => {
    if (tech) startGPS();
    return () => stopGPS();
  }, [tech]);

  function logout() {
    stopGPS();
    localStorage.removeItem('fsm_tech_token');
    localStorage.removeItem('fsm_tech');
    router.replace('/tecnico');
  }

  function openMaps(address: string, lat?: number, lng?: number) {
    const query = lat && lng ? `${lat},${lng}` : encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
  }

  if (!tech) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <RefreshCw size={24} color="var(--text-muted)" className="animate-spin" />
    </div>
  );

  const pending = orders.filter((o: any) => !['completed', 'canceled'].includes(o.status)).length;
  const done    = orders.filter((o: any) => o.status === 'completed').length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', maxWidth: 480, margin: '0 auto' }}>

      {/* Header */}
      <div style={{
        background: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '16px 20px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {tech.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {tech.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {format(new Date(), "EEE, dd 'de' MMM", { locale: ptBR })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* GPS toggle */}
            <button
              onClick={gpsActive ? stopGPS : startGPS}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 99, border: 'none', cursor: 'pointer',
                background: gpsActive ? 'var(--green-muted)' : 'var(--bg-hover)',
                color: gpsActive ? 'var(--green)' : 'var(--text-muted)',
                fontSize: 12, fontWeight: 600, transition: 'all .15s',
              }}
            >
              {gpsActive
                ? <><div className="live-dot" /> GPS Ativo</>
                : <><WifiOff size={13} /> GPS Off</>
              }
            </button>

            <button onClick={logout} className="btn-ghost" style={{ padding: 8 }} title="Sair">
              <LogOut size={16} color="var(--text-muted)" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 1, background: 'var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        {[
          { label: 'Total hoje', value: orders.length, color: 'var(--text-primary)' },
          { label: 'Pendentes',  value: pending,        color: '#F59E0B' },
          { label: 'Concluídas', value: done,            color: 'var(--green)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-elevated)', padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* OS List */}
      <div style={{ padding: '16px 16px 100px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Ordens de Serviço
          </span>
          <button onClick={() => refetch()} className="btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }}>
            <RefreshCw size={12} /> Atualizar
          </button>
        </div>

        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 14, marginBottom: 12 }} />
          ))
        ) : orders.length === 0 ? (
          <div className="empty-state" style={{ padding: '60px 24px' }}>
            <Star size={40} color="var(--text-muted)" />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)' }}>Nenhuma OS hoje</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Fique de olho, novas ordens aparecem aqui</div>
          </div>
        ) : orders.map((os: any, idx: number) => {
          const st = STATUS_LABELS[os.status] ?? STATUS_LABELS.pending;
          const pr = PRIORITY_LABELS[os.priority] ?? PRIORITY_LABELS.medium;
          const next = STATUS_NEXT[os.status];
          const isExpanded = expandedId === os.id;
          const isCompleted = os.status === 'completed';

          return (
            <div
              key={os.id}
              className={`animate-fadeUp stagger-${Math.min(idx + 1, 6)}`}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid ' + (isCompleted ? 'rgba(16,185,129,0.15)' : 'var(--border-default)'),
                borderRadius: 16,
                marginBottom: 12,
                overflow: 'hidden',
                opacity: isCompleted ? 0.7 : 1,
                transition: 'opacity .2s',
              }}
            >
              {/* Priority bar */}
              <div style={{ height: 3, background: pr.color, opacity: isCompleted ? 0.3 : 1 }} />

              {/* Card header — always visible */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : os.id)}
                style={{ padding: '16px 16px 12px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>#{idx + 1}</span>
                      <span className="badge" style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}30` }}>
                        <span className="badge-dot" style={{ background: st.color }} />
                        {st.label}
                      </span>
                      {os.priority === 'emergency' && (
                        <span className="badge" style={{ background: 'var(--red-muted)', color: 'var(--red)' }}>
                          <AlertCircle size={10} /> URGENTE
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, letterSpacing: '-0.2px' }}>
                      {os.clientName}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                      <MapPin size={12} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{os.address}</span>
                    </div>
                  </div>

                  <ChevronRight
                    size={18}
                    color="var(--text-muted)"
                    style={{ flexShrink: 0, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s', marginTop: 2 }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 11 }}>
                    <Clock size={11} />
                    {new Date(os.timeWindowStart).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {' — '}
                    {new Date(os.timeWindowEnd).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {os.estimatedDurationMinutes && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      ~{os.estimatedDurationMinutes} min
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-subtle)', marginTop: 4, paddingTop: 14 }}>
                  {os.clientPhone && (
                    <a
                      href={`tel:${os.clientPhone}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 14px', borderRadius: 10, marginBottom: 10,
                        background: 'var(--bg-hover)', textDecoration: 'none',
                        color: 'var(--text-primary)', fontSize: 14, fontWeight: 500,
                      }}
                    >
                      <Phone size={16} color="var(--green)" />
                      Ligar para {os.clientName}
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 4 }}>{os.clientPhone}</span>
                    </a>
                  )}

                  <button
                    onClick={() => openMaps(os.address, os.lat, os.lng)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '10px 14px', borderRadius: 10, marginBottom: 12, cursor: 'pointer',
                      background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                      color: '#60A5FA', fontSize: 14, fontWeight: 600,
                    }}
                  >
                    <Navigation size={16} /> Abrir Rota no Maps
                  </button>

                  {os.description && (
                    <div style={{
                      background: 'var(--bg-hover)', borderRadius: 10, padding: '12px 14px', marginBottom: 12,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
                        Observações
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{os.description}</div>
                    </div>
                  )}

                  {os.serviceType && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                      Serviço: <span style={{ color: 'var(--text-secondary)' }}>{os.serviceType}</span>
                    </div>
                  )}

                  {/* Action button */}
                  {next && (
                    <button
                      onClick={() => updateStatus.mutate({ id: os.id, status: next.next })}
                      disabled={updateStatus.isPending}
                      style={{
                        width: '100%', padding: '14px', border: 'none', borderRadius: 12,
                        background: `linear-gradient(135deg, ${next.color}, ${next.color}cc)`,
                        color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: `0 4px 20px ${next.color}40`,
                        transition: 'opacity .15s, transform .15s',
                        letterSpacing: '-0.1px',
                      }}
                    >
                      <next.icon size={18} />
                      {updateStatus.isPending ? 'Atualizando...' : next.action}
                    </button>
                  )}

                  {isCompleted && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '14px', borderRadius: 12,
                      background: 'var(--green-muted)', color: 'var(--green)',
                      fontSize: 15, fontWeight: 700,
                    }}>
                      <CheckCircle2 size={18} /> Atendimento Concluído
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom GPS bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        {gpsActive ? (
          <>
            <div className="live-dot" />
            <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
              Localização sendo transmitida ao gestor
            </span>
          </>
        ) : (
          <>
            <WifiOff size={13} color="var(--text-muted)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              GPS inativo — toque em "GPS Off" para ativar
            </span>
          </>
        )}
      </div>
    </div>
  );
}
