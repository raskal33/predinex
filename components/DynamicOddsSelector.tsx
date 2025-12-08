'use client';

import { ArrowTrendingUpIcon, LockClosedIcon } from '@heroicons/react/24/outline';

interface DynamicOddsSelectorProps {
  value: boolean;
  onChange: (isDynamic: boolean) => void;
  disabled?: boolean;
  initialOdds?: number;
}

export function DynamicOddsSelector({ 
  value, 
  onChange, 
  disabled = false,
  initialOdds = 2.0 
}: DynamicOddsSelectorProps) {

  const minOdds = (initialOdds * 0.9).toFixed(2);
  const maxOdds = (initialOdds * 1.2).toFixed(2);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 sm:gap-3 flex-wrap">
        {/* Fixed Odds Option */}
        <button
          type="button"
          onClick={() => !disabled && onChange(false)}
          disabled={disabled}
          className={`
            flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 sm:px-5 sm:py-3.5 
            rounded-lg font-medium transition-all duration-200 text-sm sm:text-base
            ${!value
              ? 'bg-[var(--bsc-yellow)] text-[var(--bsc-dark)] shadow-lg shadow-[var(--bsc-yellow)]/30 border-2 border-[var(--bsc-yellow)]'
              : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-card)] hover:border-[var(--bsc-yellow)]/50 hover:bg-[var(--bg-card)]/80'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
          `}
        >
          <LockClosedIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="font-semibold">Fixed Odds</span>
        </button>

        {/* Dynamic Odds Option */}
        <button
          type="button"
          onClick={() => !disabled && onChange(true)}
          disabled={disabled}
          className={`
            flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 sm:px-5 sm:py-3.5 
            rounded-lg font-medium transition-all duration-200 text-sm sm:text-base
            ${value
              ? 'bg-gradient-to-r from-[var(--market-rise)] to-[var(--market-neutral)] text-white shadow-lg shadow-[var(--market-rise)]/30 border-2 border-[var(--market-rise)]'
              : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-card)] hover:border-[var(--market-rise)]/50 hover:bg-[var(--bg-card)]/80'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
          `}
        >
          <ArrowTrendingUpIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="font-semibold">Dynamic Odds</span>
        </button>
      </div>

      {/* Info Box for Dynamic Odds */}
      {value && (
        <div className="p-3 sm:p-4 bg-gradient-to-r from-[var(--market-rise)]/10 to-[var(--market-neutral)]/10 border border-[var(--market-rise)]/30 rounded-lg animate-slide-up-fade">
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex items-start gap-2">
              <ArrowTrendingUpIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--market-rise)] flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <p className="text-[var(--text-primary)] font-medium">
                  Dynamic odds adjust based on time and bet volume
                </p>
                <ul className="space-y-1 text-[var(--text-muted)] list-disc list-inside">
                  <li>Increases up to <span className="text-[var(--market-rise)] font-semibold">20%</span> if no bets (to attract bettors)</li>
                  <li>Decreases up to <span className="text-[var(--market-fall)] font-semibold">10%</span> as bets come in</li>
                  <li>All participants receive payouts at <span className="text-[var(--bsc-yellow)] font-semibold">final odds</span></li>
                </ul>
                <div className="mt-2 pt-2 border-t border-[var(--border-card)]">
                  <p className="text-[var(--text-muted)]">
                    <span className="font-semibold text-[var(--text-secondary)]">Odds Range:</span>{' '}
                    <span className="text-[var(--market-fall)]">{minOdds}x</span> - <span className="text-[var(--market-rise)]">{maxOdds}x</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Box for Fixed Odds */}
      {!value && (
        <div className="p-3 sm:p-4 bg-[var(--bg-card)]/50 border border-[var(--border-card)] rounded-lg">
          <p className="text-xs sm:text-sm text-[var(--text-muted)] flex items-center gap-2">
            <LockClosedIcon className="w-4 h-4 flex-shrink-0" />
            <span>Odds remain constant throughout the betting period</span>
          </p>
        </div>
      )}
    </div>
  );
}

