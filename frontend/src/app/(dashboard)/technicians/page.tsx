'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Users, Plus, Search, Bike, Car, Truck, Bus, Phone, Trash2, Edit3, X, Check } from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; color: string; pulse: boolean }> = {
  online:     { label: 'Disponivel',      color: 'var(--green)',      pulse: true },
  in_transit: { label: 'Em Transito',    color: 'var(--blue)',       pulse: true },
  busy:       { label: 'Em Atendimento', color: 'var(--purple)',     pulse: false },
  break:      { label: 'Pausa',          color: 'var(--yellow)',     pulse: false },
  offline:    { label: 'Offline',        color: 'var(--text-muted)', pulse: false },
  delayed:    { label: 'Atrasado',       color: 'var(--red)',        pulse: true },
};

const VEHICLE_MAP: Record<string, { label: string; Icon: any }> = {
  motorcycle: { label: 'Moto',     Icon: Bike },
  car:        { label: 'Carro',    Icon: Car },
  van:        { label: 'Van',      Icon: Bus },
  truck:      { label: 'Caminhao', Icon: Truck },
};

const defaultForm = { name: '', phone: '', vehicleType: 'motorcycle', whatsappNumber: '' };

function Field({ label, value, onChange, placeholder, type = 'text' }: any) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} className="input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export default function TechniciansPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const { data: technicians = [], isLoading } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => api.get('/technicians').then(r => r.data),
  });

  const create = useMutation({
    mutationFn: (data: typeof defaultForm) => api.post('/technicians', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['technicians'] }); setModal(false); setForm(defaultForm); setError(''); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Erro ao cadastrar'),
  });

  const filtered = useMemo(() =>
    technicians.filter((t: any) =>
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.phone?.includes(search)
    ), [technicians, search]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone) { setError('Nome e telefone sao obrigatorios'); return; }
    create.mutate(form);
  }

  const online = technicians.filter((t: any) => t.status !== 'offline').length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tecnicos</h1>
          <p className="page-subtitle">{technicians.length} cadastrados · {online} ativos agora</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus size={16} /> Novo Tecnico
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total', value: technicians.length, color: 'var(--text-primary)' },
          { label: 'Online', value: technicians.filter((t: any) => ['online','in_transit','busy'].includes(t.status)).length, color: 'var(--green)' },
          { label: 'Offline', value: technicians.filter((t: any) => t.status === 'offline').length, color: 'var(--text-muted)' },
          { label: 'Moto', value: technicians.filter((t: any) => t.vehicleType === 'motorcycle').length, color: 'var(--blue)' },
        ].map((s, i) => (
          <div key={s.label} className={`stat-card animate-fadeUp stagger-${i+1}`} style={{ flex: 1 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div className="search-wrapper" style={{ flex: 1, maxWidth: 340 }}>
          <Search size={15} className="search-icon" />
          <input className="input" placeholder="Buscar por nome ou telefone..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="table-wrapper animate-fadeUp stagger-3">
        <table>
          <thead>
            <tr>
              <th>Tecnico</th>
              <th>Contato</th>
              <th>Veiculo</th>
              <th>WhatsApp</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [1,2,3].map(i => (
                <tr key={i}>
                  {[1,2,3,4,5].map(j => (
                    <td key={j}><div className="skeleton" style={{ height: 14, width: j === 1 ? 160 : 90, borderRadius: 4 }} /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5}>
                <div className="empty-state">
                  <Users size={36} color="var(--text-muted)" />
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Nenhum tecnico encontrado</div>
                  <div style={{ fontSize: 12 }}>Clique em "Novo Tecnico" para comecar</div>
                </div>
              </td></tr>
            ) : filtered.map((t: any) => {
              const st = STATUS_MAP[t.status] ?? STATUS_MAP.offline;
              const veh = VEHICLE_MAP[t.vehicleType];
              return (
                <tr key={t.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: '#fff',
                      }}>{t.name?.[0]?.toUpperCase() ?? '?'}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {t.id?.slice(0,8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)', fontSize: 13 }}>
                      <Phone size={12} color="var(--text-muted)" />
                      {t.phone}
                    </div>
                  </td>
                  <td>
                    {veh && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13 }}>
                        <veh.Icon size={14} color="var(--text-muted)" />
                        {veh.label}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.whatsappNumber || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td>
                    <span className="badge" style={{ background: st.color + '18', color: st.color, border: '1px solid ' + st.color + '30' }}>
                      <span className={'badge-dot' + (st.pulse ? ' pulse' : '')} style={{ background: st.color }} />
                      {st.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setModal(false); setError(''); } }}>
          <div className="modal-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>Novo Tecnico</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Adicione um membro a sua equipe</p>
              </div>
              <button className="btn-ghost" onClick={() => { setModal(false); setError(''); }} style={{ padding: 8 }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Nome completo *" value={form.name} onChange={(v: string) => setForm(f => ({ ...f, name: v }))} placeholder="Joao Silva" />
                <Field label="Telefone *" value={form.phone} onChange={(v: string) => setForm(f => ({ ...f, phone: v }))} placeholder="+55 48 99999-0000" />
              </div>
              <Field label="WhatsApp" value={form.whatsappNumber} onChange={(v: string) => setForm(f => ({ ...f, whatsappNumber: v }))} placeholder="+55 48 99999-0000" />

              <div>
                <label className="label">Tipo de Veiculo</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {Object.entries(VEHICLE_MAP).map(([key, { label, Icon }]) => (
                    <button key={key} type="button" onClick={() => setForm(f => ({ ...f, vehicleType: key }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                        background: form.vehicleType === key ? 'var(--accent-muted)' : 'var(--bg-input)',
                        border: '1px solid ' + (form.vehicleType === key ? 'var(--accent)' : 'var(--border-default)'),
                        borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        color: form.vehicleType === key ? 'var(--accent-light)' : 'var(--text-secondary)',
                        fontSize: 13, fontWeight: 500, transition: 'all .12s',
                      }}>
                      <Icon size={15} />
                      {label}
                      {form.vehicleType === key && <Check size={13} style={{ marginLeft: 'auto' }} />}
                    </button>
                  ))}
                </div>
              </div>

              {error && <div className="alert-error"><X size={14} />{error}</div>}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => { setModal(false); setError(''); }}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={create.isPending}>
                  {create.isPending ? 'Salvando...' : <><Plus size={15} /> Adicionar Tecnico</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
