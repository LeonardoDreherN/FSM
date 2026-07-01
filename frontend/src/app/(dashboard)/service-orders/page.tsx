'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Search, X, MapPin, Clock, AlertTriangle, CheckCircle2, XCircle, Filter } from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pendente',        color: 'var(--yellow)',  bg: 'var(--yellow-muted)' },
  routed:      { label: 'Roteirizado',     color: 'var(--blue)',    bg: 'var(--blue-muted)' },
  in_transit:  { label: 'Em Transito',    color: 'var(--blue)',    bg: 'var(--blue-muted)' },
  in_progress: { label: 'Em Atendimento', color: 'var(--purple)',  bg: 'rgba(139,92,246,0.12)' },
  completed:   { label: 'Concluido',      color: 'var(--green)',   bg: 'var(--green-muted)' },
  canceled:    { label: 'Cancelado',      color: 'var(--red)',     bg: 'var(--red-muted)' },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low:       { label: 'Baixa',      color: 'var(--text-muted)' },
  medium:    { label: 'Media',      color: 'var(--yellow)' },
  high:      { label: 'Alta',       color: 'var(--orange)' },
  emergency: { label: 'Emergencia', color: 'var(--red)' },
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

function Field({ label, value, onChange, placeholder, type = 'text', required = false }: any) {
  return (
    <div>
      <label className="label">{label}{required && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}</label>
      <input type={type} className="input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export default function ServiceOrdersPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
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
      closeModal();
    },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Erro ao criar OS'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/service-orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-orders'] }),
  });

  function closeModal() {
    setModal(false); setForm(defaultForm);
    setCep(''); setNumero(''); setCepStatus('idle'); setError('');
  }

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
      const geo = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`, { headers: { 'Accept-Language': 'pt-BR' } });
      const geoData = await geo.json();
      setForm(f => ({ ...f, lat: String(geoData[0]?.lat ?? ''), lng: String(geoData[0]?.lon ?? ''), address: base }));
      setCepStatus('found');
    } catch { setCepStatus('error'); }
  }

  function buildAddress() {
    if (!form.address) return '';
    if (!numero) return form.address;
    const parts = form.address.split(',');
    return `${parts[0].trim()}, ${numero}${parts.slice(1).join(',')}`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName || !form.clientPhone || !form.address || !form.lat || !form.lng || !form.timeWindowStart || !form.timeWindowEnd) {
      setError('Preencha todos os campos obrigatorios, incluindo o CEP');
      return;
    }
    create.mutate({
      ...form,
      address: buildAddress(),
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),
      estimatedDurationMinutes: parseInt(form.estimatedDurationMinutes),
      clientEmail: form.clientEmail || undefined,
      technicianId: form.technicianId || undefined,
    });
  }

  const filtered = useMemo(() => orders.filter((o: any) => {
    const matchStatus = filterStatus === 'all' || o.status === filterStatus;
    const matchSearch = !search || o.clientName?.toLowerCase().includes(search.toLowerCase()) || o.address?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  }), [orders, filterStatus, search]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ordens de Servico</h1>
          <p className="page-subtitle">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })} · {orders.length} OS hoje</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus size={16} /> Nova OS
        </button>
      </div>

      {/* Status pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <button onClick={() => setFilterStatus('all')} className={filterStatus === 'all' ? 'btn-primary' : 'btn-secondary'}
          style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600 }}>
          Todas ({orders.length})
        </button>
        {Object.entries(STATUS_MAP).map(([key, { label, color, bg }]) => {
          const cnt = orders.filter((o: any) => o.status === key).length;
          if (cnt === 0 && filterStatus !== key) return null;
          return (
            <button key={key} onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 99, cursor: 'pointer',
                background: filterStatus === key ? bg : 'var(--bg-hover)',
                border: '1px solid ' + (filterStatus === key ? color + '40' : 'var(--border-default)'),
                color: filterStatus === key ? color : 'var(--text-secondary)',
                transition: 'all .12s',
              }}>
              {label} {cnt > 0 && `(${cnt})`}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 14 }}>
        <div className="search-wrapper" style={{ maxWidth: 360 }}>
          <Search size={15} className="search-icon" />
          <input className="input" placeholder="Buscar por cliente ou endereco..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper animate-fadeUp stagger-2">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Cliente</th>
              <th>Endereco</th>
              <th>Tecnico</th>
              <th>Prioridade</th>
              <th>Status</th>
              <th>Janela</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [1,2,3,4].map(i => (
                <tr key={i}>{[1,2,3,4,5,6,7,8].map(j => <td key={j}><div className="skeleton" style={{ height: 14, width: j===1?30:j===2?140:90, borderRadius: 4 }} /></td>)}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <AlertTriangle size={36} color="var(--text-muted)" />
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Nenhuma OS encontrada</div>
                  <div style={{ fontSize: 12 }}>Crie uma nova ordem de servico para comecar</div>
                </div>
              </td></tr>
            ) : filtered.map((os: any, i: number) => {
              const st = STATUS_MAP[os.status] ?? STATUS_MAP.pending;
              const pr = PRIORITY_MAP[os.priority] ?? PRIORITY_MAP.medium;
              return (
                <tr key={os.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>#{os.sequenceOrder ?? i + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{os.clientName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{os.clientPhone}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, maxWidth: 200 }}>
                      <MapPin size={12} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{os.address}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {os.technician?.name
                      ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#fff',flexShrink:0 }}>
                            {os.technician.name[0].toUpperCase()}
                          </div>
                          <span style={{ color: 'var(--text-secondary)' }}>{os.technician.name}</span>
                        </div>
                      : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Nao atribuido</span>}
                  </td>
                  <td>
                    <span style={{ fontSize: 11, fontWeight: 700, color: pr.color }}>{pr.label}</span>
                  </td>
                  <td>
                    <span className="badge" style={{ background: st.bg, color: st.color, border: '1px solid ' + st.color + '30' }}>
                      <span className="badge-dot" style={{ background: st.color }} />
                      {st.label}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} color="var(--text-muted)" />
                      {new Date(os.timeWindowStart).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {' – '}
                      {new Date(os.timeWindowEnd).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td>
                    {os.status === 'pending' && (
                      <button className="btn-danger-ghost" style={{ fontSize: 11, padding: '5px 10px' }}
                        onClick={() => updateStatus.mutate({ id: os.id, status: 'canceled' })}>
                        <XCircle size={12} /> Cancelar
                      </button>
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
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal-content" style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>Nova Ordem de Servico</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Preencha os dados para criar uma demanda</p>
              </div>
              <button className="btn-ghost" onClick={closeModal} style={{ padding: 8 }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="section-title">Dados do Cliente</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Nome do Cliente" required value={form.clientName} onChange={(v: string) => setForm(f => ({ ...f, clientName: v }))} placeholder="Maria Silva" />
                <Field label="Telefone" required value={form.clientPhone} onChange={(v: string) => setForm(f => ({ ...f, clientPhone: v }))} placeholder="+55 48 99999-0000" />
              </div>
              <Field label="E-mail" value={form.clientEmail} onChange={(v: string) => setForm(f => ({ ...f, clientEmail: v }))} placeholder="cliente@email.com" />

              <div className="section-title" style={{ marginTop: 4 }}>Localizacao</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">CEP <span style={{ color: 'var(--red)' }}>*</span></label>
                  <input className="input" value={cep} onChange={e => handleCep(e.target.value)} placeholder="00000-000" maxLength={9}
                    style={{ borderColor: cepStatus === 'error' ? 'var(--red)' : cepStatus === 'found' ? 'var(--green)' : undefined }} />
                  {cepStatus === 'loading' && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Buscando...</div>}
                  {cepStatus === 'error' && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>CEP nao encontrado</div>}
                </div>
                <Field label="Numero / Complemento" value={numero} onChange={setNumero} placeholder="87, Apto 2" />
              </div>

              {cepStatus === 'found' && form.address && (
                <div className="alert-success">
                  <MapPin size={14} style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 1 }}>{buildAddress() || form.address}</div>
                    <div style={{ fontSize: 11, opacity: 0.8, fontFamily: 'monospace' }}>{parseFloat(form.lat).toFixed(5)}, {parseFloat(form.lng).toFixed(5)}</div>
                  </div>
                </div>
              )}

              <div className="section-title" style={{ marginTop: 4 }}>Agendamento</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Inicio" required value={form.timeWindowStart} onChange={(v: string) => setForm(f => ({ ...f, timeWindowStart: v }))} type="datetime-local" />
                <Field label="Fim" required value={form.timeWindowEnd} onChange={(v: string) => setForm(f => ({ ...f, timeWindowEnd: v }))} type="datetime-local" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Duracao Estimada</label>
                  <select className="input" value={form.estimatedDurationMinutes} onChange={e => setForm(f => ({ ...f, estimatedDurationMinutes: e.target.value }))}>
                    <option value="30">30 min</option>
                    <option value="60">1 hora</option>
                    <option value="90">1h 30min</option>
                    <option value="120">2 horas</option>
                    <option value="180">3 horas</option>
                    <option value="240">4 horas</option>
                  </select>
                </div>
                <div>
                  <label className="label">Prioridade</label>
                  <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="low">Baixa</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="emergency">Emergencia</option>
                  </select>
                </div>
              </div>

              <div className="section-title" style={{ marginTop: 4 }}>Atribuicao</div>
              <div>
                <label className="label">Tecnico Responsavel</label>
                <select className="input" value={form.technicianId} onChange={e => setForm(f => ({ ...f, technicianId: e.target.value }))}>
                  <option value="">Sem atribuicao (redespacho automatico)</option>
                  {technicians.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name} — {t.vehicleType}</option>
                  ))}
                </select>
              </div>
              <Field label="Tipo de Servico" value={form.serviceType} onChange={(v: string) => setForm(f => ({ ...f, serviceType: v }))} placeholder="Ex: Instalacao de fibra, Manutencao AC..." />
              <div>
                <label className="label">Observacoes</label>
                <textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Informacoes adicionais para o tecnico..." rows={3} style={{ resize: 'vertical' as any }} />
              </div>

              {error && <div className="alert-error"><AlertTriangle size={14} style={{ flexShrink: 0 }} />{error}</div>}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={create.isPending}>
                  {create.isPending ? 'Criando...' : <><Plus size={15} /> Criar Ordem de Servico</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
