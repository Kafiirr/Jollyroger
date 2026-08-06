"use client";

import React from 'react';
import { CheckCircle, XCircle, Circle, Spinner } from '@phosphor-icons/react';

export type StepStatus = 'pending' | 'active' | 'done' | 'error';

export interface CleanverseStep {
  label: string;
  status: StepStatus;
  detail?: string;
}

export interface CleanverseStatusProps {
  steps: CleanverseStep[];
  className?: string;
}

export function CleanverseStatus({ steps, className = '' }: CleanverseStatusProps) {
  return (
    <div className={`flex flex-col w-full max-w-[300px] ${className}`}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        
        // Solid amber line if current step is done, otherwise dashed glassline
        const lineClasses = step.status === 'done' 
          ? 'border-l-2 border-solid border-amber' 
          : 'border-l-2 border-dashed border-glassline';

        return (
          <div key={index} className="flex flex-row">
            {/* Left Side: Icon & Connecting Line */}
            <div className="flex flex-col items-center mr-3 mt-0.5">
              <div className="relative z-10 flex items-center justify-center bg-bg rounded-full h-5 w-5">
                {step.status === 'pending' && <Circle weight="bold" className="text-glassline text-lg" />}
                {step.status === 'active' && (
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full animate-ping bg-amber opacity-20"></div>
                    <Spinner weight="bold" className="text-amber text-lg animate-spin" />
                  </div>
                )}
                {step.status === 'done' && <CheckCircle weight="fill" className="text-up text-xl" />}
                {step.status === 'error' && <XCircle weight="fill" className="text-down text-xl" />}
              </div>
              {!isLast && (
                <div className={`flex-1 w-0 h-full min-h-[24px] mt-1 ${lineClasses}`} />
              )}
            </div>

            {/* Right Side: Step Info */}
            <div className={`flex flex-col pb-6 ${isLast ? 'pb-0' : ''}`}>
              <span className={`font-sans font-medium text-sm ${
                step.status === 'pending' ? 'text-creamdim' :
                step.status === 'active' ? 'text-amber animate-pulse' :
                step.status === 'done' ? 'text-cream' :
                'text-down'
              }`}>
                {step.label}
              </span>
              {step.detail && (
                <span className="font-sans text-xs text-creamdim mt-0.5">
                  {step.detail}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
