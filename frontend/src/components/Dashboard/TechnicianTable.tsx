'use client';
import { clsx } from 'clsx';

interface Technician {
  id: string;
  name: string;
  status: string;
  vehicleType: string;
  activeOrders?: number;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  online:     { label: 'Disponível',    color: 'bg-green-500/20 text-green-400' },
  in_transit: { label: 'Em Trânsito',  color: 'bg-blue-500/20 text-blue-400' },
  busy:       { label: 'Em Atendimento', color: 'bg-amber-500/20 text-amber-400' },
  break:      { label: 'Pausa',         color: 'bg-slate-500/20 text-slate-400' },
  offline:    { label: 'Offline',       color: 'bg-surface-200 text-slate-500' },
  delayed:    { label: 'Atrasado',      color: 'bg-red-500/20 text-red-400' },
};

export default function TechnicianTable({ technicians }: { technicians: Technician[] }) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="px-4 py-3 border-b border-surface-200">
        <h2 className="text-sm font-semibold text-slate-200">Equipe de Campo</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 text-xs border-b border-surface-200">
              <th className="text-left px-4 py-2 font-medium">Técnico</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-left px-4 py-2 font-medium">Veículo</th>
              <th className="text-right px-4 py-2 font-medium">OSs Hoje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200/50">
            {technicians.map((tech) => {
              const s = STATUS_LABEL[tech.status] ?? STATUS_LABEL.offline;
              return (
                <tr key={tech.id} className="hover:bg-surface-100/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-200">{tech.name}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('badge', s.color)}>{s.label}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 capitalize">{tech.vehicleType}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{tech.activeOrders ?? 0}</td>
                </tr>
              );
            })}
            {technicians.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500 text-sm">
                  Nenhum técnico cadastrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
