import React from 'react';

interface StatusPillProps {
  status: string;
  type?: 'auto' | 'stock' | 'urgency';
}

interface PillStyle {
  label: string;
  tone: string; // bg + text + border
  dot?: string;
  pulse?: boolean;
  compact?: boolean; // rectangular urgency tag
}

const URGENCY: Record<'critical' | 'urgent' | 'standard', PillStyle> = {
  critical: {
    label: 'Critical',
    tone: 'bg-[#FFEBEE] text-[#C62828] border-[#FECDD3]',
    dot: 'bg-[#E53935]',
    pulse: true,
    compact: true,
  },
  urgent: {
    label: 'Urgent',
    tone: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
    compact: true,
  },
  standard: {
    label: 'Standard',
    tone: 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]',
    compact: true,
  },
};

const STATUSES: Record<string, PillStyle> = {
  CRITICAL: { label: 'Critical shortage', tone: 'bg-[#FFEBEE] text-[#C62828] border-[#FECDD3]', dot: 'bg-[#E53935]', pulse: true },
  EMERGENCY: { label: 'Critical shortage', tone: 'bg-[#FFEBEE] text-[#C62828] border-[#FECDD3]', dot: 'bg-[#E53935]', pulse: true },
  CRITICAL_STOCK: { label: 'Critical shortage', tone: 'bg-[#FFEBEE] text-[#C62828] border-[#FECDD3]', dot: 'bg-[#E53935]', pulse: true },
  LOW: { label: 'Low stock', tone: 'bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]', dot: 'bg-[#FF9800]' },
  NORMAL: { label: 'Optimal', tone: 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]', dot: 'bg-[#4CAF50]' },
  ABUNDANT: { label: 'Abundant', tone: 'bg-[#E3F2FD] text-[#1565C0] border-[#BBDEFB]', dot: 'bg-[#2196F3]' },
  PENDING: { label: 'Pending match', tone: 'bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]', dot: 'bg-[#FF9800]' },
  MATCHED: { label: 'Donors matched', tone: 'bg-[#E3F2FD] text-[#1565C0] border-[#BBDEFB]', dot: 'bg-[#2196F3]' },
  DISPATCHED: { label: 'Dispatched', tone: 'bg-[#F3E5F5] text-[#7B1FA2] border-[#E1BEE7]', dot: 'bg-[#AB47BC]' },
  FULFILLED: { label: 'Fulfilled', tone: 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]', dot: 'bg-[#4CAF50]' },
};

function Dot({ className, pulse }: { className: string; pulse?: boolean }) {
  return (
    <span aria-hidden className="relative mr-1.5 flex h-1.5 w-1.5">
      {pulse && (
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping ${className}`} />
      )}
      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${className}`} />
    </span>
  );
}

function Pill({ style }: { style: PillStyle }) {
  const shape = style.compact
    ? 'rounded-md px-2 py-0.5 text-[11px] tracking-wide'
    : 'rounded-full px-2.5 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center whitespace-nowrap border font-semibold ${shape} ${style.tone}`}>
      {style.dot && <Dot className={style.dot} pulse={style.pulse} />}
      {style.label}
    </span>
  );
}

export default function StatusPill({ status, type = 'auto' }: StatusPillProps) {
  const norm = (status || '').toUpperCase();

  if (type === 'urgency' || norm === 'CRITICAL_URGENCY' || norm === 'URGENT') {
    if (norm === 'CRITICAL' || norm === 'CRITICAL_URGENCY') return <Pill style={URGENCY.critical} />;
    if (norm === 'URGENT') return <Pill style={URGENCY.urgent} />;
    return <Pill style={URGENCY.standard} />;
  }

  const match = STATUSES[norm];
  if (match) return <Pill style={match} />;

  return (
    <span className="inline-flex items-center rounded-full border border-[#E0E0E0] bg-[#F5F5F5] px-2.5 py-0.5 text-xs font-medium text-[#757575]">
      {status}
    </span>
  );
}
