'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/dashboard',      icon: '🗺️',  label: 'Mapa ao Vivo' },
  { href: '/technicians',    icon: '👷',  label: 'Técnicos' },
  { href: '/service-orders', icon: '📋',  label: 'Ordens de Serviço' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('fsm_token');
    if (!token) { router.replace('/login'); return; }
    try {
      const u = JSON.parse(localStorage.getItem('fsm_user') ?? '{}');
      setUserName(u?.name ?? '');
    } catch {}
  }, []);

  function logout() {
    localStorage.clear();
    router.replace('/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: '#0f172a', borderRight: '1px solid #1e293b',
        display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0,
      }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>FSM</div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>Field Service</div>
        </div>

        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 8, marginBottom: 4, textDecoration: 'none',
                background: active ? '#1e293b' : 'transparent',
                color: active ? '#fff' : '#94a3b8',
                fontSize: 14, fontWeight: active ? 600 : 400,
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #1e293b' }}>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>{userName}</div>
          <button onClick={logout} style={{
            fontSize: 13, color: '#ef4444', background: 'none',
            border: 'none', cursor: 'pointer', padding: 0,
          }}>Sair</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
