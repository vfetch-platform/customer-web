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
              <div className={`relative flex items-center justify-center h-10 w-10 rounded-full text-sm font-semibold border transition-colors duration-200
                ${isComplete ? 'bg-green-600 border-green-600 text-white' : isActive ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-500'}`}
                aria-current={isActive ? 'step' : undefined}
              >
                {isComplete ? '✓' : stepNumber}
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${isActive ? 'text-blue-700' : isComplete ? 'text-green-700' : 'text-gray-500'}`}>{step.title}</p>
                {step.description && (
                  <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">{step.description}</p>
                )}
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div className="flex-1 h-px mx-4 bg-gray-300 relative">
                <div className={`absolute inset-y-0 left-0 ${isComplete ? 'bg-green-600' : isActive ? 'bg-blue-600' : 'bg-gray-300'} h-px w-full transition-colors duration-200`} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
