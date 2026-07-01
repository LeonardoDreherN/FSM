'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Zap, Mail, Lock, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError('Preencha e-mail e senha'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('fsm_token', data.accessToken);
      localStorage.setItem('fsm_user', JSON.stringify(data.user));
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'E-mail ou senha invalidos');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'stretch' }}>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '40px 48px', background: 'var(--bg-elevated)',
        borderRight: '1px solid var(--border-subtle)', maxWidth: 480,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99,102,241,0.4)',
          }}><Zap size={18} color="#fff" /></div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>FSM Pro</div>
            <div style={{ fontSize: 10, color: 'var(--accent-light)', fontWeight: 600, letterSpacing: 1 }}>FIELD SERVICE</div>
          </div>
        </div>

        <div style={{ animation: 'fadeUp 0.5s cubic-bezier(.16,1,.3,1) both' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--accent-muted)', border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 99, padding: '4px 12px', marginBottom: 24,
          }}>
            <div className="live-dot" />
            <span style={{ fontSize: 12, color: 'var(--accent-light)', fontWeight: 600 }}>Sistema Operacional</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.5px', marginBottom: 16 }}>
            Controle total da<br />
            <span style={{ background: 'linear-gradient(135deg, #818CF8, #C084FC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              sua equipe de rua
            </span>
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 340 }}>
            Gerencie ordens de servico, rastreie tecnicos em tempo real e otimize rotas automaticamente.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 32 }}>
            {['Redespacho automatico inteligente', 'Mapa em tempo real com WebSocket', 'Busca de endereco por CEP'].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={16} color="var(--green)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>2026 FSM Pro</div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 48px' }}>
        <div style={{ width: '100%', maxWidth: 380, animation: 'fadeUp 0.5s .1s cubic-bezier(.16,1,.3,1) both' }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Entrar na plataforma</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6 }}>Acesse com suas credenciais de administrador</p>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label">E-mail</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@empresa.com" style={{ paddingLeft: 38 }} autoComplete="email" />
              </div>
            </div>
            <div>
              <label className="label">Senha</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type={showPass ? 'text' : 'password'} className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder="....." style={{ paddingLeft: 38, paddingRight: 38 }} autoComplete="current-password" />
                <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
                  {showPass ? <EyeOff size={15} color="var(--text-muted)" /> : <Eye size={15} color="var(--text-muted)" />}
                </button>
              </div>
            </div>
            {error && <div className="alert-error"><span>{error}</span></div>}
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px 18px', fontSize: 15, marginTop: 4 }}>
              {loading ? 'Entrando...' : <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>Entrar <ArrowRight size={16} /></span>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
