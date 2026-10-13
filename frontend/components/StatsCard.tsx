import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'blood' | 'slate' | 'emerald' | 'amber' | 'blue';
  trend?: string;
}

const ICON_VARIANTS = {
  blood: 'bg-[#FFEBEE] text-[#E53935] ring-[#FECDD3]',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  emerald: 'bg-[#E8F5E9] text-[#2E7D32] ring-[#C8E6C9]',
  amber: 'bg-[#FFF3E0] text-[#E65100] ring-[#FFE0B2]',
  blue: 'bg-[#E3F2FD] text-[#1565C0] ring-[#BBDEFB]',
} as const;

export default function StatsCard({
  label,
  value,
  subtitle,
  icon: Icon,
  variant = 'slate',
  trend,
}: StatsCardProps) {
  // A trend starting with "-" is treated as negative
  const isNegative = trend?.trim().startsWith('-');
  const TrendIcon = isNegative ? TrendingDown : TrendingUp;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow duration-200 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.12)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black leading-none tracking-tight tabular-nums text-slate-900">
            {value}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${ICON_VARIANTS[variant]}`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>

      {(trend || subtitle) && (
        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs">
          {trend && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${
                isNegative ? 'bg-[#FFEBEE] text-[#C62828]' : 'bg-[#E8F5E9] text-[#2E7D32]'
              }`}
            >
              <TrendIcon className="h-3 w-3" aria-hidden />
              {trend}
            </span>
          )}
          {subtitle && <span className="truncate font-medium text-slate-500">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
