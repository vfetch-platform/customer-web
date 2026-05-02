"use client";

interface ProgressStepsProps {
  current: number; // 1-based index
  steps: { title: string; description?: string }[];
}

export function ProgressSteps({ current, steps }: ProgressStepsProps) {
  return (
    <ol className="flex items-start justify-center w-full mb-10" aria-label="Progress">
      {steps.map((step, idx) => {
        const stepNumber = idx + 1;
        const isComplete = stepNumber < current;
        const isActive = stepNumber === current;
        return (
          <li key={step.title} className="flex items-start flex-1">
            <div className="flex flex-col items-center w-full">
              <div className="flex items-center w-full">
                {/* Left connector line */}
                {idx > 0 && (
                  <div className={`flex-1 h-[2px] ${isComplete || isActive ? 'bg-primary' : 'bg-outline-variant/20'}`} />
                )}
                {idx === 0 && <div className="flex-1" />}

                {/* Circle */}
                <div
                  className={`relative flex items-center justify-center h-10 w-10 rounded-full text-sm font-bold shrink-0 transition-colors duration-200
                    ${isComplete ? 'bg-primary text-white' : isActive ? 'bg-primary text-white' : 'bg-surface-container-highest text-outline'}`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isComplete ? (
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  ) : (
                    <span className="font-headline">{stepNumber}</span>
                  )}
                </div>

                {/* Right connector line */}
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-[2px] ${isComplete ? 'bg-primary' : 'bg-outline-variant/20'}`} />
                )}
                {idx === steps.length - 1 && <div className="flex-1" />}
              </div>

              {/* Label below circle */}
              <p className={`mt-2 text-xs font-medium text-center ${
                isActive ? 'text-primary font-semibold' : isComplete ? 'text-primary' : 'text-outline'
              }`}>
                {step.title}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
