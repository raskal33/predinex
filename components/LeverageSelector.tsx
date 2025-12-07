'use client';

import { type LeverageMultiplier, getLeverageRiskLevel } from '@/hooks/useLeverage';
import { useMemo } from 'react';

interface LeverageSelectorProps {
  value: LeverageMultiplier;
  onChange: (leverage: LeverageMultiplier) => void;
  disabled?: boolean;
  showRiskLevel?: boolean;
}

export function LeverageSelector({ value, onChange, disabled = false, showRiskLevel = true }: LeverageSelectorProps) {
  const leverages: LeverageMultiplier[] = [1, 2, 3, 4, 5];

  const riskLevel = useMemo(() => getLeverageRiskLevel(value), [value]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW':
        return 'text-green-400';
      case 'MEDIUM':
        return 'text-yellow-400';
      case 'HIGH':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 sm:gap-3 flex-wrap">
        {leverages.map((leverage) => (
          <button
            key={leverage}
            type="button"
            onClick={() => !disabled && onChange(leverage)}
            disabled={disabled}
            className={`
              px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg font-semibold transition-all duration-200
              text-sm sm:text-base min-w-[3rem] sm:min-w-[3.5rem]
              ${value === leverage
                ? 'bg-[var(--bsc-yellow)] text-[var(--bsc-dark)] shadow-lg shadow-[var(--bsc-yellow)]/30 border-2 border-[var(--bsc-yellow)]'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-card)] hover:border-[var(--bsc-yellow)]/50 hover:bg-[var(--bg-card)]/80'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
            `}
          >
            {leverage}x
          </button>
        ))}
      </div>
      {showRiskLevel && (
        <div className="text-xs sm:text-sm text-[var(--text-muted)] flex items-center gap-2">
          <span>Risk Level:</span>
          <span className={`font-semibold ${getRiskColor(riskLevel)}`}>{riskLevel}</span>
          <span className="text-[var(--text-muted)]">({value}x leverage)</span>
        </div>
      )}
    </div>
  );
}

