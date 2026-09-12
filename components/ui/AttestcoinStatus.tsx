"use client";
import React from 'react';
import { CheckCircle, CircleNotch, WarningCircle, ShieldCheck } from '@phosphor-icons/react';

export interface AttestcoinStep {
  label: string;
  detail?: string;
  status: 'pending' | 'active' | 'success' | 'failed';
}

export interface AttestcoinStatusProps {
  steps: AttestcoinStep[];
  className?: string;
}

export function AttestcoinStatus({ steps, className = '' }: AttestcoinStatusProps) {
  return (
    <div className={`w-full bg-[#12111a]/85 border border-[#B78CFF]/20 rounded-2xl p-4 backdrop-blur-md shadow-[0_0_25px_rgba(183,140,255,0.08)] ${className}`}>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
        <ShieldCheck size={18} weight="fill" className="text-[#B78CFF]" />
        <span className="text-xs font-mono font-bold tracking-wider text-cream/90 uppercase">
          Attestcoin Protocol Verification [0x0FD2]
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-start gap-2.5 text-xs">
            <div className="mt-0.5 shrink-0">
              {step.status === 'success' && (
                <CheckCircle size={15} weight="fill" className="text-emerald-400" />
              )}
              {step.status === 'active' && (
                <CircleNotch size={15} className="animate-spin text-[#B78CFF]" />
              )}
              {step.status === 'pending' && (
                <div className="w-3.5 h-3.5 rounded-full border border-white/20 bg-white/5" />
              )}
              {step.status === 'failed' && (
                <WarningCircle size={15} weight="fill" className="text-rose-400" />
              )}
            </div>

            <div className="flex-1 leading-tight">
              <span
                className={`font-medium ${
                  step.status === 'success'
                    ? 'text-cream'
                    : step.status === 'active'
                    ? 'text-[#B78CFF] font-semibold'
                    : step.status === 'failed'
                    ? 'text-rose-300'
                    : 'text-cream/40'
                }`}
              >
                {step.label}
              </span>
              {step.detail && (
                <p className="text-[10px] font-mono text-cream/50 mt-0.5">{step.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
