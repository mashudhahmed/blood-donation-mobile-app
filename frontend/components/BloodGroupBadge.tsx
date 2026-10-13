import React from 'react';

interface BloodGroupBadgeProps {
  bloodGroup: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'squircle' | 'pill';
  showDot?: boolean;
  className?: string;
}

const SQUIRCLE_SIZES = {
  sm: 'w-8 h-8 text-xs rounded-[10px]',
  md: 'w-11 h-11 text-base rounded-[14px]',
  lg: 'w-14 h-14 text-xl rounded-[18px]',
} as const;

const PILL_SIZES = {
  sm: 'text-[11px] px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
  lg: 'text-sm font-extrabold px-3.5 py-1.5 gap-2',
} as const;

export default function BloodGroupBadge({
  bloodGroup,
  size = 'md',
  variant = 'squircle',
  showDot = false,
  className = '',
}: BloodGroupBadgeProps) {
  const normalized = bloodGroup?.trim() || 'O+';
  const label = `Blood group ${normalized}`;

  if (variant === 'squircle') {
    return (
      <div
        role="img"
        aria-label={label}
        title={label}
        className={`relative flex shrink-0 items-center justify-center font-black tracking-tight tabular-nums text-[#B91C1C] border border-[#FECDD3] bg-[linear-gradient(180deg,#FFFFFF_0%,#FFF1F2_100%)] shadow-[0_1px_2px_rgba(185,28,28,0.12),inset_0_1px_0_rgba(255,255,255,0.9)] ${SQUIRCLE_SIZES[size]} ${className}`}
      >
        <span>{normalized}</span>
      </div>
    );
  }

  return (
    <span
      title={label}
      className={`inline-flex items-center justify-center rounded-lg border border-[#FECDD3] bg-[#FFEBEE] font-bold tracking-wide tabular-nums text-[#C62828] shadow-2xs ${PILL_SIZES[size]} ${className}`}
    >
      {showDot && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#E53935]" />}
      <span>{normalized}</span>
    </span>
  );
}
