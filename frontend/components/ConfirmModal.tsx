'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X, LucideIcon, Loader2 } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'primary' | 'success';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: LucideIcon;
  isLoading?: boolean;
}

const VARIANT_CONFIG: Record<
  ConfirmVariant,
  {
    barColor: string;
    iconBox: string;
    defaultIcon: LucideIcon;
    confirmButton: string;
  }
> = {
  danger: {
    barColor: 'bg-[#C62828]',
    iconBox: 'bg-red-50 text-[#C62828] border-red-100',
    defaultIcon: AlertTriangle,
    confirmButton:
      'bg-[#C62828] hover:bg-[#B71C1C] text-white shadow-md shadow-[#C62828]/25 focus-visible:ring-[#C62828]',
  },
  warning: {
    barColor: 'bg-amber-500',
    iconBox: 'bg-amber-50 text-amber-600 border-amber-200',
    defaultIcon: AlertCircle,
    confirmButton:
      'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/25 focus-visible:ring-amber-500',
  },
  primary: {
    barColor: 'bg-[#0B1528]',
    iconBox: 'bg-slate-100 text-slate-800 border-slate-200',
    defaultIcon: Info,
    confirmButton:
      'bg-[#0B1528] hover:bg-[#16233D] text-white shadow-md shadow-slate-900/20 focus-visible:ring-[#0B1528]',
  },
  success: {
    barColor: 'bg-emerald-600',
    iconBox: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    defaultIcon: CheckCircle2,
    confirmButton:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 focus-visible:ring-emerald-600',
  },
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  icon,
  isLoading = false,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const cfg = VARIANT_CONFIG[variant];
  const IconComponent = icon || cfg.defaultIcon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        onClick={() => {
          if (!isLoading) onClose();
        }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      />

      {/* Modal Dialog Box */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_50px_-12px_rgba(15,23,42,0.25)] animate-in fade-in zoom-in-95 duration-150">
        {/* Top Accent Strip */}
        <div className={`h-1.5 w-full ${cfg.barColor}`} />

        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Themed Icon Box */}
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${cfg.iconBox}`}
            >
              <IconComponent className="h-6 w-6" aria-hidden />
            </div>

            <div className="min-w-0 flex-1 space-y-1 pt-0.5">
              <h3 id="confirm-modal-title" className="text-base font-extrabold tracking-tight text-slate-900">
                {title}
              </h3>
              <div id="confirm-modal-desc" className="text-xs leading-relaxed text-slate-500">
                {description}
              </div>
            </div>

            {/* Close X Button */}
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              aria-label="Close dialog"
              className="cursor-pointer rounded-xl p-1 text-slate-400 outline-none transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 outline-none transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
            >
              {cancelText}
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={async () => {
                await onConfirm();
              }}
              className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 ${cfg.confirmButton}`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Processing…</span>
                </>
              ) : (
                <span>{confirmText}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
