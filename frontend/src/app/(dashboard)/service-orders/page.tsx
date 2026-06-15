'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Pendente',        color: '#f59e0b' },
  routed:      { label: 'Roteirizado',     color: '#3b82f6' },
  in_transit:  { label: 'Em Trânsito',    color: '#60a5fa' },
  in_progress: { label: 'Em Atendimento', color: '#a78bfa' },
  completed:   { label: 'Concluído',      color: '#22c55e' },
  canceled:    { label: 'Cancelado',      color: '#ef4444' },
};

const PRIORITY_LABEL: Record<string, { label: string; color: string }> = {
  low:       { label: 'Baixa',     color: '#94a3b8' },
  medium:    { label: 'Média',     color: '#f59e0b' },
  high:      { label: 'Alta',      color: '#f97316' },
  emergency: { label: 'Emergência', color: '#ef4444' },
};

const defaultForm = {
  clientName: '', clientPhone: '', clientEmail: '',
  address: '', lat: '', lng: '',
  priority: 'medium', serviceType: '', description: '',
  estimatedDurationMinutes: '60',
  timeWindowStart: '', timeWindowEnd: '',
  technicianId: '',
};

function maskCep(v: string) {
  return v.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);
}

export default function ServiceOrdersPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [cep, setCep] = useState('');
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'found' | 'error'>('idle');
  const [numero, setNumero] = useState('');
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['service-orders', today],
    queryFn: () => api.get(`/service-orders?date=${today}`).then(r => r.data),
    refetchInterval: 15000,
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => api.get('/technicians').then(r => r.data),
  });

  const create = useMutation({
    mutationFn: (data: any) => api.post('/service-orders', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-orders'] });
      setModal(false);
      setForm(defaultForm);
      setCep('');
      setNumero('');
      setCepStatus('idle');
      setError('');
    },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Erro ao criar OS'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/service-orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-orders'] }),
  });

  async function handleCep(raw: string) {
    const masked = maskCep(raw);
    setCep(masked);
    const digits = masked.replace(/\D/g, '');
    if (digits.length < 8) { setCepStatus('idle'); return; }
    setCepStatus('loading');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) { setCepStatus('error'); return; }
      const base = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
      const query = `${data.bairro}, ${data.localidade}, ${data.uf}, Brasil`;
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      const geoData = await geo.json();
      const lat = geoData[0]?.lat ?? '';
      const lng = geoData[0]?.lon ?? '';
      setForm(f => ({ ...f, lat: String(lat), lng: String(lng), address: base }));
      setCepStatus('found');
    } catch {
      setCepStatus('error');
    }
  }

  function buildAddress() {
    if (!form.address) return '';
    if (!numero) return form.address;
    const parts = form.address.split(',');
    parts[0] = parts[0].trim();
    return `${parts[0]}, ${numero}${parts.slice(1).join(',')}`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName || !form.clientPhone || !form.address || !form.lat || !form.lng || !form.timeWindowStart || !form.timeWindowEnd) {
      setError('Preencha todos os campos obrigatórios (incluindo endereço via CEP)');
      return;
    }
    create.mutate({
      ...form,
      address: buildAddress(),
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),
      estimatedDurationMinutes: parseInt(form.estimatedDurationMinutes),
      technicianId: form.technicianId || undefined,
    });
  }

  const filtered = filterStatus === 'all' ? orders : orders.filter((o: any) => o.status === filterStatus);

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Ordens de Serviço</h1>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: '4px 0 0' }}>
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <button onClick={() => setModal(true)} style={{
          background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          + Nova OS
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_LABEL).map(([key, s]) => {
          const count = orders.filter((o: any) => o.status === key).length;
          return (
            <div key={key} onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
              style={{
                background: filterStatus === key ? s.color + '20' : '#1e293b',
                border: `1px solid ${filterStatus === key ? s.color : '#334155'}`,
                borderRadius: 12, padding: '12px 20px', cursor: 'pointer', minWidth: 100,
              }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{count}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              {['#', 'Cliente', 'Endereço', 'Técnico', 'Prioridade', 'Status', 'Horário', 'Ações'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '12px 16px', fontSize: 11,
                  fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#475569' }}>Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 48, textAlign: 'center', color: '#475569', fontSize: 15 }}>
                Nenhuma OS para hoje. Clique em "Nova OS" para criar.
              </td></tr>
            ) : filtered.map((os: any, i: number) => {
              const st = STATUS_LABEL[os.status] ?? STATUS_LABEL.pending;
              const pr = PRIORITY_LABEL[os.priority] ?? PRIORITY_LABEL.medium;
              return (
                <tr key={os.id} style={{ borderBottom: '1px solid #0f172a' }}>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>
                    {os.sequenceOrder ?? i + 1}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>{os.clientName}</div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>{os.clientPhone}</div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13, maxWidth: 200 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{os.address}</div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13 }}>
                    {os.technician?.name ?? <span style={{ color: '#ef4444' }}>Não atribuído</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: pr.color + '20', color: pr.color,
                      padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    }}>{pr.label}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: st.color + '20', color: st.color,
                      padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    }}>{st.label}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12 }}>
                    {new Date(os.timeWindowStart).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {' – '}
                    {new Date(os.timeWindowEnd).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {os.status === 'pending' && (
                      <button
                        onClick={() => updateStatus.mutate({ id: os.id, status: 'canceled' })}
                        style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                      >Cancelar</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16,
        }}>
          <div style={{
            background: '#1e293b', border: '1px solid #334155', borderRadius: 16,
            padding: 32, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Nova Ordem de Serviço</h2>
              <button onClick={() => { setModal(false); setError(''); setCep(''); setNumero(''); setCepStatus('idle'); }} style={{
                background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer',
              }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SectionTitle>Cliente</SectionTitle>
              <Row2>
                <Field label="Nome do Cliente *" value={form.clientName} onChange={v => setForm(f => ({ ...f, clientName: v }))} placeholder="Maria Silva" />
                <Field label="Telefone *" value={form.clientPhone} onChange={v => setForm(f => ({ ...f, clientPhone: v }))} placeholder="+55 48 99999-0000" />
              </Row2>
              <Field label="E-mail" value={form.clientEmail} onChange={v => setForm(f => ({ ...f, clientEmail: v }))} placeholder="cliente@email.com" />

              <SectionTitle>Localização</SectionTitle>

              <Row2>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#cbd5e1', marginBottom: 6 }}>CEP *</label>
                  <input
                    value={cep}
                    onChange={e => handleCep(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                    style={{ width: '100%', background: '#334155', border: `1px solid ${cepStatus === 'error' ? '#ef4444' : cepStatus === 'found' ? '#22c55e' : '#475569'}`, borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' as any }}
                  />
                  {cepStatus === 'loading' && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Buscando CEP...</div>}
                  {cepStatus === 'error' && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>CEP não encontrado</div>}
                </div>
                <Field label="Número / Complemento" value={numero} onChange={setNumero} placeholder="87, Apto 2" />
              </Row2>

              {cepStatus === 'found' && form.address && (
                <div style={{
                  background: '#0f2a1a', border: '1px solid #16a34a40', borderRadius: 8,
                  padding: '10px 14px',
                }}>
                  <div style={{ fontSize: 13, color: '#4ade80', fontWeight: 600, marginBottom: 2 }}>✓ Endereço encontrado</div>
                  <div style={{ fontSize: 12, color: '#86efac' }}>{buildAddress() || form.address}</div>
                  <div style={{ fontSize: 11, color: '#4ade8080', marginTop: 2, fontFamily: 'monospace' }}>
                    {parseFloat(form.lat).toFixed(5)}, {parseFloat(form.lng).toFixed(5)}
                  </div>
                </div>
              )}

              <SectionTitle>Agendamento</SectionTitle>
              <Row2>
                <Field label="Início da janela *" value={form.timeWindowStart} onChange={v => setForm(f => ({ ...f, timeWindowStart: v }))} type="datetime-local" />
                <Field label="Fim da janela *" value={form.timeWindowEnd} onChange={v => setForm(f => ({ ...f, timeWindowEnd: v }))} type="datetime-local" />
              </Row2>
              <Row2>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#cbd5e1', marginBottom: 6 }}>Duração Estimada</label>
                  <select value={form.estimatedDurationMinutes} onChange={e => setForm(f => ({ ...f, estimatedDurationMinutes: e.target.value }))} style={selectStyle}>
                    <option value="30">30 min</option>
                    <option value="60">1 hora</option>
                    <option value="90">1h 30min</option>
                    <option value="120">2 horas</option>
                    <option value="180">3 horas</option>
                    <option value="240">4 horas</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#cbd5e1', marginBottom: 6 }}>Prioridade</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={selectStyle}>
                    <option value="low">🔵 Baixa</option>
                    <option value="medium">🟡 Média</option>
                    <option value="high">🟠 Alta</option>
                    <option value="emergency">🔴 Emergência</option>
                  </select>
                </div>
              </Row2>

              <SectionTitle>Atribuição</SectionTitle>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#cbd5e1', marginBottom: 6 }}>Técnico Responsável</label>
                <select value={form.technicianId} onChange={e => setForm(f => ({ ...f, technicianId: e.target.value }))} style={selectStyle}>
                  <option value="">Sem atribuição (redespacho automático)</option>
                  {technicians.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name} — {t.vehicleType}</option>
                  ))}
                </select>
              </div>
              <Field label="Tipo de Serviço" value={form.serviceType} onChange={v => setForm(f => ({ ...f, serviceType: v }))} placeholder="Ex: Instalação de fibra, Manutenção AC..." />
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#cbd5e1', marginBottom: 6 }}>Observações</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Informações adicionais para o técnico..."
                  rows={3}
                  style={{ ...selectStyle, resize: 'vertical' as any }}
                />
              </div>

              {error && <div style={{ background: '#ef444420', border: '1px solid #ef444440', color: '#f87171', padding: '10px 12px', borderRadius: 8, fontSize: 13 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => { setModal(false); setError(''); setCep(''); setNumero(''); setCepStatus('idle'); }} style={{
                  flex: 1, padding: '12px', background: '#334155', border: 'none',
                  borderRadius: 8, color: '#94a3b8', fontSize: 14, cursor: 'pointer',
                }}>Cancelar</button>
                <button type="submit" disabled={create.isPending} style={{
                  flex: 2, padding: '12px', background: '#2563eb', border: 'none',
                  borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>{create.isPending ? 'Criando...' : 'Criar Ordem de Serviço'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const selectStyle = {
  width: '100%', background: '#334155', border: '1px solid #475569',
  borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' as any,
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' as any, letterSpacing: 1, marginTop: 4 }}>{children}</div>;
}

function Row2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>;
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#cbd5e1', marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', background: '#334155', border: '1px solid #475569', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' as any }}
      />
    </div>
  );
}
