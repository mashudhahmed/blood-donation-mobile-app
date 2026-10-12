import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'blood' | 'slate' | 'emerald' | 'amber' | 'blue';
  trend?: string;
}

export default function StatsCard({
  label,
  value,
  subtitle,
  icon: Icon,
  variant = 'slate',
  trend,
}: StatsCardProps) {
  const iconVariants = {
    blood: 'bg-[#FFEBEE] text-[#E53935]',
    slate: 'bg-slate-100 text-slate-800',
    emerald: 'bg-[#E8F5E9] text-[#2E7D32]',
    amber: 'bg-[#FFF3E0] text-[#E65100]',
    blue: 'bg-[#E3F2FD] text-[#1565C0]',
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-[#757575] uppercase tracking-wider">{label}</span>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${iconVariants[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline space-x-2">
        <span className="text-2xl sm:text-3xl font-black text-[#212121] tracking-tight">{value}</span>
        {trend && (
          <span className="text-[11px] font-bold text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full border border-[#81C784]">
            {trend}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-[#757575] font-medium">{subtitle}</p>}
    </div>
  );
}
