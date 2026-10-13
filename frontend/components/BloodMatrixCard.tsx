'use client';

import React from 'react';
import BloodGroupBadge from './BloodGroupBadge';
import StatusPill from './StatusPill';
import { Plus, Minus, AlertTriangle, Snowflake, ArrowRight } from 'lucide-react';

export interface BloodMatrixItem {
  units: number;
  status: 'CRITICAL' | 'LOW' | 'NORMAL' | 'ABUNDANT';
  rh?: 'Rh+' | 'Rh-';
  compatibilityTag?: string;
  notes?: string;
}

interface BloodMatrixCardProps {
  bloodGroup: string;
  data: BloodMatrixItem;
  maxCapacity?: number;
  mode?: 'admin' | 'bloodbank';
  onQuickAdjust?: (bloodGroup: string, type: 'INTAKE' | 'DISPATCH') => void;
  onOpenAdjustModal?: (bloodGroup: string) => void;
  onFilterRequisitions?: (bloodGroup: string) => void;
}

const BLOOD_METADATA: Record<
  string,
  {
    rh: 'Rh+' | 'Rh-';
    badgeLabel: string;
    badgeStyle: string;
    compatibility: string;
  }
> = {
  'A+': {
    rh: 'Rh+',
    badgeLabel: 'A Positive',
    badgeStyle: 'bg-slate-100 text-slate-700 border-slate-200',
    compatibility: 'Give: A+, AB+ | Recv: A+, A-, O+, O-',
  },
  'A-': {
    rh: 'Rh-',
    badgeLabel: 'Rh- Negative',
    badgeStyle: 'bg-rose-50 text-rose-800 border-rose-200',
    compatibility: 'Give: A±, AB± | Recv: A-, O-',
  },
  'B+': {
    rh: 'Rh+',
    badgeLabel: 'B Positive',
    badgeStyle: 'bg-slate-100 text-slate-700 border-slate-200',
    compatibility: 'Give: B+, AB+ | Recv: B+, B-, O+, O-',
  },
  'B-': {
    rh: 'Rh-',
    badgeLabel: 'Rare Rh- Stock',
    badgeStyle: 'bg-rose-50 text-rose-800 border-rose-200',
    compatibility: 'Give: B±, AB± | Recv: B-, O-',
  },
  'AB+': {
    rh: 'Rh+',
    badgeLabel: 'Universal Recipient',
    badgeStyle: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    compatibility: 'Can receive from all 8 groups',
  },
  'AB-': {
    rh: 'Rh-',
    badgeLabel: 'Rarest Type (<1%)',
    badgeStyle: 'bg-amber-50 text-amber-900 border-amber-200',
    compatibility: 'Give: AB± | Recv: AB-, A-, B-, O-',
  },
  'O+': {
    rh: 'Rh+',
    badgeLabel: 'High Demand',
    badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    compatibility: 'Give: O+, A+, B+, AB+ | Recv: O+, O-',
  },
  'O-': {
    rh: 'Rh-',
    badgeLabel: 'Universal RBC Donor',
    badgeStyle: 'bg-red-50 text-red-800 border-red-200 font-extrabold',
    compatibility: 'Emergency ER Standard (all can receive)',
  },
};

export default function BloodMatrixCard({
  bloodGroup,
  data,
  maxCapacity = 50,
  mode = 'bloodbank',
  onQuickAdjust,
  onOpenAdjustModal,
  onFilterRequisitions,
}: BloodMatrixCardProps) {
  const meta = BLOOD_METADATA[bloodGroup] || {
    rh: bloodGroup.includes('-') ? 'Rh-' : 'Rh+',
    badgeLabel: bloodGroup,
    badgeStyle: 'bg-slate-100 text-slate-700 border-slate-200',
    compatibility: 'Standard inventory unit',
  };

  const isCritical = data.status === 'CRITICAL';
  const isLow = data.status === 'LOW';
  const isAbundant = data.status === 'ABUNDANT';

  const percentage = Math.min(100, Math.round((data.units / maxCapacity) * 100));

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
        isCritical
          ? 'border-red-300 bg-[linear-gradient(180deg,#FFFFFF_0%,#FFF5F5_100%)] ring-1 ring-red-400'
          : isLow
          ? 'border-amber-300 bg-[linear-gradient(180deg,#FFFFFF_0%,#FFFBF0_100%)]'
          : isAbundant
          ? 'border-blue-200 bg-white hover:border-blue-300'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      {/* Top Header Strip */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center space-x-3">
            <BloodGroupBadge bloodGroup={bloodGroup} size="lg" />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-black tracking-tight text-slate-900">
                  {bloodGroup} Group
                </span>
                <span className="text-[10px] font-bold text-slate-400 font-mono">
                  {meta.rh}
                </span>
              </div>
              <span
                className={`mt-1 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${meta.badgeStyle}`}
              >
                {meta.badgeLabel}
              </span>
            </div>
          </div>

          <StatusPill status={data.status} />
        </div>

        {/* Units Count & Progress Gauge */}
        <div className="mt-4 pt-1">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-black tracking-tight text-slate-900 tabular-nums">
                {data.units}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {data.units === 1 ? 'Unit' : 'Units'} (450 mL)
              </span>
            </div>

            <span
              className={`text-xs font-bold tabular-nums ${
                isCritical
                  ? 'text-red-700'
                  : isLow
                  ? 'text-amber-700'
                  : 'text-slate-600'
              }`}
            >
              {percentage}% Quota
            </span>
          </div>

          {/* Progress Bar with Min-Reserve Indicator */}
          <div className="relative mt-2.5 h-2.5 w-full overflow-hidden rounded-full border border-slate-200/90 bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isCritical
                  ? 'bg-gradient-to-r from-red-500 to-[#C62828]'
                  : isLow
                  ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                  : isAbundant
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                  : 'bg-gradient-to-r from-emerald-400 to-emerald-600'
              }`}
              style={{ width: `${Math.max(percentage, 3)}%` }}
            />
          </div>

          {/* Min Safety Indicator Subtext */}
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span>Safety Min: 10 units</span>
            <span>Capacity: {maxCapacity} units</span>
          </div>
        </div>
      </div>

      {/* Card Footer / Actions */}
      <div className="mt-4 border-t border-slate-100 pt-3">
        {mode === 'bloodbank' ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-1">
              {onQuickAdjust && (
                <>
                  <button
                    type="button"
                    onClick={() => onQuickAdjust(bloodGroup, 'INTAKE')}
                    title={`Record 1 bag intake for ${bloodGroup}`}
                    className="inline-flex h-7 items-center justify-center space-x-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-bold text-emerald-800 transition-colors hover:bg-emerald-100 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Intake</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onQuickAdjust(bloodGroup, 'DISPATCH')}
                    title={`Record 1 bag dispatch for ${bloodGroup}`}
                    className="inline-flex h-7 items-center justify-center space-x-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
                  >
                    <Minus className="h-3 w-3" />
                    <span>Dispatch</span>
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => onOpenAdjustModal && onOpenAdjustModal(bloodGroup)}
              className="inline-flex items-center space-x-1 text-xs font-bold text-[#C62828] transition-colors hover:text-[#B71C1C] cursor-pointer"
            >
              <span>Manage</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center space-x-1 text-slate-500 font-medium">
              <Snowflake className="h-3 w-3 text-cyan-600" />
              <span>Cryo 2°C–6°C</span>
            </div>

            {onFilterRequisitions ? (
              <button
                type="button"
                onClick={() => onFilterRequisitions(bloodGroup)}
                className="font-bold text-[#C62828] hover:text-[#B71C1C] cursor-pointer"
              >
                Inspect Pipeline &rarr;
              </button>
            ) : (
              <span className="font-semibold text-slate-600">
                {isCritical ? (
                  <span className="inline-flex items-center text-red-600 font-bold">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Shortage Alert
                  </span>
                ) : (
                  'Verified Vault'
                )}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
