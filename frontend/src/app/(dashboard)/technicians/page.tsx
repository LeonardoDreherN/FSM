'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  online:     { label: 'Disponível',      color: '#22c55e' },
  in_transit: { label: 'Em Trânsito',    color: '#3b82f6' },
  busy:       { label: 'Em Atendimento', color: '#f59e0b' },
  break:      { label: 'Pausa',          color: '#94a3b8' },
  offline:    { label: 'Offline',        color: '#475569' },
  delayed:    { label: 'Atrasado',       color: '#ef4444' },
};

const VEHICLE_LABEL: Record<string, string> = {
  motorcycle: '🏍️ Moto',
  car:        '🚗 Carro',
  van:        '🚐 Van',
  truck:      '🚛 Caminhão',
};

const defaultForm = { name: '', phone: '', vehicleType: 'motorcycle', whatsappNumber: '' };

export default function TechniciansPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState('');

  const { data: technicians = [], isLoading } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => api.get('/technicians').then(r => r.data),
  });

  const create = useMutation({
    mutationFn: (data: typeof defaultForm) => api.post('/technicians', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['technicians'] });
      setModal(false);
      setForm(defaultForm);
      setError('');
    },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Erro ao cadastrar'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone) { setError('Nome e telefone são obrigatórios'); return; }
    create.mutate(form);
  }

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Técnicos</h1>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: '4px 0 0' }}>Gerencie sua equipe de campo</p>
        </div>
        <button onClick={() => setModal(true)} style={{
          background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          + Novo Técnico
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total', value: technicians.length, color: '#fff' },
          { label: 'Online', value: technicians.filter((t: any) => t.status !== 'offline').length, color: '#22c55e' },
          { label: 'Offline', value: technicians.filter((t: any) => t.status === 'offline').length, color: '#475569' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#1e293b', border: '1px solid #334155', borderRadius: 12,
            padding: '16px 24px', minWidth: 120,
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              {['Nome', 'Telefone', 'Veículo', 'WhatsApp', 'Status'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '12px 16px', fontSize: 12,
                  fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#475569' }}>Carregando...</td></tr>
            ) : technicians.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 48, textAlign: 'center', color: '#475569', fontSize: 15 }}>
                Nenhum técnico cadastrado. Clique em "Novo Técnico" para começar.
              </td></tr>
            ) : technicians.map((tech: any) => {
              const s = STATUS_LABEL[tech.status] ?? STATUS_LABEL.offline;
              return (
                <tr key={tech.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '14px 16px', color: '#e2e8f0', fontWeight: 600 }}>{tech.name}</td>
                  <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{tech.phone}</td>
                  <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{VEHICLE_LABEL[tech.vehicleType] ?? tech.vehicleType}</td>
                  <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{tech.whatsappNumber || '—'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      background: s.color + '20', color: s.color,
                      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    }}>{s.label}</span>
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
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{
            background: '#1e293b', border: '1px solid #334155', borderRadius: 16,
            padding: 32, width: '100%', maxWidth: 480,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Novo Técnico</h2>
              <button onClick={() => { setModal(false); setError(''); }} style={{
                background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer',
              }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Nome completo *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="João Silva" />
              <Field label="Telefone *" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="+55 48 99999-0000" />
              <Field label="WhatsApp" value={form.whatsappNumber} onChange={v => setForm(f => ({ ...f, whatsappNumber: v }))} placeholder="+55 48 99999-0000" />

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#cbd5e1', marginBottom: 6 }}>Veículo</label>
                <select
                  value={form.vehicleType}
                  onChange={e => setForm(f => ({ ...f, vehicleType: e.target.value }))}
                  style={{
                    width: '100%', background: '#334155', border: '1px solid #475569',
                    borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14,
                  }}
                >
                  <option value="motorcycle">🏍️ Moto</option>
                  <option value="car">🚗 Carro</option>
                  <option value="van">🚐 Van</option>
                  <option value="truck">🚛 Caminhão</option>
                </select>
              </div>

              {error && <div style={{ background: '#ef444420', border: '1px solid #ef444440', color: '#f87171', padding: '10px 12px', borderRadius: 8, fontSize: 13 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => { setModal(false); setError(''); }} style={{
                  flex: 1, padding: '12px', background: '#334155', border: 'none',
                  borderRadius: 8, color: '#94a3b8', fontSize: 14, cursor: 'pointer',
                }}>Cancelar</button>
                <button type="submit" disabled={create.isPending} style={{
                  flex: 1, padding: '12px', background: '#2563eb', border: 'none',
                  borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>{create.isPending ? 'Salvando...' : 'Salvar Técnico'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#cbd5e1', marginBottom: 6 }}>{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', background: '#334155', border: '1px solid #475569',
          borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14,
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}
