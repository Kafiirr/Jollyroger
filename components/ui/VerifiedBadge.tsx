"use client";

import React from 'react';
import { ShieldCheck, Warning } from '@phosphor-icons/react';

export interface VerifiedBadgeProps {
  type: 'identity' | 'asset' | 'compliance';
  verified: boolean;
  label?: string;
  detail?: string;
  size?: 'sm' | 'md';
  className?: string;
}

const defaultLabels = {
  identity: { verified: 'CVI Verified', unverified: 'Not Verified' },
  asset: { verified: 'CVA Verified', unverified: 'Unverified' },
  compliance: { verified: 'CCP Passed', unverified: 'CCP Required' },
};

export function VerifiedBadge({
  type,
  verified,
  label,
  detail,
  size = 'sm',
  className = '',
}: VerifiedBadgeProps) {
  const displayLabel = label || (verified ? defaultLabels[type].verified : defaultLabels[type].unverified);
  
  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5 gap-1 min-h-[20px]' 
    : 'text-sm px-3 py-1 gap-1.5 min-h-[28px]';

  if (verified) {
    return (
      <div 
        title={detail}
        className={`inline-flex items-center justify-center rounded-full border border-amber bg-ambersoft text-amber shadow-[0_0_8px_var(--tw-shadow-color)] shadow-amber/30 transition-all hover:shadow-amber/50 ${sizeClasses} ${className}`}
      >
        <ShieldCheck weight="fill" className="text-up" />
        <span className="font-sans font-medium whitespace-nowrap">{displayLabel}</span>
      </div>
    );
  }

  return (
    <div 
      title={detail}
      className={`inline-flex items-center justify-center rounded-full border border-glassline bg-glass text-creamdim ${sizeClasses} ${className}`}
    >
      <Warning weight="bold" />
      <span className="font-sans font-medium whitespace-nowrap">{displayLabel}</span>
    </div>
  );
}
