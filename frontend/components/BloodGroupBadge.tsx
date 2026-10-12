import React from 'react';

interface BloodGroupBadgeProps {
  bloodGroup: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'squircle' | 'pill';
  showDot?: boolean;
  className?: string;
}

export default function BloodGroupBadge({
  bloodGroup,
  size = 'md',
  variant = 'squircle',
  showDot = false,
  className = '',
}: BloodGroupBadgeProps) {
  const normalized = bloodGroup?.trim() || 'O+';

  if (variant === 'squircle') {
    const squircleSizes = {
      sm: 'w-8 h-8 text-xs rounded-xl',
      md: 'w-11 h-11 text-base rounded-2xl',
      lg: 'w-14 h-14 text-xl rounded-2xl',
    };

    return (
      <div
        className={`bg-[#FFF1F2] border border-[#FECDD3] text-[#B91C1C] font-black flex items-center justify-center shrink-0 shadow-2xs ${squircleSizes[size]} ${className}`}
        title={`Blood Group ${normalized}`}
      >
        <span>{normalized}</span>
      </div>
    );
  }

  // Pill variant
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-extrabold px-3.5 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg font-bold tracking-wide border shadow-2xs bg-[#FFEBEE] text-[#E53935] border-[#FECDD3] ${sizeClasses[size]} ${className}`}
    >
      {showDot && <span className="w-2 h-2 rounded-full shrink-0 bg-[#E53935]" />}
      <span>{normalized}</span>
    </span>
  );
}
