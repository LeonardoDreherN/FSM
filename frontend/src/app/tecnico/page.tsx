'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Zap, Phone, ArrowRight, HardHat } from 'lucide-react';

export default function TechnicianLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function maskPhone(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return `+55 ${d}`;
    if (d.length <= 7) return `+55 ${d.slice(0,2)} ${d.slice(2)}`;
    return `+55 ${d.slice(0,2)} ${d.slice(2,7)}-${d.slice(7)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setError('Digite um telefone válido');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/technician-login', { phone });
      localStorage.setItem('fsm_tech_token', data.accessToken);
      localStorage.setItem('fsm_tech', JSON.stringify(data.technician));
      router.replace('/tecnico/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Telefone não encontrado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
    }}>
      <div style={{ width: '100%', maxWidth: 400, animation: 'fadeUp 0.4s cubic-bezier(.16,1,.3,1) both' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            borderRadius: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 32px rgba(99,102,241,0.4)',
          }}>
            <HardHat size={30} color="#fff" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.4px', marginBottom: 8 }}>
            Área do Técnico
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Entre com seu número de telefone<br />cadastrado no sistema
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          padding: 28,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label">Seu telefone</label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} color="var(--text-muted)" style={{
                  position: 'absolute', left: 13, top: '50%',
                  transform: 'translateY(-50%)', pointerEvents: 'none',
                }} />
                <input
                  className="input"
                  value={phone}
                  onChange={e => setPhone(maskPhone(e.target.value))}
                  placeholder="+55 48 99999-0000"
                  inputMode="numeric"
                  style={{ paddingLeft: 38, fontSize: 16, letterSpacing: 0.5 }}
                  autoComplete="tel"
                />
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                Mesmo número cadastrado pelo seu gestor
              </p>
            </div>

            {error && (
              <div className="alert-error">
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, marginTop: 4 }}
            >
              {loading ? 'Verificando...' : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  Entrar <ArrowRight size={17} />
                </span>
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 24 }}>
          Gestor?{' '}
          <a href="/login" style={{ color: 'var(--accent-light)', textDecoration: 'none', fontWeight: 600 }}>
            Acesse o painel
          </a>
        </p>
      </div>
    </div>
  );
}
