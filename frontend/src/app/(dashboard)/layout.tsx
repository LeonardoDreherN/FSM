'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Map, Users, ClipboardList, LogOut, Zap, ChevronRight } from 'lucide-react';

const NAV = [
  { href: '/dashboard',      Icon: Map,          label: 'Mapa ao Vivo',      desc: 'Rastreamento' },
  { href: '/technicians',    Icon: Users,         label: 'Técnicos',          desc: 'Equipe' },
  { href: '/service-orders', Icon: ClipboardList, label: 'Ordens de Serviço', desc: 'Demandas' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('fsm_token');
    if (!token) { router.replace('/login'); return; }
    try { setUser(JSON.parse(localStorage.getItem('fsm_user') ?? '{}')); } catch {}
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <aside style={{
        width: 240, background: 'var(--bg-elevated)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(99,102,241,0.35)', flexShrink: 0,
            }}><Zap size={17} color="#fff" /></div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', lineHeight: 1 }}>FSM</div>
              <div style={{ fontSize: 10, color: 'var(--accent-light)', fontWeight: 600, letterSpacing: 1, marginTop: 2 }}>FIELD SERVICE</div>
            </div>
          </div>
        </div>

        <nav style={{ padding: '12px 8px', flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, padding: '4px 8px 10px' }}>Menu</div>
          {NAV.map(({ href, Icon, label, desc }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link key={href} href={href} style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                  borderRadius: 'var(--radius-md)',
                  background: active ? 'var(--accent-muted)' : 'transparent',
                  boxShadow: active ? 'inset 2px 0 0 var(--accent)' : 'none',
                  transition: 'background .12s',
                }}>
                  <div style={{
                    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 8, background: active ? 'rgba(99,102,241,0.18)' : 'transparent',
                    flexShrink: 0,
                  }}><Icon size={15} color={active ? 'var(--accent-light)' : 'var(--text-muted)'} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: active ? 'var(--text-primary)' : 'var(--text-secondary)', lineHeight: 1.2 }}>{label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{desc}</div>
                  </div>
                  {active && <ChevronRight size={12} color="var(--accent-light)" />}
                </div>
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff',
            }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name ?? 'Usuário'}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email ?? ''}</div>
            </div>
            <button onClick={() => { localStorage.clear(); router.replace('/login'); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center' }}
              title="Sair">
              <LogOut size={14} color="var(--text-muted)" />
            </button>
          </div>
        </div>
      </aside>
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>{children}</main>
    </div>
  );
}
