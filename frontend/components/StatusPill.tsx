import React from 'react';

interface StatusPillProps {
  status: string;
  type?: 'auto' | 'stock' | 'urgency';
}

export default function StatusPill({ status, type = 'auto' }: StatusPillProps) {
  const norm = (status || '').toUpperCase();

  // Explicit Urgency handling
  if (type === 'urgency' || norm === 'CRITICAL_URGENCY' || norm === 'URGENT') {
    if (norm === 'CRITICAL' || norm === 'CRITICAL_URGENCY') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wider bg-[#FFEBEE] text-[#C62828] border border-[#FECDD3]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E53935] mr-1 animate-ping"></span>
          CRITICAL
        </span>
      );
    }
    if (norm === 'URGENT') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wider bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]">
          URGENT
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wider bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]">
        STANDARD
      </span>
    );
  }

  // Stock status styles
  if (norm === 'CRITICAL' || norm === 'EMERGENCY' || norm === 'CRITICAL_STOCK') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFEBEE] text-[#C62828] border border-[#FECDD3]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#E53935] mr-1.5 animate-ping"></span>
        Critical Shortage
      </span>
    );
  }
  if (norm === 'LOW') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFF3E0] text-[#E65100] border border-[#FFB74D]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF9800] mr-1.5"></span>
        Low Stock
      </span>
    );
  }
  if (norm === 'NORMAL') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8F5E9] text-[#2E7D32] border border-[#81C784]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#4CAF50] mr-1.5"></span>
        Optimal
      </span>
    );
  }
  if (norm === 'ABUNDANT') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E3F2FD] text-[#1565C0] border border-[#64B5F6]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#2196F3] mr-1.5"></span>
        Abundant
      </span>
    );
  }

  // Requisition pipeline status
  if (norm === 'PENDING') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFF3E0] text-[#E65100] border border-[#FFB74D]">
        Pending Match
      </span>
    );
  }
  if (norm === 'MATCHED') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E3F2FD] text-[#1565C0] border border-[#90CAF9]">
        Donors Matched
      </span>
    );
  }
  if (norm === 'DISPATCHED') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F3E5F5] text-[#7B1FA2] border border-[#CE93D8]">
        Dispatched
      </span>
    );
  }
  if (norm === 'FULFILLED') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8F5E9] text-[#2E7D32] border border-[#81C784]">
        Fulfilled
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F5F5F5] text-[#757575] border border-[#E0E0E0]">
      {status}
    </span>
  );
}
