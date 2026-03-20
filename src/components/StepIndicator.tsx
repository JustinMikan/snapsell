'use client';

const STEPS = ['上傳照片', '確認商品', '發布'];

interface StepIndicatorProps {
  currentStep: number;
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center py-4 px-6">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E] text-white ring-4 ring-[#FF6B35]/20 card-shadow'
                    : isCompleted
                    ? 'bg-[#FF6B35] text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {isCompleted ? '✓' : step}
              </div>
              <span
                className={`text-xs mt-1.5 transition-colors duration-300 ${
                  isActive
                    ? 'text-[#FF6B35] font-bold'
                    : isCompleted
                    ? 'text-[#FF6B35]/70 font-medium'
                    : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 mx-1 mb-5">
                <div className="h-0.5 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#FF6B35] transition-all duration-500 ease-out"
                    style={{ width: step < currentStep ? '100%' : '0%' }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
