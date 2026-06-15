'use client';
import { useState, useRef, useEffect } from 'react';

interface Result {
  display_name: string;
  lat: string;
  lon: string;
}

interface Props {
  onSelect: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
}

export default function AddressSearch({ onSelect, placeholder = 'Digite o endereço...' }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (value.length < 4) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&countrycodes=br`,
          { headers: { 'Accept-Language': 'pt-BR' } }
        );
        const data = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch {}
      setLoading(false);
    }, 500);
  }

  function handleSelect(result: Result) {
    setQuery(result.display_name);
    setOpen(false);
    onSelect(result.display_name, parseFloat(result.lat), parseFloat(result.lon));
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={e => handleChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', background: '#334155', border: '1px solid #475569',
            borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14,
            boxSizing: 'border-box',
          }}
        />
        {loading && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 12 }}>
            Buscando...
          </div>
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
          marginTop: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', overflow: 'hidden',
        }}>
          {results.map((r, i) => (
            <div
              key={i}
              onClick={() => handleSelect(r)}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: '#cbd5e1',
                borderBottom: i < results.length - 1 ? '1px solid #334155' : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#334155')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              📍 {r.display_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
