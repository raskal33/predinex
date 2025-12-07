'use client';

import { useTokenDiscounts } from '@/hooks/useTokenDiscounts';
import { formatEther } from 'viem';
import { useMemo } from 'react';

interface FeeDisplayProps {
  baseFee: bigint;
  showDiscount?: boolean;
}

export function FeeDisplay({ baseFee, showDiscount = true }: FeeDisplayProps) {
  const { feeCalculation, discountTier, discountPercent } = useTokenDiscounts();

  const adjustedFee = useMemo(() => {
    if (!feeCalculation) return baseFee;
    return feeCalculation.adjustedFee;
  }, [feeCalculation, baseFee]);

  const savings = useMemo(() => {
    if (!feeCalculation) return 0n;
    return feeCalculation.savings;
  }, [feeCalculation]);

  const hasDiscount = discountPercent > 0;

  return (
    <div className="space-y-2 p-3 sm:p-4 bg-[var(--bg-card)] rounded-lg border border-[var(--border-card)]">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs sm:text-sm text-[var(--text-muted)] font-medium">Creation Fee:</span>
        <div className="flex items-center gap-2 flex-wrap">
          {hasDiscount && showDiscount ? (
            <>
              <span className="text-xs sm:text-sm line-through text-[var(--text-muted)] opacity-60">
                {formatEther(baseFee)} BNB
              </span>
              <span className="text-sm sm:text-base font-bold text-[var(--market-rise)]">
                {formatEther(adjustedFee)} BNB
              </span>
            </>
          ) : (
            <span className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
              {formatEther(baseFee)} BNB
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
            -{discountPercent}% (Save {formatEther(savings)} BNB)
          </span>
        </div>
      )}
    </div>
  );
}

