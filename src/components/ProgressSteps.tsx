"use client";
import React from 'react';

interface ProgressStepsProps {
  current: number; // 1-based index
  steps: { title: string; description?: string }[];
}

export function ProgressSteps({ current, steps }: ProgressStepsProps) {
  return (
    <ol className="flex items-center w-full mb-8" aria-label="Progress">
      {steps.map((step, idx) => {
        const stepNumber = idx + 1;
        const isComplete = stepNumber < current;
        const isActive = stepNumber === current;
        return (
          <li key={step.title} className="flex-1 flex items-center">
            <div className="flex items-center w-full">
              <div className={`relative flex items-center justify-center h-10 w-10 rounded-full text-sm font-bold transition-colors duration-200 ring-4 ring-surface-container-lowest
                ${isComplete ? 'bg-tertiary-fixed text-on-tertiary-fixed' : isActive ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-outline'}`}
                aria-current={isActive ? 'step' : undefined}
              >
                {isComplete ? (
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                ) : (
                  <span className="font-headline">{stepNumber}</span>
                )}
              </div>
              <div className="ml-4">
                <p className={`text-sm font-headline font-bold ${isActive ? 'text-primary' : isComplete ? 'text-on-tertiary-fixed-variant' : 'text-outline'}`}>{step.title}</p>
                {step.description && (
                  <p className="text-xs text-on-secondary-container mt-0.5 hidden sm:block">{step.description}</p>
                )}
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div className="flex-1 h-[2px] mx-4 relative">
                <div className={`absolute inset-y-0 left-0 h-[2px] w-full transition-colors duration-200 ${isComplete ? 'bg-tertiary-fixed' : 'bg-outline-variant/20'}`} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
