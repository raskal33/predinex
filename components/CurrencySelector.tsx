'use client';

import { type CurrencyType } from '@/utils/feeCalculator';

interface CurrencySelectorProps {
  value: CurrencyType;
  onChange: (currency: CurrencyType) => void;
  disabled?: boolean;
  showBalances?: boolean;
}

export function CurrencySelector({ value, onChange, disabled = false }: CurrencySelectorProps) {
  const currencies: { value: CurrencyType; label: string; icon: string }[] = [
    { value: 'BNB', label: 'BNB', icon: '💎' },
    { value: 'PRIX', label: 'PRIX', icon: '🪙' },
    { value: 'USDT', label: 'USDT', icon: '💵' },
  ];

  return (
    <div className="flex flex-wrap gap-2 sm:gap-3">
      {currencies.map((currency) => (
        <button
          key={currency.value}
          type="button"
          onClick={() => !disabled && onChange(currency.value)}
          disabled={disabled}
          className={`
            flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg font-medium 
            transition-all duration-200 text-sm sm:text-base
            ${value === currency.value
              ? 'bg-[var(--bsc-yellow)] text-[var(--bsc-dark)] shadow-lg shadow-[var(--bsc-yellow)]/30 border-2 border-[var(--bsc-yellow)]'
              : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-card)] hover:border-[var(--bsc-yellow)]/50 hover:bg-[var(--bg-card)]/80'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
          `}
        >
          <span className="text-base sm:text-lg">{currency.icon}</span>
          <span className="font-semibold">{currency.label}</span>
        </button>
      ))}
    </div>
  );
}

