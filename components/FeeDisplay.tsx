'use client';

import { useTokenDiscounts } from '@/hooks/useTokenDiscounts';
import { formatEther } from 'viem';
import { useMemo } from 'react';
import type { CurrencyType } from '@/utils/feeCalculator';

interface FeeDisplayProps {
  baseFee: bigint;
  showDiscount?: boolean;
  currency?: CurrencyType; // ✅ NEW: Support all currencies
  isComboPool?: boolean; // ✅ NEW: Different fees for combo pools
}

export function FeeDisplay({ 
  baseFee, 
  showDiscount = true, 
  currency = 'BNB',
  isComboPool = false 
}: FeeDisplayProps) {
  const { feeCalculation, discountTier, discountPercent } = useTokenDiscounts();

  // ✅ FIX: Creation fee is ALWAYS in BNB (with discounts), regardless of pool currency
  // Discounts are based on PRIX balance, NOT pool currency
  // So we show discount for ALL currencies (BNB, PRIX, USDT)
  const adjustedFee = useMemo(() => {
    if (!feeCalculation) return baseFee;
    return feeCalculation.adjustedFee;
  }, [feeCalculation, baseFee]);

  const savings = useMemo(() => {
    if (!feeCalculation) return 0n;
    return feeCalculation.savings;
  }, [feeCalculation]);

  // ✅ FIX: Discount applies to creation fee (always BNB), regardless of pool currency
  const hasDiscount = discountPercent > 0;

  // ✅ NEW: Show currency-specific fee information
  const feeCurrency = 'BNB'; // Creation fee is always in BNB
  const poolCurrency = currency; // Pool stake currency

  return (
    <div className="space-y-2 p-3 sm:p-4 bg-[var(--bg-card)] rounded-lg border border-[var(--border-card)]">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs sm:text-sm text-[var(--text-muted)] font-medium">
          Creation Fee {isComboPool ? '(Combo Pool)' : ''}:
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {hasDiscount && showDiscount ? (
            <>
              <span className="text-xs sm:text-sm line-through text-[var(--text-muted)] opacity-60">
                {formatEther(baseFee)} {feeCurrency}
              </span>
              <span className="text-sm sm:text-base font-bold text-[var(--market-rise)]">
                {formatEther(adjustedFee)} {feeCurrency}
              </span>
            </>
          ) : (
            <span className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
              {formatEther(baseFee)} {feeCurrency}
            </span>
          )}
        </div>
      </div>
      {hasDiscount && showDiscount && (
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs sm:text-sm pt-2 border-t border-[var(--border-card)]">
          <span className="text-[var(--text-muted)]">
            Discount <span className="font-semibold text-[var(--bsc-yellow)]">{discountTier}</span>:
          </span>
          <span className="text-[var(--market-rise)] font-semibold">
            -{discountPercent}% (Save {formatEther(savings)} {feeCurrency})
          </span>
        </div>
      )}
      {poolCurrency !== 'BNB' && (
        <div className="text-xs sm:text-sm text-[var(--text-muted)] pt-2 border-t border-[var(--border-card)]">
          <p className="text-[var(--text-secondary)]">
            💡 Creation fee is always paid in <span className="font-semibold text-[var(--bsc-yellow)]">BNB</span>.
            {poolCurrency === 'PRIX' && ' Pool stake is paid in PRIX tokens.'}
            {poolCurrency === 'USDT' && ' Pool stake is paid in USDT tokens.'}
          </p>
        </div>
      )}
    </div>
  );
}

